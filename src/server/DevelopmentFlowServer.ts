import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import {
  DevelopmentPhase,
  ProjectState,
  DevelopmentFlowInput,
  DevelopmentFlowResult,
  DevelopmentFlowError,
  DevelopmentFlowConfig
} from '../types/index.js';
import {
  generateProjectId,
  formatTimestamp,
  validateProjectState,
  logger,
  InputValidator,
  ConfigValidator,
  ErrorFormatter
} from '../utils/index.js';
import { DocumentGenerator } from './DocumentGenerator.js';
import { StateManager } from './StateManager.js';
import path from 'path';

/**
 * Main MCP server class for managing development flow operations
 * 
 * This server provides a comprehensive development workflow management system
 * that guides users through structured phases from project initialization to
 * completion. It integrates with the Model Context Protocol (MCP) to provide
 * tool-based interactions for development project management.
 * 
 * The server manages the complete development lifecycle including:
 * - Project initialization and setup
 * - Requirements gathering and analysis
 * - Design and architecture planning
 * - Task breakdown and management
 * - Progress tracking and status reporting
 * - Project completion and documentation
 * 
 * @example
 * ```typescript
 * const server = new DevelopmentFlowServer({
 *   baseDir: './projects',
 *   enableLogging: true,
 *   logLevel: 'info'
 * });
 * 
 * await server.start();
 * ```
 */
export class DevelopmentFlowServer {
  /** MCP server instance for handling protocol communications */
  private server: Server;
  /** Configuration settings for the development flow server */
  private config: DevelopmentFlowConfig;
  /** Document generator for creating project documentation */
  private documentGenerator: DocumentGenerator;
  /** State manager for persisting project data */
  private stateManager: StateManager;
  /** Currently active project state */
  private currentProject: ProjectState | null = null;

  /**
   * Creates a new DevelopmentFlowServer instance
   * 
   * Initializes the server with the provided configuration, sets up default
   * values for missing configuration options, and creates necessary service
   * instances for document generation and state management.
   * 
   * @param config - Partial configuration object with custom settings
   * 
   * @example
   * ```typescript
   * const server = new DevelopmentFlowServer({
   *   baseDir: './my-projects',
   *   projectsDir: './output',
   *   enableLogging: true,
   *   logLevel: 'debug',
   *   maxProjects: 50
   * });
   * ```
   */
  constructor(config: Partial<DevelopmentFlowConfig> = {}) {
    // Validate configuration
    const configErrors = ConfigValidator.validateConfig(config);
    if (configErrors.length > 0) {
      throw new DevelopmentFlowError(
        `Configuration validation failed: ${configErrors.join(', ')}`,
        'INVALID_CONFIG'
      );
    }

    this.config = {
      baseDir: process.cwd(),
      templatesDir: path.join(process.cwd(), 'templates'),
      projectsDir: path.join('/tmp', '.dev'),
      enableLogging: true,
      logLevel: 'info',
      maxProjects: 100,
      autoBackup: true,
      ...config
    };

    this.server = new Server(
      {
        name: 'development-flow-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.documentGenerator = new DocumentGenerator(this.config);
    this.stateManager = new StateManager(this.config);
    this.setupHandlers();
  }

  /**
   * Sets up MCP request handlers for tool listing and execution
   * 
   * Configures the server to handle two main types of requests:
   * 1. ListTools - Returns available development flow tools and their schemas
   * 2. CallTool - Executes development flow actions based on user input
   * 
   * The tool schema defines all supported development phases and their
   * required/optional parameters for comprehensive workflow management.
   */
  private setupHandlers(): void {
    // Tool list handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'development_flow',
            description: 'Unified development flow management tool that supports complete development workflow including project initialization, requirement analysis, design, task management, and completion reporting.',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: Object.values(DevelopmentPhase),
                  description: 'Action type to execute'
                },
                projectName: {
                  type: 'string',
                  description: 'Project name (action: init)'
                },
                description: {
                  type: 'string',
                  description: 'Project description (action: requirement)'
                },
                requirements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Requirements list (action: requirement)'
                },
                functionalRequirements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Functional requirements (action: requirement)'
                },
                technicalRequirements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Technical requirements (action: requirement)'
                },
                acceptanceCriteria: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Acceptance criteria (action: requirement)'
                },
                phase: {
                  type: 'string',
                  description: 'Confirmation phase (action: confirmation)'
                },
                confirmed: {
                  type: 'boolean',
                  description: 'Whether to confirm (action: confirmation)'
                },
                architecture: {
                  type: 'string',
                  description: 'Technical architecture (action: design)'
                },
                implementation: {
                  type: 'string',
                  description: 'Implementation plan (action: design)'
                },
                systemDesign: {
                  type: 'string',
                  description: 'System design (action: design)'
                },
                dataStructures: {
                  type: 'string',
                  description: 'Data structures (action: design)'
                },
                interfaces: {
                  type: 'string',
                  description: 'Interface design (action: design)'
                },
                deployment: {
                  type: 'string',
                  description: 'Deployment plan (action: design)'
                },
                tasks: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Task list (action: todo)'
                },
                taskId: {
                  type: 'string',
                  description: 'Task ID (action: task_complete)'
                },
                force: {
                  type: 'boolean',
                  description: 'Force complete project, skip task validation (action: finish)'
                }
              },
              required: ['action']
            }
          }
        ]
      };
    });

    // Tool call handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;
      
      if (name !== 'development_flow') {
        const error = new DevelopmentFlowError(`Unknown tool: ${name}`, 'UNKNOWN_TOOL');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(ErrorFormatter.formatMCPError(error), null, 2)
          }]
        };
      }

      try {
        const input = args as unknown as DevelopmentFlowInput;
        const result = await this.handleDevelopmentFlow(input);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        logger.error(`Tool call failed: ${error instanceof Error ? error.message : String(error)}`);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(ErrorFormatter.formatMCPError(
              error instanceof Error ? error : new Error(String(error))
            ), null, 2)
          }]
        };
      }
    });
  }

  /**
   * Main handler for development flow tool calls
   * 
   * Routes incoming development flow requests to the appropriate phase handler
   * based on the action type. Provides centralized error handling and logging
   * for all development flow operations.
   * 
   * @param input - Development flow input containing action type and parameters
   * @returns Promise resolving to the operation result
   * @throws {DevelopmentFlowError} When action is unsupported or execution fails
   * 
   * @example
   * ```typescript
   * const result = await server.handleDevelopmentFlow({
   *   action: DevelopmentPhase.INIT,
   *   projectName: 'My New Project'
   * });
   * ```
   */
  private async handleDevelopmentFlow(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    logger.info(`Executing development flow action: ${input.action}`);

    try {
      switch (input.action) {
        case DevelopmentPhase.INIT:
          return await this.handleInit(input);
        case DevelopmentPhase.REQUIREMENT:
          return await this.handleRequirement(input);
        case DevelopmentPhase.CONFIRMATION:
          return await this.handleConfirmation(input);
        case DevelopmentPhase.DESIGN:
          return await this.handleDesign(input);
        case DevelopmentPhase.TODO:
          return await this.handleTodo(input);
        case DevelopmentPhase.TASK_COMPLETE:
          return await this.handleTaskComplete(input);
        case DevelopmentPhase.STATUS:
          return await this.handleStatus(input);
        case DevelopmentPhase.FINISH:
          return await this.handleFinish(input);
        default:
          throw new DevelopmentFlowError(
            `Unsupported action type: ${input.action}`,
            'INVALID_ACTION'
          );
      }
    } catch (error) {
      if (error instanceof DevelopmentFlowError) {
        throw error;
      }
      
      throw new DevelopmentFlowError(
        `Failed to execute action: ${error instanceof Error ? error.message : String(error)}`,
        'EXECUTION_ERROR',
        input.action as DevelopmentPhase
      );
    }
  }

  /**
   * Handles project initialization phase
   * 
   * Creates a new project with the provided name, generates a unique project ID,
   * validates the initial project state, and saves it to persistent storage.
   * This is the entry point for all development flow operations.
   * 
   * @param input - Input containing the project name
   * @returns Promise resolving to initialization result with project ID
   * @throws {DevelopmentFlowError} When project name is missing or validation fails
   * 
   * @example
   * ```typescript
   * const result = await handleInit({
   *   action: DevelopmentPhase.INIT,
   *   projectName: 'E-commerce Platform'
   * });
   * console.log(result.projectId); // 'proj_1703462400000_a1b2c3'
   * ```
   */
  private async handleInit(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    // Validate project name
    const nameErrors = InputValidator.validateProjectName(input.projectName || '');
    if (nameErrors.length > 0) {
      throw ErrorFormatter.validationError(nameErrors, DevelopmentPhase.INIT);
    }

    const sanitizedName = InputValidator.sanitizeText(input.projectName!, 100);
    const projectId = generateProjectId();
    const timestamp = formatTimestamp();
    
    const projectState: ProjectState = {
      id: projectId,
      name: sanitizedName,
      phase: DevelopmentPhase.INIT,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Validate project state
    const stateErrors = validateProjectState(projectState);
    if (stateErrors.length > 0) {
      throw ErrorFormatter.validationError(stateErrors, DevelopmentPhase.INIT);
    }

    // Ensure state manager is initialized
    await this.stateManager.ensureInitialized();
    
    // Save project state
    await this.stateManager.saveProjectState(projectState);
    this.currentProject = projectState;

    logger.info(`Project initialized successfully: ${sanitizedName} (${projectId})`);

    return {
      success: true,
      message: `Project "${sanitizedName}" initialized successfully`,
      projectId,
      phase: DevelopmentPhase.INIT,
      nextSteps: ['Proceed with requirement analysis (action: requirement)']
    };
  }

  /**
   * Handles requirements gathering and analysis phase
   * 
   * Updates the current project with requirement information including
   * description, functional requirements, technical requirements, and
   * acceptance criteria. Generates a requirements document for review.
   * 
   * @param input - Input containing requirement details
   * @returns Promise resolving to requirement analysis result
   * @throws {DevelopmentFlowError} When no current project exists
   * 
   * @example
   * ```typescript
   * const result = await handleRequirement({
   *   action: DevelopmentPhase.REQUIREMENT,
   *   description: 'Build a modern e-commerce platform',
   *   requirements: ['User authentication', 'Product catalog', 'Shopping cart'],
   *   functionalRequirements: ['User registration', 'Product search'],
   *   technicalRequirements: ['React frontend', 'Node.js backend'],
   *   acceptanceCriteria: ['All tests pass', 'Performance benchmarks met']
   * });
   * ```
   */
  private async handleRequirement(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('Please initialize project first', 'NO_CURRENT_PROJECT');
    }

    const errors: string[] = [];

    // Validate and sanitize description
    if (input.description) {
      this.currentProject.description = InputValidator.sanitizeText(input.description, 2000);
    }

    // Validate requirements array
    if (input.requirements) {
      const reqErrors = InputValidator.validateStringArray(input.requirements, 'requirements');
      if (reqErrors.length > 0) {
        errors.push(...reqErrors);
      } else {
        this.currentProject.requirements = input.requirements.map(req => 
          InputValidator.sanitizeText(req, 500)
        );
      }
    }

    // Validate functional requirements
    if (input.functionalRequirements) {
      const funcErrors = InputValidator.validateStringArray(input.functionalRequirements, 'functionalRequirements');
      if (funcErrors.length > 0) {
        errors.push(...funcErrors);
      } else {
        this.currentProject.functionalRequirements = input.functionalRequirements.map(req =>
          InputValidator.sanitizeText(req, 500)
        );
      }
    }

    // Validate technical requirements
    if (input.technicalRequirements) {
      const techErrors = InputValidator.validateStringArray(input.technicalRequirements, 'technicalRequirements');
      if (techErrors.length > 0) {
        errors.push(...techErrors);
      } else {
        this.currentProject.technicalRequirements = input.technicalRequirements.map(req =>
          InputValidator.sanitizeText(req, 500)
        );
      }
    }

    // Validate acceptance criteria
    if (input.acceptanceCriteria) {
      const acErrors = InputValidator.validateStringArray(input.acceptanceCriteria, 'acceptanceCriteria');
      if (acErrors.length > 0) {
        errors.push(...acErrors);
      } else {
        this.currentProject.acceptanceCriteria = input.acceptanceCriteria.map(criteria =>
          InputValidator.sanitizeText(criteria, 500)
        );
      }
    }

    if (errors.length > 0) {
      throw ErrorFormatter.validationError(errors, DevelopmentPhase.REQUIREMENT);
    }

    // Update project state
    this.currentProject.phase = DevelopmentPhase.REQUIREMENT;
    this.currentProject.updatedAt = formatTimestamp();

    // Save state
    await this.stateManager.saveProjectState(this.currentProject);

    // Generate requirement document
    const requirementDoc = await this.documentGenerator.generateRequirementDocument(this.currentProject);
    
    logger.info(`Requirement analysis completed: ${this.currentProject.name}`);

    return {
      success: true,
      message: 'Requirement analysis completed',
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.REQUIREMENT,
      nextSteps: ['Wait for user to confirm requirements (action: confirmation)'],
      generatedFiles: [requirementDoc]
    };
  }

  /**
   * Handles user confirmation for proceeding to the next phase
   * 
   * Processes user confirmation to either proceed with the current phase
   * content or request modifications. This ensures user approval before
   * moving forward in the development workflow.
   * 
   * @param input - Input containing confirmation status
   * @returns Promise resolving to confirmation result
   * @throws {DevelopmentFlowError} When no current project exists or confirmation status is missing
   * 
   * @example
   * ```typescript
   * // Confirm and proceed
   * const result = await handleConfirmation({
   *   action: DevelopmentPhase.CONFIRMATION,
   *   confirmed: true
   * });
   * 
   * // Request modifications
   * const result = await handleConfirmation({
   *   action: DevelopmentPhase.CONFIRMATION,
   *   confirmed: false
   * });
   * ```
   */
  private async handleConfirmation(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('Please initialize project first', 'NO_CURRENT_PROJECT');
    }

    if (input.confirmed === undefined) {
      throw new DevelopmentFlowError('Please provide confirmation status', 'MISSING_CONFIRMATION');
    }

    if (!input.confirmed) {
      return {
        success: true,
        message: 'User not confirmed, please modify and resubmit',
        projectId: this.currentProject.id,
        phase: this.currentProject.phase,
        nextSteps: ['Modify current phase content and resubmit']
      };
    }

    // Update confirmation status
    this.currentProject.phase = DevelopmentPhase.CONFIRMATION;
    this.currentProject.updatedAt = formatTimestamp();
    await this.stateManager.saveProjectState(this.currentProject);

    logger.info(`User confirmation completed: ${this.currentProject.name}`);

    return {
      success: true,
      message: 'User confirmation completed, can proceed to next phase',
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.CONFIRMATION,
      nextSteps: ['Proceed with design phase (action: design)']
    };
  }

  /**
   * Handles design and architecture planning phase
   * 
   * Creates detailed design documentation including system architecture,
   * component design, data structures, and implementation strategies.
   * Generates design documents for technical review and implementation guidance.
   * 
   * @param input - Input containing design specifications
   * @returns Promise resolving to design phase result
   * @throws {DevelopmentFlowError} When no current project exists
   * 
   * @example
   * ```typescript
   * const result = await handleDesign({
   *   action: DevelopmentPhase.DESIGN,
   *   architecture: 'Microservices with React frontend',
   *   components: ['UserService', 'ProductService', 'OrderService'],
   *   technologies: ['React', 'Node.js', 'PostgreSQL', 'Redis']
   * });
   * ```
   */
  private async handleDesign(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('Please initialize project first', 'NO_CURRENT_PROJECT');
    }

    // Update project state
    this.currentProject.phase = DevelopmentPhase.DESIGN;
    this.currentProject.updatedAt = formatTimestamp();
    
    if (input.architecture) {
      this.currentProject.architecture = input.architecture;
    }
    if (input.implementation) {
      this.currentProject.implementation = input.implementation;
    }
    if (input.systemDesign) {
      this.currentProject.systemDesign = input.systemDesign;
    }
    if (input.dataStructures) {
      this.currentProject.dataStructures = input.dataStructures;
    }
    if (input.interfaces) {
      this.currentProject.interfaces = input.interfaces;
    }
    if (input.deployment) {
      this.currentProject.deployment = input.deployment;
    }

    // Save state
    await this.stateManager.saveProjectState(this.currentProject);

    // Generate design document
    const designDoc = await this.documentGenerator.generateDesignDocument(this.currentProject);
    
    logger.info(`Design phase completed: ${this.currentProject.name}`);

    return {
      success: true,
      message: 'Design phase completed',
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.DESIGN,
      nextSteps: ['Wait for user to confirm design (action: confirmation)', 'Generate task list (action: todo)'],
      generatedFiles: [designDoc]
    };
  }

  /**
   * Handles task list generation and management
   * 
   * Creates a comprehensive todo list based on project requirements and design.
   * Breaks down the project into manageable tasks with priorities, estimates,
   * and dependencies for efficient project execution.
   * 
   * @param input - Input for todo generation
   * @returns Promise resolving to todo generation result
   * @throws {DevelopmentFlowError} When no current project exists
   * 
   * @example
   * ```typescript
   * const result = await handleTodo({
   *   action: DevelopmentPhase.TODO
   * });
   * console.log(result.tasks); // Array of generated tasks
   * ```
   */
  private async handleTodo(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('Please initialize project first', 'NO_CURRENT_PROJECT');
    }

    // Update project state
    this.currentProject.phase = DevelopmentPhase.TODO;
    this.currentProject.updatedAt = formatTimestamp();
    
    if (input.tasks) {
      this.currentProject.tasks = input.tasks;
    }

    // Save state
    await this.stateManager.saveProjectState(this.currentProject);

    // Generate task document
    const todoDoc = await this.documentGenerator.generateTodoDocument(this.currentProject);
    
    logger.info(`Task list generation completed: ${this.currentProject.name}`);

    return {
      success: true,
      message: 'Task list generation completed',
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.TODO,
      nextSteps: ['Wait for user to confirm task list (action: confirmation)', 'Start executing tasks (action: task_complete)'],
      generatedFiles: [todoDoc]
    };
  }

  /**
   * Handles project status queries
   * 
   * Retrieves current project information including phase, progress,
   * completed tasks, and overall project health. Provides comprehensive
   * status reporting for project monitoring and management.
   * 
   * @param input - Input for status query
   * @returns Promise resolving to current project status
   * @throws {DevelopmentFlowError} When no current project exists
   * 
   * @example
   * ```typescript
   * const result = await handleStatus({
   *   action: DevelopmentPhase.STATUS
   * });
   * console.log(result.currentPhase); // Current development phase
   * console.log(result.completedTasks); // Number of completed tasks
   * ```
   */
  private async handleStatus(_input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('Please initialize project first', 'NO_CURRENT_PROJECT');
    }

    const tasks = this.currentProject.tasks || [];
    const completedTaskIds = this.currentProject.completedTasks || [];
    const pendingTasks = tasks.filter(task => !completedTaskIds.includes(task.id));
    const completedTasks = tasks.filter(task => completedTaskIds.includes(task.id));

    const statusInfo = {
      projectId: this.currentProject.id,
      projectName: this.currentProject.name,
      currentPhase: this.currentProject.phase,
      totalTasks: tasks.length,
      completedTasksCount: completedTasks.length,
      pendingTasksCount: pendingTasks.length,
      completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
      pendingTasks: pendingTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority
      })),
      completedTasks: completedTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description
      }))
    };

    return {
      success: true,
      message: `Project "${this.currentProject.name}" status information`,
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.STATUS,
      data: statusInfo,
      nextSteps: pendingTasks.length > 0 
        ? ['Complete remaining tasks (action: task_complete)', 'View task details']
        : ['All tasks completed, can finish project (action: finish)']
    };
  }

  /**
   * Handles task completion marking
   * 
   * Marks a specific task as completed and updates project progress.
   * Validates task existence and updates the project state with
   * completion timestamp and any additional notes.
   * 
   * @param input - Input containing task ID and completion details
   * @returns Promise resolving to task completion result
   * @throws {DevelopmentFlowError} When no current project exists or task ID is invalid
   * 
   * @example
   * ```typescript
   * const result = await handleTaskComplete({
   *   action: DevelopmentPhase.TASK_COMPLETE,
   *   taskId: 'task_001',
   *   notes: 'Implemented user authentication with JWT'
   * });
   * ```
   */
  private async handleTaskComplete(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('Please initialize project first', 'NO_CURRENT_PROJECT');
    }

    // Validate task ID
    const taskIdErrors = InputValidator.validateTaskId(input.taskId || '');
    if (taskIdErrors.length > 0) {
      throw ErrorFormatter.validationError(taskIdErrors, DevelopmentPhase.TASK_COMPLETE);
    }

    const sanitizedTaskId = InputValidator.sanitizeText(input.taskId!, 50);

    // Verify task exists in project
    if (this.currentProject.tasks) {
      const taskExists = this.currentProject.tasks.some(task => task.id === sanitizedTaskId);
      if (!taskExists) {
        throw new DevelopmentFlowError(
          `Task ID '${sanitizedTaskId}' does not exist in project`,
          'TASK_NOT_FOUND',
          DevelopmentPhase.TASK_COMPLETE,
          this.currentProject.id
        );
      }
    }

    // Update task status
    if (!this.currentProject.completedTasks) {
      this.currentProject.completedTasks = [];
    }
    
    if (!this.currentProject.completedTasks.includes(sanitizedTaskId)) {
      this.currentProject.completedTasks.push(sanitizedTaskId);
    }

    this.currentProject.phase = DevelopmentPhase.TASK_COMPLETE;
    this.currentProject.updatedAt = formatTimestamp();

    // Save state
    await this.stateManager.saveProjectState(this.currentProject);
    
    logger.info(`Task completed: ${sanitizedTaskId}`);

    return {
      success: true,
      message: `Task ${sanitizedTaskId} completed`,
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.TASK_COMPLETE,
      nextSteps: ['Continue executing other tasks or complete project (action: finish)']
    };
  }

  /**
   * Handles project completion and finalization
   * 
   * Finalizes the current project by marking it as completed,
   * generating final reports, and cleaning up temporary resources.
   * This is the final phase of the development workflow.
   * 
   * @param input - Input for project finalization
   * @returns Promise resolving to project completion result
   * @throws {DevelopmentFlowError} When no current project exists
   * 
   * @example
   * ```typescript
   * const result = await handleFinish({
   *   action: DevelopmentPhase.FINISH,
   *   summary: 'Project completed successfully with all requirements met'
   * });
   * ```
   */
  private async handleFinish(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('Please initialize project first', 'NO_CURRENT_PROJECT');
    }

    // Check if all tasks are completed (unless using force parameter)
    if (!input.force && this.currentProject.tasks && this.currentProject.tasks.length > 0) {
      const completedTaskIds = this.currentProject.completedTasks || [];
      const allTaskIds = this.currentProject.tasks.map(task => task.id);
      const uncompletedTasks = allTaskIds.filter(taskId => !completedTaskIds.includes(taskId));
      
      if (uncompletedTasks.length > 0) {
        const pendingTaskDetails = this.currentProject.tasks
          .filter(task => uncompletedTasks.includes(task.id))
          .map(task => `- ${task.id}: ${task.title}`)
          .join('\n');
        
        throw new DevelopmentFlowError(
          `Please complete all tasks first. Remaining incomplete tasks:\n${pendingTaskDetails}\n\nSolutions:\n1. Use action: "task_complete" to complete tasks one by one\n2. Use action: "status" to view detailed status\n3. Use force: true to force complete project`,
          'INCOMPLETE_TASKS'
        );
      }
    }

    // Update project state
    this.currentProject.phase = DevelopmentPhase.FINISH;
    this.currentProject.updatedAt = formatTimestamp();

    // Save state
    await this.stateManager.saveProjectState(this.currentProject);

    // Generate completion report
    const doneDoc = await this.documentGenerator.generateDoneDocument(this.currentProject);
    
    logger.info(`Project completed: ${this.currentProject.name}`);

    const result = {
      success: true,
      message: `Project "${this.currentProject.name}" completed`,
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.FINISH,
      nextSteps: ['Project completed'],
      generatedFiles: [doneDoc]
    };

    // Clean up current project
    this.currentProject = null;

    return result;
  }

  /**
   * Starts the MCP development flow server
   * 
   * Initializes and starts the MCP server on the configured transport.
   * Sets up all request handlers and begins listening for client connections.
   * This method should be called once to activate the server.
   * 
   * @throws {Error} When server fails to start or transport is unavailable
   * 
   * @example
   * ```typescript
   * const server = new DevelopmentFlowServer();
   * await server.start();
   * console.log('Development flow server is running');
   * ```
   */
  public async start(): Promise<void> {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info('Development Flow MCP server started');
  }

  /**
   * Gets the underlying MCP server instance
   * 
   * Provides access to the raw MCP server for advanced operations
   * or integration with other MCP-based systems. Use with caution
   * as direct server manipulation may affect the development flow.
   * 
   * @returns The MCP server instance
   * 
   * @example
   * ```typescript
   * const server = developmentFlowServer.getServer();
   * // Access server capabilities or add custom handlers
   * ```
   */
  public getServer(): Server {
    return this.server;
  }

  /**
   * Gets the currently active project state
   * 
   * Returns the project state for the currently active development
   * project, or null if no project is currently loaded. This provides
   * access to all project data including phase, tasks, and metadata.
   * 
   * @returns Current project state or null if no active project
   * 
   * @example
   * ```typescript
   * const project = server.getCurrentProject();
   * if (project) {
   *   console.log(`Current project: ${project.name}`);
   *   console.log(`Phase: ${project.phase}`);
   * }
   * ```
   */
  public getCurrentProject(): ProjectState | null {
    return this.currentProject;
  }

  /**
   * Sets the current project by loading it from storage
   * 
   * Loads a project from persistent storage and sets it as the current
   * active project. This allows switching between different projects
   * or resuming work on a previously created project.
   * 
   * @param projectId - ID of the project to load and set as current
   * @throws {DevelopmentFlowError} When project doesn't exist
   * 
   * @example
   * ```typescript
   * await server.setCurrentProject('proj_1703462400000_a1b2c3');
   * console.log('Project loaded and set as current');
   * ```
   */
  public async setCurrentProject(projectId: string): Promise<void> {
    const project = await this.stateManager.loadProjectState(projectId);
    if (!project) {
      throw new DevelopmentFlowError(`Project does not exist: ${projectId}`, 'PROJECT_NOT_FOUND');
    }
    this.currentProject = project;
  }
}