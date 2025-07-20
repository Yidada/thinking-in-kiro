import { promises as fs } from 'fs';
import path from 'path';
import { ProjectState, LogLevel, LogEntry } from '../types/index.js';

/**
 * 生成唯一的项目ID
 */
export function generateProjectId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `proj_${timestamp}_${random}`;
}

/**
 * 生成带编号的目录名
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
 * 确保目录存在
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * 安全地读取JSON文件
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
 * 安全地写入JSON文件
 */
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * 验证项目状态
 */
export function validateProjectState(state: Partial<ProjectState>): string[] {
  const errors: string[] = [];
  
  if (!state.id) {
    errors.push('项目ID不能为空');
  }
  
  if (!state.name || state.name.trim().length === 0) {
    errors.push('项目名称不能为空');
  }
  
  if (!state.phase) {
    errors.push('项目阶段不能为空');
  }
  
  return errors;
}

/**
 * 清理文件名（移除非法字符）
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 简单的日志记录器
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
    
    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // 输出到控制台
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

// 全局日志实例
export const logger = new Logger();