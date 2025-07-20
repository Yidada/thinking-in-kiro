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
 * 开发流程MCP服务器
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
      projectsDir: path.join(process.cwd(), '.dev'),
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
   * 设置请求处理器
   */
  private setupHandlers(): void {
    // 工具列表处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'development_flow',
            description: '统一的开发流程管理工具，支持项目初始化、需求分析、设计、任务管理和完成报告等完整开发流程。',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: Object.values(DevelopmentPhase),
                  description: '要执行的操作类型'
                },
                projectName: {
                  type: 'string',
                  description: '项目名称 (action: init)'
                },
                description: {
                  type: 'string',
                  description: '项目描述 (action: requirement)'
                },
                requirements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '需求列表 (action: requirement)'
                },
                functionalRequirements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '功能需求 (action: requirement)'
                },
                technicalRequirements: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '技术需求 (action: requirement)'
                },
                acceptanceCriteria: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '验收标准 (action: requirement)'
                },
                phase: {
                  type: 'string',
                  description: '确认阶段 (action: confirmation)'
                },
                confirmed: {
                  type: 'boolean',
                  description: '是否确认 (action: confirmation)'
                },
                architecture: {
                  type: 'string',
                  description: '技术架构 (action: design)'
                },
                implementation: {
                  type: 'string',
                  description: '实现方案 (action: design)'
                },
                systemDesign: {
                  type: 'string',
                  description: '系统设计 (action: design)'
                },
                dataStructures: {
                  type: 'string',
                  description: '数据结构 (action: design)'
                },
                interfaces: {
                  type: 'string',
                  description: '接口设计 (action: design)'
                },
                deployment: {
                  type: 'string',
                  description: '部署方案 (action: design)'
                },
                tasks: {
                  type: 'array',
                  items: { type: 'object' },
                  description: '任务列表 (action: todo)'
                },
                taskId: {
                  type: 'string',
                  description: '任务ID (action: task_complete)'
                },
                force: {
                  type: 'boolean',
                  description: '强制完成项目，跳过任务验证 (action: finish)'
                }
              },
              required: ['action']
            }
          }
        ]
      };
    });

    // 工具调用处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      if (name !== 'development_flow') {
        throw new Error(`未知工具: ${name}`);
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
        logger.error(`工具调用失败: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    });
  }

  /**
   * 处理开发流程工具调用
   */
  private async handleDevelopmentFlow(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    logger.info(`执行开发流程操作: ${input.action}`);

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
            `不支持的操作类型: ${input.action}`,
            'INVALID_ACTION'
          );
      }
    } catch (error) {
      if (error instanceof DevelopmentFlowError) {
        throw error;
      }
      
      throw new DevelopmentFlowError(
        `执行操作失败: ${error instanceof Error ? error.message : String(error)}`,
        'EXECUTION_ERROR',
        input.action as DevelopmentPhase
      );
    }
  }

  /**
   * 处理项目初始化
   */
  private async handleInit(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!input.projectName) {
      throw new DevelopmentFlowError('项目名称不能为空', 'MISSING_PROJECT_NAME');
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

    // 验证项目状态
    const errors = validateProjectState(projectState);
    if (errors.length > 0) {
      throw new DevelopmentFlowError(
        `项目状态验证失败: ${errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    // 保存项目状态
    await this.stateManager.saveProjectState(projectState);
    this.currentProject = projectState;

    logger.info(`项目初始化成功: ${input.projectName} (${projectId})`);

    return {
      success: true,
      message: `项目 "${input.projectName}" 初始化成功`,
      projectId,
      phase: DevelopmentPhase.INIT,
      nextSteps: ['进行需求分析 (action: requirement)']
    };
  }

  /**
   * 处理需求分析
   */
  private async handleRequirement(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('请先初始化项目', 'NO_CURRENT_PROJECT');
    }

    // 更新项目状态
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

    // 保存状态
    await this.stateManager.saveProjectState(this.currentProject);

    // 生成需求文档
    const requirementDoc = await this.documentGenerator.generateRequirementDocument(this.currentProject);
    
    logger.info(`需求分析完成: ${this.currentProject.name}`);

    return {
      success: true,
      message: '需求分析完成',
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.REQUIREMENT,
      nextSteps: ['等待用户确认需求 (action: confirmation)'],
      generatedFiles: [requirementDoc]
    };
  }

  /**
   * 处理确认阶段
   */
  private async handleConfirmation(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('请先初始化项目', 'NO_CURRENT_PROJECT');
    }

    if (input.confirmed === undefined) {
      throw new DevelopmentFlowError('请提供确认状态', 'MISSING_CONFIRMATION');
    }

    if (!input.confirmed) {
      return {
        success: true,
        message: '用户未确认，请修改后重新提交',
        projectId: this.currentProject.id,
        phase: this.currentProject.phase,
        nextSteps: ['修改当前阶段内容后重新提交']
      };
    }

    // 更新确认状态
    this.currentProject.phase = DevelopmentPhase.CONFIRMATION;
    this.currentProject.updatedAt = formatTimestamp();
    await this.stateManager.saveProjectState(this.currentProject);

    logger.info(`用户确认完成: ${this.currentProject.name}`);

    return {
      success: true,
      message: '用户确认完成，可以进入下一阶段',
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.CONFIRMATION,
      nextSteps: ['进行设计阶段 (action: design)']
    };
  }

  /**
   * 处理设计阶段
   */
  private async handleDesign(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('请先初始化项目', 'NO_CURRENT_PROJECT');
    }

    // 更新项目状态
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

    // 保存状态
    await this.stateManager.saveProjectState(this.currentProject);

    // 生成设计文档
    const designDoc = await this.documentGenerator.generateDesignDocument(this.currentProject);
    
    logger.info(`设计阶段完成: ${this.currentProject.name}`);

    return {
      success: true,
      message: '设计阶段完成',
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.DESIGN,
      nextSteps: ['等待用户确认设计 (action: confirmation)', '生成任务清单 (action: todo)'],
      generatedFiles: [designDoc]
    };
  }

  /**
   * 处理任务清单生成
   */
  private async handleTodo(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('请先初始化项目', 'NO_CURRENT_PROJECT');
    }

    // 更新项目状态
    this.currentProject.phase = DevelopmentPhase.TODO;
    this.currentProject.updatedAt = formatTimestamp();
    
    if (input.tasks) {
      this.currentProject.tasks = input.tasks;
    }

    // 保存状态
    await this.stateManager.saveProjectState(this.currentProject);

    // 生成任务文档
    const todoDoc = await this.documentGenerator.generateTodoDocument(this.currentProject);
    
    logger.info(`任务清单生成完成: ${this.currentProject.name}`);

    return {
      success: true,
      message: '任务清单生成完成',
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.TODO,
      nextSteps: ['等待用户确认任务清单 (action: confirmation)', '开始执行任务 (action: task_complete)'],
      generatedFiles: [todoDoc]
    };
  }

  /**
   * 处理状态查询
   */
  private async handleStatus(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('请先初始化项目', 'NO_CURRENT_PROJECT');
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
      message: `项目 "${this.currentProject.name}" 状态信息`,
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.STATUS,
      data: statusInfo,
      nextSteps: pendingTasks.length > 0 
        ? ['完成剩余任务 (action: task_complete)', '查看任务详情']
        : ['所有任务已完成，可以结束项目 (action: finish)']
    };
  }

  /**
   * 处理任务完成
   */
  private async handleTaskComplete(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('请先初始化项目', 'NO_CURRENT_PROJECT');
    }

    if (!input.taskId) {
      throw new DevelopmentFlowError('请提供任务ID', 'MISSING_TASK_ID');
    }

    // 更新任务状态
    if (!this.currentProject.completedTasks) {
      this.currentProject.completedTasks = [];
    }
    
    if (!this.currentProject.completedTasks.includes(input.taskId)) {
      this.currentProject.completedTasks.push(input.taskId);
    }

    this.currentProject.phase = DevelopmentPhase.TASK_COMPLETE;
    this.currentProject.updatedAt = formatTimestamp();

    // 保存状态
    await this.stateManager.saveProjectState(this.currentProject);
    
    logger.info(`任务完成: ${input.taskId}`);

    return {
      success: true,
      message: `任务 ${input.taskId} 已完成`,
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.TASK_COMPLETE,
      nextSteps: ['继续执行其他任务或完成项目 (action: finish)']
    };
  }

  /**
   * 处理项目完成
   */
  private async handleFinish(input: DevelopmentFlowInput): Promise<DevelopmentFlowResult> {
    if (!this.currentProject) {
      throw new DevelopmentFlowError('请先初始化项目', 'NO_CURRENT_PROJECT');
    }

    // 检查是否所有任务都已完成（除非使用force参数）
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
          `请先完成所有任务。剩余未完成任务:\n${pendingTaskDetails}\n\n解决方案:\n1. 使用 action: "task_complete" 逐个完成任务\n2. 使用 action: "status" 查看详细状态\n3. 使用 force: true 强制完成项目`,
          'INCOMPLETE_TASKS'
        );
      }
    }

    // 更新项目状态
    this.currentProject.phase = DevelopmentPhase.FINISH;
    this.currentProject.updatedAt = formatTimestamp();

    // 保存状态
    await this.stateManager.saveProjectState(this.currentProject);

    // 生成完成报告
    const doneDoc = await this.documentGenerator.generateDoneDocument(this.currentProject);
    
    logger.info(`项目完成: ${this.currentProject.name}`);

    const result = {
      success: true,
      message: `项目 "${this.currentProject.name}" 已完成`,
      projectId: this.currentProject.id,
      phase: DevelopmentPhase.FINISH,
      nextSteps: ['项目已完成'],
      generatedFiles: [doneDoc]
    };

    // 清理当前项目
    this.currentProject = null;

    return result;
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    logger.info('开发流程MCP服务器已启动');
  }

  /**
   * 获取服务器实例
   */
  public getServer(): Server {
    return this.server;
  }

  /**
   * 获取当前项目状态
   */
  public getCurrentProject(): ProjectState | null {
    return this.currentProject;
  }

  /**
   * 设置当前项目
   */
  public async setCurrentProject(projectId: string): Promise<void> {
    const project = await this.stateManager.loadProjectState(projectId);
    if (!project) {
      throw new DevelopmentFlowError(`项目不存在: ${projectId}`, 'PROJECT_NOT_FOUND');
    }
    this.currentProject = project;
  }
}