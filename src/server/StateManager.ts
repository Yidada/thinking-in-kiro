import { promises as fs } from 'fs';
import path from 'path';
import { ProjectState, DevelopmentFlowConfig, DevelopmentFlowError } from '../types/index.js';
import { ensureDir, readJsonFile, writeJsonFile, logger } from '../utils/index.js';

/**
 * 状态管理器
 */
export class StateManager {
  private config: DevelopmentFlowConfig;
  private stateDir: string;
  private projectsIndex: Map<string, string> = new Map(); // projectId -> filePath

  constructor(config: DevelopmentFlowConfig) {
    this.config = config;
    this.stateDir = path.join(config.baseDir, '.dev', 'states');
    this.initializeStateManager();
  }

  /**
   * 初始化状态管理器
   */
  private async initializeStateManager(): Promise<void> {
    try {
      await ensureDir(this.stateDir);
      await this.loadProjectsIndex();
      logger.info('状态管理器初始化完成');
    } catch (error) {
      logger.error(`状态管理器初始化失败: ${error instanceof Error ? error.message : String(error)}`);
      throw new DevelopmentFlowError(
        '状态管理器初始化失败',
        'STATE_MANAGER_INIT_ERROR'
      );
    }
  }

  /**
   * 加载项目索引
   */
  private async loadProjectsIndex(): Promise<void> {
    const indexPath = path.join(this.stateDir, 'projects.json');
    const index = await readJsonFile<Record<string, string>>(indexPath);
    
    if (index) {
      this.projectsIndex = new Map(Object.entries(index));
      logger.debug(`加载项目索引: ${this.projectsIndex.size} 个项目`);
    }
  }

  /**
   * 保存项目索引
   */
  private async saveProjectsIndex(): Promise<void> {
    const indexPath = path.join(this.stateDir, 'projects.json');
    const index = Object.fromEntries(this.projectsIndex);
    await writeJsonFile(indexPath, index);
  }

  /**
   * 保存项目状态
   */
  public async saveProjectState(project: ProjectState): Promise<void> {
    try {
      const fileName = `${project.id}.json`;
      const filePath = path.join(this.stateDir, fileName);
      
      // 创建备份（如果启用）
      if (this.config.autoBackup && await this.projectExists(project.id)) {
        await this.createBackup(project.id);
      }
      
      // 保存项目状态
      await writeJsonFile(filePath, project);
      
      // 更新索引
      this.projectsIndex.set(project.id, filePath);
      await this.saveProjectsIndex();
      
      logger.info(`项目状态已保存: ${project.id}`);
    } catch (error) {
      logger.error(`保存项目状态失败: ${error instanceof Error ? error.message : String(error)}`);
      throw new DevelopmentFlowError(
        `保存项目状态失败: ${error instanceof Error ? error.message : String(error)}`,
        'SAVE_STATE_ERROR',
        undefined,
        project.id
      );
    }
  }

  /**
   * 加载项目状态
   */
  public async loadProjectState(projectId: string): Promise<ProjectState | null> {
    try {
      const filePath = this.projectsIndex.get(projectId);
      if (!filePath) {
        logger.warn(`项目不存在: ${projectId}`);
        return null;
      }
      
      const project = await readJsonFile<ProjectState>(filePath);
      if (!project) {
        logger.warn(`项目状态文件损坏: ${projectId}`);
        return null;
      }
      
      logger.debug(`项目状态已加载: ${projectId}`);
      return project;
    } catch (error) {
      logger.error(`加载项目状态失败: ${error instanceof Error ? error.message : String(error)}`);
      throw new DevelopmentFlowError(
        `加载项目状态失败: ${error instanceof Error ? error.message : String(error)}`,
        'LOAD_STATE_ERROR',
        undefined,
        projectId
      );
    }
  }

  /**
   * 删除项目状态
   */
  public async deleteProjectState(projectId: string): Promise<boolean> {
    try {
      const filePath = this.projectsIndex.get(projectId);
      if (!filePath) {
        logger.warn(`项目不存在: ${projectId}`);
        return false;
      }
      
      // 创建备份（如果启用）
      if (this.config.autoBackup) {
        await this.createBackup(projectId);
      }
      
      // 删除文件
      await fs.unlink(filePath);
      
      // 更新索引
      this.projectsIndex.delete(projectId);
      await this.saveProjectsIndex();
      
      logger.info(`项目状态已删除: ${projectId}`);
      return true;
    } catch (error) {
      logger.error(`删除项目状态失败: ${error instanceof Error ? error.message : String(error)}`);
      throw new DevelopmentFlowError(
        `删除项目状态失败: ${error instanceof Error ? error.message : String(error)}`,
        'DELETE_STATE_ERROR',
        undefined,
        projectId
      );
    }
  }

  /**
   * 检查项目是否存在
   */
  public async projectExists(projectId: string): Promise<boolean> {
    const filePath = this.projectsIndex.get(projectId);
    if (!filePath) {
      return false;
    }
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      // 文件不存在，清理索引
      this.projectsIndex.delete(projectId);
      await this.saveProjectsIndex();
      return false;
    }
  }

  /**
   * 获取所有项目列表
   */
  public async getAllProjects(): Promise<ProjectState[]> {
    const projects: ProjectState[] = [];
    
    for (const [projectId, filePath] of this.projectsIndex) {
      try {
        const project = await readJsonFile<ProjectState>(filePath);
        if (project) {
          projects.push(project);
        } else {
          // 清理损坏的索引项
          this.projectsIndex.delete(projectId);
        }
      } catch (error) {
        logger.warn(`跳过损坏的项目文件: ${filePath}`);
        this.projectsIndex.delete(projectId);
      }
    }
    
    // 保存清理后的索引
    await this.saveProjectsIndex();
    
    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * 根据条件查找项目
   */
  public async findProjects(filter: Partial<ProjectState>): Promise<ProjectState[]> {
    const allProjects = await this.getAllProjects();
    
    return allProjects.filter(project => {
      for (const [key, value] of Object.entries(filter)) {
        if (project[key as keyof ProjectState] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 获取项目统计信息
   */
  public async getProjectStats(): Promise<{
    total: number;
    byPhase: Record<string, number>;
    recent: ProjectState[];
  }> {
    const allProjects = await this.getAllProjects();
    
    const byPhase: Record<string, number> = {};
    for (const project of allProjects) {
      byPhase[project.phase] = (byPhase[project.phase] || 0) + 1;
    }
    
    const recent = allProjects.slice(0, 5); // 最近5个项目
    
    return {
      total: allProjects.length,
      byPhase,
      recent
    };
  }

  /**
   * 创建备份
   */
  private async createBackup(projectId: string): Promise<void> {
    try {
      const filePath = this.projectsIndex.get(projectId);
      if (!filePath) {
        return;
      }
      
      const backupDir = path.join(this.stateDir, 'backups');
      await ensureDir(backupDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${projectId}_${timestamp}.json`;
      const backupPath = path.join(backupDir, backupFileName);
      
      const content = await fs.readFile(filePath, 'utf-8');
      await fs.writeFile(backupPath, content, 'utf-8');
      
      logger.debug(`创建备份: ${backupPath}`);
      
      // 清理旧备份（保留最近10个）
      await this.cleanupOldBackups(projectId);
    } catch (error) {
      logger.warn(`创建备份失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 清理旧备份
   */
  private async cleanupOldBackups(projectId: string): Promise<void> {
    try {
      const backupDir = path.join(this.stateDir, 'backups');
      const files = await fs.readdir(backupDir);
      
      const projectBackups = files
        .filter(file => file.startsWith(`${projectId}_`) && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          stat: fs.stat(path.join(backupDir, file))
        }));
      
      if (projectBackups.length <= 10) {
        return;
      }
      
      // 按修改时间排序，删除最旧的文件
      const sortedBackups = await Promise.all(
        projectBackups.map(async backup => ({
          ...backup,
          stat: await backup.stat
        }))
      );
      
      sortedBackups.sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());
      
      const toDelete = sortedBackups.slice(10);
      for (const backup of toDelete) {
        await fs.unlink(backup.path);
        logger.debug(`删除旧备份: ${backup.name}`);
      }
    } catch (error) {
      logger.warn(`清理旧备份失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 恢复项目状态
   */
  public async restoreProjectState(projectId: string, backupTimestamp?: string): Promise<ProjectState | null> {
    try {
      const backupDir = path.join(this.stateDir, 'backups');
      const files = await fs.readdir(backupDir);
      
      let backupFile: string;
      if (backupTimestamp) {
        backupFile = `${projectId}_${backupTimestamp}.json`;
      } else {
        // 找到最新的备份
        const projectBackups = files
          .filter(file => file.startsWith(`${projectId}_`) && file.endsWith('.json'))
          .sort()
          .reverse();
        
        if (projectBackups.length === 0) {
          logger.warn(`没有找到项目备份: ${projectId}`);
          return null;
        }
        
        backupFile = projectBackups[0];
      }
      
      const backupPath = path.join(backupDir, backupFile);
      const project = await readJsonFile<ProjectState>(backupPath);
      
      if (!project) {
        logger.warn(`备份文件损坏: ${backupPath}`);
        return null;
      }
      
      // 恢复项目状态
      await this.saveProjectState(project);
      
      logger.info(`项目状态已恢复: ${projectId} from ${backupFile}`);
      return project;
    } catch (error) {
      logger.error(`恢复项目状态失败: ${error instanceof Error ? error.message : String(error)}`);
      throw new DevelopmentFlowError(
        `恢复项目状态失败: ${error instanceof Error ? error.message : String(error)}`,
        'RESTORE_STATE_ERROR',
        undefined,
        projectId
      );
    }
  }

  /**
   * 清理状态管理器
   */
  public async cleanup(): Promise<void> {
    try {
      // 验证所有索引项对应的文件是否存在
      const toRemove: string[] = [];
      
      for (const [projectId, filePath] of this.projectsIndex) {
        try {
          await fs.access(filePath);
        } catch {
          toRemove.push(projectId);
        }
      }
      
      // 清理无效索引项
      for (const projectId of toRemove) {
        this.projectsIndex.delete(projectId);
      }
      
      if (toRemove.length > 0) {
        await this.saveProjectsIndex();
        logger.info(`清理了 ${toRemove.length} 个无效索引项`);
      }
      
      logger.info('状态管理器清理完成');
    } catch (error) {
      logger.error(`状态管理器清理失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取状态目录
   */
  public getStateDir(): string {
    return this.stateDir;
  }

  /**
   * 获取项目数量
   */
  public getProjectCount(): number {
    return this.projectsIndex.size;
  }
}