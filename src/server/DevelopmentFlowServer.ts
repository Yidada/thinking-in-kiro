import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  DevelopmentPhase,
  ProjectState,
  DevelopmentFlowInput,
  DevelopmentFlowResult,
  DevelopmentFlowError,
  DevelopmentFlowConfig,
  Task
} from '../types/index.js';
import {
  generateProjectId,
  generateNumberedDir,
  ensureDir,
  readJsonFile,
  writeJsonFile,
  formatTimestamp,
  validateProjectState,
  sanitizeFileName,
  logger
} from '../utils/index.js';
import { DocumentGenerator } from './DocumentGenerator.js';
import { StateManager } from './StateManager.js';
import path from 'path';

/**
 * Development Flow MCP Server
 */
export class DevelopmentFlowServer {
  private server: Server;
  private config: DevelopmentFlowConfig;
  private documentGenerator: DocumentGenerator;
  private stateManager: StateManager;
  private currentProject: ProjectState | null = null;

  constructor(config: Partial<DevelopmentFlowConfig> = {}) {
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
   * Set up request handlers
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
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (name !== 'development_flow') {
        throw new Error(`Unknown tool: ${name}`);
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
        throw error;
      }
    });
  }

  /**
   * Handle development flow tool call
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
   * Handle project initialization
   */
  private async handleInit(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!input.projectName) {
      throw new DevelopmentFlowError('Project name cannot be empty', 'MISSING_PROJECT_NAME');
    }

    const projectId = generateProjectId();
    const timestamp = formatTimestamp();
    
    const projectState: ProjectState = {
      id: projectId,
      name: input.projectName,
      phase: DevelopmentPhase.INIT,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Validate project state
    const errors = validateProjectState(projectState);
    if (errors.length > 0) {
      throw new DevelopmentFlowError(
        `Project state validation failed: ${errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    // Save project state
    await this.stateManager.saveProjectState(projectState);
    this.currentProject = projectState;

    logger.info(`Project initialized successfully: ${input.projectName} (${projectId})`);

    return {
      success: true,
      message: `Project "${input.projectName}" initialized successfully`,
      projectId,
      phase: DevelopmentPhase.INIT,
      nextSteps: ['Proceed with requirement analysis (action: requirement)']
    };
  }

  /**
   * Handle requirement analysis
   */
  private async handleRequirement(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('Please initialize project first', 'NO_CURRENT_PROJECT');
    }

    // Update project state
    this.currentProject.phase = DevelopmentPhase.REQUIREMENT;
    this.currentProject.updatedAt = formatTimestamp();
    
    if (input.description) {
      this.currentProject.description = input.description;
    }
    if (input.requirements) {
      this.currentProject.requirements = input.requirements;
    }
    if (input.functionalRequirements) {
      this.currentProject.functionalRequirements = input.functionalRequirements;
    }
    if (input.technicalRequirements) {
      this.currentProject.technicalRequirements = input.technicalRequirements;
    }
    if (input.acceptanceCriteria) {
      this.currentProject.acceptanceCriteria = input.acceptanceCriteria;
    }

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
   * Handle confirmation phase
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
   * Handle design phase
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
   * Handle task list generation
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
   * Handle status query
   */
  private async handleStatus(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
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
   * Handle task completion
   */
  private async handleTaskComplete(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('Please initialize project first', 'NO_CURRENT_PROJECT');
    }

    if (!input.taskId) {
      throw new DevelopmentFlowError('Please provide task ID', 'MISSING_TASK_ID');
    }

    // Update task status
    if (!this.currentProject.completedTasks) {
      this.currentProject.completedTasks = [];
    }
    
    if (!this.currentProject.completedTasks.includes(input.taskId)) {
      this.currentProject.completedTasks.push(input.taskId);
    }

    this.currentProject.phase = DevelopmentPhase.TASK_COMPLETE;
    this.currentProject.updatedAt = formatTimestamp();

    // Save state
    await this.stateManager.saveProjectState(this.currentProject);
    
    logger.info(`Task completed: ${input.taskId}`);

    return {
      success: true,
      message: `Task ${input.taskId} completed`,
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.TASK_COMPLETE,
      nextSteps: ['Continue executing other tasks or complete project (action: finish)']
    };
  }

  /**
   * Handle project completion
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
   * Start server
   */
  public async start(): Promise<void> {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info('Development Flow MCP server started');
  }

  /**
   * Get server instance
   */
  public getServer(): Server {
    return this.server;
  }

  /**
   * Get current project state
   */
  public getCurrentProject(): ProjectState | null {
    return this.currentProject;
  }

  /**
   * Set current project
   */
  public async setCurrentProject(projectId: string): Promise<void> {
    const project = await this.stateManager.loadProjectState(projectId);
    if (!project) {
      throw new DevelopmentFlowError(`Project does not exist: ${projectId}`, 'PROJECT_NOT_FOUND');
    }
    this.currentProject = project;
  }
}