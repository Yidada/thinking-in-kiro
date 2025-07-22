/**
 * Core type definitions
 */

// Development flow phase enumeration
export enum DevelopmentPhase {
  INIT = 'init',
  REQUIREMENT = 'requirement', 
  CONFIRMATION = 'confirmation',
  DESIGN = 'design',
  TODO = 'todo',
  TASK_COMPLETE = 'task_complete',
  STATUS = 'status',
  FINISH = 'finish'
}

// Project state interface
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

// Task interface
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

// Tool input parameters interface
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
  force?: boolean;
}

// Tool output result interface
export interface DevelopmentFlowResult {
  success: boolean;
  message: string;
  data?: any;
  projectId?: string;
  phase?: DevelopmentPhase;
  nextSteps?: string[];
  generatedFiles?: string[];
}

// Error type
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

// Configuration interface
export interface DevelopmentFlowConfig {
  baseDir: string;
  templatesDir: string;
  projectsDir: string;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxProjects: number;
  autoBackup: boolean;
}

// Document template interface
export interface DocumentTemplate {
  name: string;
  path: string;
  variables: string[];
  content: string;
}

// Log level
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Log entry interface
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  projectId?: string;
  phase?: DevelopmentPhase;
  metadata?: Record<string, any>;
}