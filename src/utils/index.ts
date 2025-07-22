import { promises as fs } from 'fs';
import path from 'path';
import { ProjectState, LogLevel, LogEntry } from '../types/index.js';

/**
 * Generate unique project ID
 */
export function generateProjectId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `proj_${timestamp}_${random}`;
}

/**
 * Generate numbered directory name
 */
export function generateNumberedDir(baseDir: string, prefix: string = ''): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  let counter = 1;
  let dirName: string;
  
  do {
    const paddedCounter = counter.toString().padStart(3, '0');
    dirName = prefix ? `${prefix}_${date}_${paddedCounter}` : `${date}_${paddedCounter}`;
    counter++;
  } while (fs.access(path.join(baseDir, dirName)).then(() => true).catch(() => false));
  
  return dirName;
}

/**
 * Ensure directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Safely read JSON file
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
 * Safely write JSON file
 */
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Format timestamp
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Validate project state
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
 * Sanitize filename (remove invalid characters)
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Simple logger
 */
export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  
  constructor(private minLevel: LogLevel = LogLevel.INFO) {}
  
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }
  
  private addLog(level: LogLevel, message: string, projectId?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      timestamp: formatTimestamp(),
      level,
      message,
      projectId,
      metadata
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
  
  debug(message: string, projectId?: string, metadata?: Record<string, any>): void {
    this.addLog(LogLevel.DEBUG, message, projectId, metadata);
  }
  
  info(message: string, projectId?: string, metadata?: Record<string, any>): void {
    this.addLog(LogLevel.INFO, message, projectId, metadata);
  }
  
  warn(message: string, projectId?: string, metadata?: Record<string, any>): void {
    this.addLog(LogLevel.WARN, message, projectId, metadata);
  }
  
  error(message: string, projectId?: string, metadata?: Record<string, any>): void {
    this.addLog(LogLevel.ERROR, message, projectId, metadata);
  }
  
  getLogs(projectId?: string): LogEntry[] {
    if (projectId) {
      return this.logs.filter(log => log.projectId === projectId);
    }
    return [...this.logs];
  }
  
  clearLogs(): void {
    this.logs = [];
  }
}

// Global logger instance
export const logger = new Logger();