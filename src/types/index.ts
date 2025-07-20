/**
 * 核心类型定义
 */

// 开发流程阶段枚举
export enum DevelopmentPhase {
  INIT = 'init',
  REQUIREMENT = 'requirement', 
  CONFIRMATION = 'confirmation',
  DESIGN = 'design',
  TODO = 'todo',
  TASK_COMPLETE = 'task_complete',
  FINISH = 'finish'
}

// 项目状态接口
export interface ProjectState {
  id: string;
  name: string;
  phase: DevelopmentPhase;
  createdAt: string;
  updatedAt: string;
  description?: string;
  requirements?: string[];
  functionalRequirements?: string[];
  technicalRequirements?: string[];
  acceptanceCriteria?: string[];
  architecture?: string;
  implementation?: string;
  systemDesign?: string;
  dataStructures?: string;
  interfaces?: string;
  deployment?: string;
  tasks?: Task[];
  completedTasks?: string[];
}

// 任务接口
export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
  dependencies?: string[];
  createdAt: string;
  updatedAt: string;
}

// 工具输入参数接口
export interface DevelopmentFlowInput {
  action: DevelopmentPhase;
  projectName?: string;
  description?: string;
  requirements?: string[];
  functionalRequirements?: string[];
  technicalRequirements?: string[];
  acceptanceCriteria?: string[];
  phase?: string;
  confirmed?: boolean;
  architecture?: string;
  implementation?: string;
  systemDesign?: string;
  dataStructures?: string;
  interfaces?: string;
  deployment?: string;
  tasks?: Task[];
  taskId?: string;
}

// 工具输出结果接口
export interface DevelopmentFlowResult {
  success: boolean;
  message: string;
  data?: any;
  projectId?: string;
  phase?: DevelopmentPhase;
  nextSteps?: string[];
  generatedFiles?: string[];
}

// 错误类型
export class DevelopmentFlowError extends Error {
  constructor(
    message: string,
    public code: string,
    public phase?: DevelopmentPhase,
    public projectId?: string
  ) {
    super(message);
    this.name = 'DevelopmentFlowError';
  }
}

// 配置接口
export interface DevelopmentFlowConfig {
  baseDir: string;
  templatesDir: string;
  projectsDir: string;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxProjects: number;
  autoBackup: boolean;
}

// 文档模板接口
export interface DocumentTemplate {
  name: string;
  path: string;
  variables: string[];
  content: string;
}

// 日志级别
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// 日志条目接口
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  projectId?: string;
  phase?: DevelopmentPhase;
  metadata?: Record<string, any>;
}