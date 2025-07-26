/**
 * Utility functions and classes for the thinking-in-kiro development flow system
 * 
 * This module provides essential utility functions for file operations, data validation,
 * logging, and other common operations used throughout the development flow process.
 * All functions are designed to be robust, type-safe, and handle edge cases gracefully.
 * 
 * @fileoverview Core utilities for project management, file operations, and logging
 * @author Development Flow System
 * @version 1.0.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import { ProjectState, LogLevel, LogEntry, DevelopmentFlowConfig, DevelopmentFlowError, DevelopmentPhase } from '../types/index.js';

/**
 * Generates a unique project identifier using timestamp and random string
 * 
 * Creates a unique project ID by combining the current timestamp with a
 * random alphanumeric string to ensure uniqueness across concurrent operations.
 * 
 * @returns A unique project identifier in the format 'proj_{timestamp}_{random}'
 * 
 * @example
 * ```typescript
 * const projectId = generateProjectId();
 * console.log(projectId); // 'proj_1703462400000_a1b2c3'
 * ```
 */
export function generateProjectId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `proj_${timestamp}_${random}`;
}

/**
 * Generates a numbered directory name with date prefix to avoid conflicts
 * 
 * Creates a unique directory name by combining the current date with an
 * incrementing counter. Checks for existing directories to ensure uniqueness.
 * This is an async operation that properly checks filesystem state.
 * 
 * @param baseDir - The base directory path where the new directory will be created
 * @param prefix - Optional prefix to prepend to the directory name
 * @returns Promise resolving to a unique directory name in the format '{prefix}_{YYYYMMDD}_{counter}'
 * 
 * @example
 * ```typescript
 * const dirName = await generateNumberedDir('/projects', 'dev');
 * console.log(dirName); // 'dev_20241224_001'
 * 
 * const simpleName = await generateNumberedDir('/output');
 * console.log(simpleName); // '20241224_001'
 * ```
 */
export async function generateNumberedDir(baseDir: string, prefix = ''): Promise<string> {
  const date = new Date().toISOString().split('T')[0]!.replace(/-/g, '');
  let counter = 1;
  let dirName: string;
  
  do {
    const paddedCounter = counter.toString().padStart(3, '0');
    dirName = prefix ? `${prefix}_${date}_${paddedCounter}` : `${date}_${paddedCounter}`;
    try {
      await fs.access(path.join(baseDir, dirName));
      counter++;
    } catch {
      break;
    }
  } while (true);
  
  return dirName;
}

/**
 * Ensures a directory exists, creating it recursively if necessary
 * 
 * Checks if the specified directory exists and creates it (including any
 * necessary parent directories) if it doesn't exist. This is a safe operation
 * that won't fail if the directory already exists.
 * 
 * @param dirPath - The absolute or relative path to the directory
 * @throws Will throw an error if directory creation fails due to permissions or other filesystem issues
 * 
 * @example
 * ```typescript
 * await ensureDir('./projects/my-project/docs');
 * // Creates the entire directory structure if it doesn't exist
 * 
 * await ensureDir('/absolute/path/to/directory');
 * // Works with absolute paths as well
 * ```
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Safely reads and parses a JSON file with type safety
 * 
 * Attempts to read a JSON file and parse its contents. Returns null if the
 * file doesn't exist, can't be read, or contains invalid JSON. This prevents
 * errors from propagating and allows for graceful handling of missing files.
 * 
 * @template T - The expected type of the JSON content
 * @param filePath - Path to the JSON file to read
 * @returns The parsed JSON content as type T, or null if reading/parsing fails
 * 
 * @example
 * ```typescript
 * interface Config {
 *   apiUrl: string;
 *   timeout: number;
 * }
 * 
 * const config = await readJsonFile<Config>('./config.json');
 * if (config) {
 *   console.log(config.apiUrl); // Type-safe access
 * } else {
 *   console.log('Config file not found or invalid');
 * }
 * ```
 */
export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Safely writes data to a JSON file with proper formatting
 * 
 * Serializes the provided data to JSON with proper indentation and writes
 * it to the specified file. Automatically creates the directory structure
 * if it doesn't exist.
 * 
 * @param filePath - Path where the JSON file should be written
 * @param data - The data to serialize and write to the file
 * @throws Will throw an error if file writing fails due to permissions or filesystem issues
 * 
 * @example
 * ```typescript
 * const projectData = {
 *   id: 'proj_123',
 *   name: 'My Project',
 *   phase: 'design'
 * };
 * 
 * await writeJsonFile('./data/project.json', projectData);
 * // Creates ./data/ directory if needed and writes formatted JSON
 * ```
 */
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Formats a date object into an ISO 8601 timestamp string
 * 
 * Converts a Date object to a standardized ISO 8601 string format.
 * Uses the current date/time if no date is provided.
 * 
 * @param date - The date to format (defaults to current date/time)
 * @returns ISO 8601 formatted timestamp string
 * 
 * @example
 * ```typescript
 * const now = formatTimestamp();
 * console.log(now); // '2024-12-24T10:30:00.000Z'
 * 
 * const specificDate = formatTimestamp(new Date('2024-01-01'));
 * console.log(specificDate); // '2024-01-01T00:00:00.000Z'
 * ```
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Validates a project state object and returns validation errors
 * 
 * Performs comprehensive validation on a project state object, checking
 * for required fields and basic data integrity. Returns an array of
 * error messages for any validation failures.
 * 
 * @param state - Partial project state object to validate
 * @returns Array of validation error messages (empty if valid)
 * 
 * @example
 * ```typescript
 * const projectState = {
 *   id: '',
 *   name: 'My Project',
 *   phase: DevelopmentPhase.INIT
 * };
 * 
 * const errors = validateProjectState(projectState);
 * if (errors.length > 0) {
 *   console.log('Validation errors:', errors);
 *   // ['Project ID cannot be empty']
 * }
 * ```
 */
export function validateProjectState(state: Partial<ProjectState>): string[] {
  const errors: string[] = [];
  
  if (!state.id) {
    errors.push('Project ID cannot be empty');
  }
  
  if (!state.name || state.name.trim().length === 0) {
    errors.push('Project name cannot be empty');
  }
  
  if (!state.phase) {
    errors.push('Project phase cannot be empty');
  }
  
  return errors;
}

/**
 * Sanitizes a filename by removing or replacing invalid characters
 * 
 * Removes characters that are invalid in filenames across different
 * operating systems and replaces spaces with underscores. Converts
 * the result to lowercase for consistency.
 * 
 * @param fileName - The original filename to sanitize
 * @returns A sanitized filename safe for use across different filesystems
 * 
 * @example
 * ```typescript
 * const unsafe = 'My Project: Design & Implementation';
 * const safe = sanitizeFileName(unsafe);
 * console.log(safe); // 'my_project__design___implementation'
 * 
 * const withSpaces = 'Project Name With Spaces';
 * const sanitized = sanitizeFileName(withSpaces);
 * console.log(sanitized); // 'project_name_with_spaces'
 * ```
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

/**
 * Creates a deep clone of an object using JSON serialization
 * 
 * Performs a deep copy of an object by serializing it to JSON and then
 * parsing it back. This method works for most plain objects but will
 * not preserve functions, undefined values, or complex object types.
 * 
 * @template T - The type of the object to clone
 * @param obj - The object to clone
 * @returns A deep copy of the original object
 * 
 * @example
 * ```typescript
 * const original = {
 *   name: 'Project',
 *   config: { debug: true, timeout: 5000 },
 *   tasks: ['task1', 'task2']
 * };
 * 
 * const cloned = deepClone(original);
 * cloned.config.debug = false; // Doesn't affect original
 * console.log(original.config.debug); // Still true
 * ```
 * 
 * @warning This method cannot clone functions, Date objects, RegExp, or other complex types
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Comprehensive logging utility for development flow operations
 * 
 * Provides structured logging with level-based filtering, automatic console output,
 * and in-memory log storage with automatic rotation. Supports project-specific
 * logging and metadata attachment for enhanced debugging capabilities.
 * 
 * @example
 * ```typescript
 * const logger = new Logger(LogLevel.INFO);
 * 
 * logger.info('Project created', 'proj_123', { phase: 'init' });
 * logger.warn('Configuration missing', 'proj_123');
 * logger.error('Failed to save state', 'proj_123', { error: 'Permission denied' });
 * 
 * // Get all logs for a specific project
 * const projectLogs = logger.getLogs('proj_123');
 * ```
 */
export class Logger {
  /** Internal storage for log entries */
  private logs: LogEntry[] = [];
  /** Maximum number of log entries to keep in memory */
  private maxLogs = 1000;
  
  /**
   * Creates a new Logger instance with specified minimum log level
   * 
   * @param minLevel - Minimum log level to process (defaults to INFO)
   */
  constructor(private minLevel: LogLevel = LogLevel.INFO) {}
  
  /**
   * Determines if a log entry should be processed based on the minimum level
   * 
   * @param level - The log level to check
   * @returns True if the level meets or exceeds the minimum level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }
  
  /**
   * Internal method to add a log entry with automatic console output
   * 
   * @param level - Log level for the entry
   * @param message - Log message content
   * @param projectId - Optional project identifier
   * @param metadata - Optional additional context data
   */
  private addLog(level: LogLevel, message: string, projectId?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level,
      message,
      ...(projectId !== undefined && { projectId }),
      ...(metadata !== undefined && { metadata })
    };
    
    this.logs.push(entry);
    
    // Keep log count within limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Output to console
    const logMethod = level === LogLevel.ERROR ? console.error :
                     level === LogLevel.WARN ? console.warn :
                     console.log;
    
    logMethod(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`);
  }
  
  /**
   * Logs a debug message (lowest priority)
   * 
   * @param message - Debug message content
   * @param projectId - Optional project identifier
   * @param metadata - Optional additional context data
   */
  debug(message: string, projectId?: string, metadata?: Record<string, any>): void {
    this.addLog(LogLevel.DEBUG, message, projectId, metadata);
  }
  
  /**
   * Logs an informational message
   * 
   * @param message - Information message content
   * @param projectId - Optional project identifier
   * @param metadata - Optional additional context data
   */
  info(message: string, projectId?: string, metadata?: Record<string, any>): void {
    this.addLog(LogLevel.INFO, message, projectId, metadata);
  }
  
  /**
   * Logs a warning message
   * 
   * @param message - Warning message content
   * @param projectId - Optional project identifier
   * @param metadata - Optional additional context data
   */
  warn(message: string, projectId?: string, metadata?: Record<string, any>): void {
    this.addLog(LogLevel.WARN, message, projectId, metadata);
  }
  
  /**
   * Logs an error message (highest priority)
   * 
   * @param message - Error message content
   * @param projectId - Optional project identifier
   * @param metadata - Optional additional context data
   */
  error(message: string, projectId?: string, metadata?: Record<string, any>): void {
    this.addLog(LogLevel.ERROR, message, projectId, metadata);
  }
  
  /**
   * Retrieves log entries, optionally filtered by project ID
   * 
   * @param projectId - Optional project ID to filter logs
   * @returns Array of log entries (filtered if projectId provided)
   * 
   * @example
   * ```typescript
   * // Get all logs
   * const allLogs = logger.getLogs();
   * 
   * // Get logs for specific project
   * const projectLogs = logger.getLogs('proj_123');
   * ```
   */
  getLogs(projectId?: string): LogEntry[] {
    if (projectId) {
      return this.logs.filter(log => log.projectId === projectId);
    }
    return [...this.logs];
  }
  
  /**
   * Clears all stored log entries from memory
   * 
   * @example
   * ```typescript
   * logger.clearLogs(); // Removes all stored logs
   * ```
   */
  clearLogs(): void {
    this.logs = [];
  }
}

/**
 * Input validation utilities for development flow operations
 */
export class InputValidator {
  /**
   * Validates project name input
   */
  static validateProjectName(name: string): string[] {
    const errors: string[] = [];
    
    if (!name || typeof name !== 'string') {
      errors.push('Project name is required');
      return errors;
    }
    
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      errors.push('Project name cannot be empty');
    }
    
    if (trimmed.length > 100) {
      errors.push('Project name cannot exceed 100 characters');
    }
    
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
      errors.push('Project name can only contain letters, numbers, spaces, hyphens, and underscores');
    }
    
    return errors;
  }
  
  /**
   * Validates and sanitizes text input
   */
  static sanitizeText(text: string, maxLength: number = 1000): string {
    if (typeof text !== 'string') return '';
    
    return text
      .trim()
      .slice(0, maxLength)
      .replace(/[<>"'&]/g, (char) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[char] || char;
      });
  }
  
  /**
   * Validates array input
   */
  static validateStringArray(arr: any, fieldName: string, maxItems: number = 50): string[] {
    const errors: string[] = [];
    
    if (!Array.isArray(arr)) {
      errors.push(`${fieldName} must be an array`);
      return errors;
    }
    
    if (arr.length > maxItems) {
      errors.push(`${fieldName} cannot exceed ${maxItems} items`);
    }
    
    arr.forEach((item, index) => {
      if (typeof item !== 'string') {
        errors.push(`${fieldName}[${index}] must be a string`);
      } else if (item.trim().length === 0) {
        errors.push(`${fieldName}[${index}] cannot be empty`);
      }
    });
    
    return errors;
  }
  
  /**
   * Validates task ID format
   */
  static validateTaskId(taskId: string): string[] {
    const errors: string[] = [];
    
    if (!taskId || typeof taskId !== 'string') {
      errors.push('Task ID is required');
      return errors;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(taskId)) {
      errors.push('Task ID can only contain letters, numbers, hyphens, and underscores');
    }
    
    if (taskId.length > 50) {
      errors.push('Task ID cannot exceed 50 characters');
    }
    
    return errors;
  }
}

/**
 * Configuration validation utilities
 */
export class ConfigValidator {
  /**
   * Validates development flow configuration
   */
  static validateConfig(config: Partial<DevelopmentFlowConfig>): string[] {
    const errors: string[] = [];
    
    if (!config.baseDir || typeof config.baseDir !== 'string') {
      errors.push('baseDir is required and must be a string');
    }
    
    if (!config.projectsDir || typeof config.projectsDir !== 'string') {
      errors.push('projectsDir is required and must be a string');
    }
    
    if (config.maxProjects !== undefined) {
      if (typeof config.maxProjects !== 'number' || config.maxProjects < 1) {
        errors.push('maxProjects must be a positive number');
      }
    }
    
    if (config.logLevel !== undefined) {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLevels.includes(config.logLevel)) {
        errors.push(`logLevel must be one of: ${validLevels.join(', ')}`);
      }
    }
    
    return errors;
  }
}

/**
 * Error response formatting utilities
 */
export class ErrorFormatter {
  /**
   * Formats error for MCP response
   */
  static formatMCPError(error: Error | DevelopmentFlowError): any {
    const baseError = {
      error: true,
      message: error.message,
      timestamp: formatTimestamp()
    };
    
    if (error instanceof DevelopmentFlowError) {
      return {
        ...baseError,
        code: error.code,
        phase: error.phase,
        projectId: error.projectId
      };
    }
    
    return baseError;
  }
  
  /**
   * Creates a validation error response
   */
  static validationError(errors: string[], phase?: DevelopmentPhase): DevelopmentFlowError {
    return new DevelopmentFlowError(
      `Validation failed: ${errors.join(', ')}`,
      'VALIDATION_ERROR',
      phase
    );
  }
}

/**
 * Global logger instance for application-wide logging
 * 
 * Pre-configured logger instance with INFO level that can be used throughout
 * the application for consistent logging. This provides a convenient way to
 * log messages without creating new logger instances.
 * 
 * @example
 * ```typescript
 * import { logger } from './utils';
 * 
 * logger.info('Application started');
 * logger.error('Failed to process request', 'proj_123');
 * ```
 */
export const logger = new Logger();