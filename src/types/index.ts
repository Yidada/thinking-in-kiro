/**
 * Core type definitions for the thinking-in-kiro development flow system
 */

/**
 * Enumeration of development flow phases that define the structured workflow
 * 
 * Each phase represents a specific stage in the development process, ensuring
 * systematic progression from initial requirements to final completion.
 * 
 * @example
 * ```typescript
 * const currentPhase = DevelopmentPhase.REQUIREMENT;
 * if (currentPhase === DevelopmentPhase.DESIGN) {
 *   // Proceed with design phase logic
 * }
 * ```
 */
export enum DevelopmentPhase {
  /** Initial project setup and configuration */
  INIT = 'init',
  /** Requirements gathering and analysis phase */
  REQUIREMENT = 'requirement', 
  /** User confirmation of requirements before proceeding */
  CONFIRMATION = 'confirmation',
  /** Technical design and architecture planning */
  DESIGN = 'design',
  /** Task breakdown and implementation planning */
  TODO = 'todo',
  /** Individual task completion tracking */
  TASK_COMPLETE = 'task_complete',
  /** Project status monitoring and reporting */
  STATUS = 'status',
  /** Final project completion and documentation */
  FINISH = 'finish'
}

/**
 * Comprehensive project state interface that tracks all aspects of a development project
 * 
 * This interface serves as the central data structure for maintaining project information
 * throughout the entire development lifecycle, from initial requirements to completion.
 * 
 * @example
 * ```typescript
 * const project: ProjectState = {
 *   id: 'proj_123456_abc',
 *   name: 'My New Feature',
 *   phase: DevelopmentPhase.DESIGN,
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-02T12:00:00Z',
 *   description: 'Adding user authentication system'
 * };
 * ```
 */
export interface ProjectState {
  /** Unique project identifier generated automatically */
  id: string;
  /** Human-readable project name */
  name: string;
  /** Current phase in the development workflow */
  phase: DevelopmentPhase;
  /** ISO timestamp when project was created */
  createdAt: string;
  /** ISO timestamp when project was last modified */
  updatedAt: string;
  /** Optional detailed project description */
  description?: string;
  /** Core project requirements list */
  requirements?: string[];
  /** Functional requirements specifications */
  functionalRequirements?: string[];
  /** Technical requirements and constraints */
  technicalRequirements?: string[];
  /** Acceptance criteria for project completion */
  acceptanceCriteria?: string[];
  /** Technical architecture documentation */
  architecture?: string;
  /** Implementation plan and approach */
  implementation?: string;
  /** System design specifications */
  systemDesign?: string;
  /** Data structures and models documentation */
  dataStructures?: string;
  /** Interface definitions and API specifications */
  interfaces?: string;
  /** Deployment strategy and configuration */
  deployment?: string;
  /** List of project tasks and subtasks */
  tasks?: Task[];
  /** Array of completed task IDs for tracking progress */
  completedTasks?: string[];
}

/**
 * Individual task representation within a development project
 * 
 * Tasks are the atomic units of work that make up a project, providing
 * detailed tracking of progress, effort estimation, and dependencies.
 * 
 * @example
 * ```typescript
 * const task: Task = {
 *   id: 'task_001',
 *   title: 'Implement user login',
 *   description: 'Create login form with validation',
 *   status: 'in_progress',
 *   priority: 'high',
 *   estimatedHours: 8,
 *   createdAt: '2024-01-01T00:00:00Z',
 *   updatedAt: '2024-01-01T00:00:00Z'
 * };
 * ```
 */
export interface Task {
  /** Unique task identifier */
  id: string;
  /** Brief, descriptive task title */
  title: string;
  /** Detailed task description and requirements */
  description: string;
  /** Current task status */
  status: 'pending' | 'in_progress' | 'completed';
  /** Task priority level for scheduling */
  priority: 'low' | 'medium' | 'high';
  /** Optional assignee responsible for the task */
  assignee?: string;
  /** Estimated effort in hours */
  estimatedHours?: number;
  /** Actual time spent on the task in hours */
  actualHours?: number;
  /** Array of task IDs that must be completed first */
  dependencies?: string[];
  /** ISO timestamp when task was created */
  createdAt: string;
  /** ISO timestamp when task was last updated */
  updatedAt: string;
}

/**
 * Input interface for initiating a development flow process
 * 
 * This interface defines the required and optional parameters needed to start
 * a new development project or continue an existing one.
 * 
 * @example
 * ```typescript
 * const input: DevelopmentFlowInput = {
 *   action: DevelopmentPhase.REQUIREMENT,
 *   projectName: 'User Authentication System',
 *   description: 'Implement secure login and registration',
 *   requirements: ['JWT tokens', 'Password hashing', 'Email verification']
 * };
 * ```
 */
export interface DevelopmentFlowInput {
  /** The development phase action to execute */
  action: DevelopmentPhase;
  /** Name of the project to be created or continued */
  projectName?: string;
  /** Optional detailed description of the project goals */
  description?: string;
  /** Initial list of project requirements */
  requirements?: string[];
  /** Functional requirements specifications */
  functionalRequirements?: string[];
  /** Technical requirements and constraints */
  technicalRequirements?: string[];
  /** Acceptance criteria for project completion */
  acceptanceCriteria?: string[];
  /** Phase identifier as string */
  phase?: string;
  /** User confirmation flag for proceeding to next phase */
  confirmed?: boolean;
  /** Technical architecture documentation */
  architecture?: string;
  /** Implementation plan and approach */
  implementation?: string;
  /** System design specifications */
  systemDesign?: string;
  /** Data structures and models documentation */
  dataStructures?: string;
  /** Interface definitions and API specifications */
  interfaces?: string;
  /** Deployment strategy and configuration */
  deployment?: string;
  /** List of project tasks and subtasks */
  tasks?: Task[];
  /** Specific task identifier for task operations */
  taskId?: string;
  /** Force flag to override validation checks */
  force?: boolean;
}

/**
 * Result interface returned by development flow operations
 * 
 * This interface standardizes the response format for all development flow
 * operations, providing consistent success/failure information and next steps.
 * 
 * @example
 * ```typescript
 * const result: DevelopmentFlowResult = {
 *   success: true,
 *   message: 'Requirements analysis completed successfully',
 *   projectId: 'proj_123456_abc',
 *   phase: DevelopmentPhase.DESIGN,
 *   nextSteps: ['Review requirements', 'Proceed to design phase']
 * };
 * ```
 */
export interface DevelopmentFlowResult {
  /** Indicates whether the operation completed successfully */
  success: boolean;
  /** Human-readable message describing the operation result */
  message: string;
  /** Additional data returned by the operation */
  data?: any;
  /** Project identifier if operation involved a specific project */
  projectId?: string;
  /** Current phase after the operation */
  phase?: DevelopmentPhase;
  /** Suggested next steps for the user */
  nextSteps?: string[];
  /** Array of files generated during the operation */
  generatedFiles?: string[];
}

/**
 * Custom error class for development flow operations
 * 
 * This specialized error class provides enhanced error information specific
 * to development flow operations, including context about the current phase,
 * project, and additional metadata for debugging.
 * 
 * @example
 * ```typescript
 * throw new DevelopmentFlowError(
 *   'Failed to save project state',
 *   'STATE_SAVE_ERROR',
 *   DevelopmentPhase.DESIGN,
 *   'proj_123456_abc'
 * );
 * ```
 */
export class DevelopmentFlowError extends Error {
  /**
   * Creates a new DevelopmentFlowError instance
   * 
   * @param message - Human-readable error description
   * @param code - Unique error code for programmatic handling
   * @param phase - Optional development phase where error occurred
   * @param projectId - Optional project identifier
   */
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

/**
 * Configuration interface for customizing development flow behavior
 * 
 * This interface allows users to customize various aspects of the development
 * flow process, including file locations, logging, and operational parameters.
 * 
 * @example
 * ```typescript
 * const config: DevelopmentFlowConfig = {
 *   baseDir: './projects',
 *   templatesDir: './templates',
 *   projectsDir: './output',
 *   enableLogging: true,
 *   logLevel: 'info',
 *   maxProjects: 100,
 *   autoBackup: true
 * };
 * ```
 */
export interface DevelopmentFlowConfig {
  /** Base directory for all development flow operations */
  baseDir: string;
  /** Directory path for document templates */
  templatesDir: string;
  /** Directory path for project files */
  projectsDir: string;
  /** Whether to enable logging functionality */
  enableLogging: boolean;
  /** Logging verbosity level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Maximum number of projects to maintain */
  maxProjects: number;
  /** Whether to automatically backup project state */
  autoBackup: boolean;
}

/**
 * Document template interface for generating standardized project documents
 * 
 * Templates provide a structured way to generate consistent documentation
 * across different projects and phases of development.
 * 
 * @example
 * ```typescript
 * const template: DocumentTemplate = {
 *   name: 'requirement-template',
 *   path: './templates/requirements.md',
 *   variables: ['projectName', 'description', 'requirements'],
 *   content: '# {{projectName}}\n\n{{description}}\n\n## Requirements\n{{requirements}}'
 * };
 * ```
 */
export interface DocumentTemplate {
  /** Unique template identifier */
  name: string;
  /** File system path to the template */
  path: string;
  /** Array of variable names used in the template */
  variables: string[];
  /** Template content with variable placeholders */
  content: string;
}

// Log level
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Log entry interface for tracking development flow operations
 * 
 * Log entries provide detailed tracking of all operations, errors, and
 * state changes throughout the development process for debugging and auditing.
 * 
 * @example
 * ```typescript
 * const logEntry: LogEntry = {
 *   timestamp: '2024-01-01T12:00:00Z',
 *   level: LogLevel.INFO,
 *   message: 'Project requirements updated successfully',
 *   projectId: 'proj_123456_abc',
 *   phase: DevelopmentPhase.REQUIREMENT,
 *   metadata: { updatedFields: ['functionalRequirements'], changeCount: 3 }
 * };
 * ```
 */
export interface LogEntry {
  /** ISO timestamp when the log entry was created */
  timestamp: string;
  /** Severity level of the log entry */
  level: LogLevel;
  /** Human-readable log message */
  message: string;
  /** Associated project identifier, if applicable */
  projectId?: string;
  /** Development phase when the log entry was created */
  phase?: DevelopmentPhase;
  /** Additional contextual data for the log entry */
  metadata?: Record<string, any>;
}