import { promises as fs } from 'fs';
import path from 'path';
import { ProjectState, DevelopmentFlowConfig, DevelopmentFlowError } from '../types/index.js';
import { ensureDir, readJsonFile, writeJsonFile, logger } from '../utils/index.js';

/**
 * State manager
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
   * Initialize state manager
   */
  private async initializeStateManager(): Promise<void> {
    try {
      await ensureDir(this.stateDir);
      await this.loadProjectsIndex();
      logger.info('State manager initialization completed');
    } catch (error) {
      logger.error(`State manager initialization failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new DevelopmentFlowError(
        'State manager initialization failed',
        'STATE_MANAGER_INIT_ERROR'
      );
    }
  }

  /**
   * Load projects index
   */
  private async loadProjectsIndex(): Promise<void> {
    const indexPath = path.join(this.stateDir, 'projects.json');
    const index = await readJsonFile<Record<string, string>>(indexPath);
    
    if (index) {
      this.projectsIndex = new Map(Object.entries(index));
      logger.debug(`Loaded projects index: ${this.projectsIndex.size} projects`);
    }
  }

  /**
   * Save projects index
   */
  private async saveProjectsIndex(): Promise<void> {
    const indexPath = path.join(this.stateDir, 'projects.json');
    const index = Object.fromEntries(this.projectsIndex);
    await writeJsonFile(indexPath, index);
  }

  /**
   * Save project state
   */
  public async saveProjectState(project: ProjectState): Promise<void> {
    try {
      const fileName = `${project.id}.json`;
      const filePath = path.join(this.stateDir, fileName);
      
      // Create backup (if enabled)
      if (this.config.autoBackup && await this.projectExists(project.id)) {
        await this.createBackup(project.id);
      }
      
      // Save project state
      await writeJsonFile(filePath, project);
      
      // Update index
      this.projectsIndex.set(project.id, filePath);
      await this.saveProjectsIndex();
      
      logger.info(`Project state saved: ${project.id}`);
    } catch (error) {
      logger.error(`Failed to save project state: ${error instanceof Error ? error.message : String(error)}`);
      throw new DevelopmentFlowError(
        `Failed to save project state: ${error instanceof Error ? error.message : String(error)}`,
        'SAVE_STATE_ERROR',
        undefined,
        project.id
      );
    }
  }

  /**
   * Load project state
   */
  public async loadProjectState(projectId: string): Promise<ProjectState | null> {
    try {
      const filePath = this.projectsIndex.get(projectId);
      if (!filePath) {
        logger.warn(`Project does not exist: ${projectId}`);
        return null;
      }
      
      const project = await readJsonFile<ProjectState>(filePath);
      if (!project) {
        logger.warn(`Project state file corrupted: ${projectId}`);
        return null;
      }
      
      logger.debug(`Project state loaded: ${projectId}`);
      return project;
    } catch (error) {
      logger.error(`Failed to load project state: ${error instanceof Error ? error.message : String(error)}`);
      throw new DevelopmentFlowError(
        `Failed to load project state: ${error instanceof Error ? error.message : String(error)}`,
        'LOAD_STATE_ERROR',
        undefined,
        projectId
      );
    }
  }

  /**
   * Delete project state
   */
  public async deleteProjectState(projectId: string): Promise<boolean> {
    try {
      const filePath = this.projectsIndex.get(projectId);
      if (!filePath) {
        logger.warn(`Project does not exist: ${projectId}`);
        return false;
      }
      
      // Create backup (if enabled)
      if (this.config.autoBackup) {
        await this.createBackup(projectId);
      }
      
      // Delete file
      await fs.unlink(filePath);
      
      // Update index
      this.projectsIndex.delete(projectId);
      await this.saveProjectsIndex();
      
      logger.info(`Project state deleted: ${projectId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete project state: ${error instanceof Error ? error.message : String(error)}`);
      throw new DevelopmentFlowError(
        `Failed to delete project state: ${error instanceof Error ? error.message : String(error)}`,
        'DELETE_STATE_ERROR',
        undefined,
        projectId
      );
    }
  }

  /**
   * Check if project exists
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
      // File does not exist, clean up index
      this.projectsIndex.delete(projectId);
      await this.saveProjectsIndex();
      return false;
    }
  }

  /**
   * Get all projects list
   */
  public async getAllProjects(): Promise<ProjectState[]> {
    const projects: ProjectState[] = [];
    
    for (const [projectId, filePath] of this.projectsIndex) {
      try {
        const project = await readJsonFile<ProjectState>(filePath);
        if (project) {
          projects.push(project);
        } else {
          // Clean up corrupted index entry
          this.projectsIndex.delete(projectId);
        }
      } catch (error) {
        logger.warn(`Skipping corrupted project file: ${filePath}`);
        this.projectsIndex.delete(projectId);
      }
    }
    
    // Save cleaned up index
    await this.saveProjectsIndex();
    
    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Find projects by criteria
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
   * Get project statistics
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
    
    const recent = allProjects.slice(0, 5); // Recent 5 projects
    
    return {
      total: allProjects.length,
      byPhase,
      recent
    };
  }

  /**
   * Create backup
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
      
      logger.debug(`Created backup: ${backupPath}`);
      
      // Clean up old backups (keep recent 10)
      await this.cleanupOldBackups(projectId);
    } catch (error) {
      logger.warn(`Failed to create backup: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up old backups
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
      
      // Sort by modification time, delete oldest files
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
        logger.debug(`Deleted old backup: ${backup.name}`);
      }
    } catch (error) {
      logger.warn(`Failed to clean up old backups: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Restore project state
   */
  public async restoreProjectState(projectId: string, backupTimestamp?: string): Promise<ProjectState | null> {
    try {
      const backupDir = path.join(this.stateDir, 'backups');
      const files = await fs.readdir(backupDir);
      
      let backupFile: string;
      if (backupTimestamp) {
        backupFile = `${projectId}_${backupTimestamp}.json`;
      } else {
        // Find latest backup
        const projectBackups = files
          .filter(file => file.startsWith(`${projectId}_`) && file.endsWith('.json'))
          .sort()
          .reverse();
        
        if (projectBackups.length === 0) {
          logger.warn(`No project backup found: ${projectId}`);
          return null;
        }
        
        backupFile = projectBackups[0];
      }
      
      const backupPath = path.join(backupDir, backupFile);
      const project = await readJsonFile<ProjectState>(backupPath);
      
      if (!project) {
        logger.warn(`Backup file corrupted: ${backupPath}`);
        return null;
      }
      
      // Restore project state
      await this.saveProjectState(project);
      
      logger.info(`Project state restored: ${projectId} from ${backupFile}`);
      return project;
    } catch (error) {
      logger.error(`Failed to restore project state: ${error instanceof Error ? error.message : String(error)}`);
      throw new DevelopmentFlowError(
        `Failed to restore project state: ${error instanceof Error ? error.message : String(error)}`,
        'RESTORE_STATE_ERROR',
        undefined,
        projectId
      );
    }
  }

  /**
   * Clean up state manager
   */
  public async cleanup(): Promise<void> {
    try {
      // Verify all indexed files exist
      const toRemove: string[] = [];
      
      for (const [projectId, filePath] of this.projectsIndex) {
        try {
          await fs.access(filePath);
        } catch {
          toRemove.push(projectId);
        }
      }
      
      // Clean up invalid index entries
      for (const projectId of toRemove) {
        this.projectsIndex.delete(projectId);
      }
      
      if (toRemove.length > 0) {
        await this.saveProjectsIndex();
        logger.info(`Cleaned up ${toRemove.length} invalid index entries`);
      }
      
      logger.info('State manager cleanup completed');
    } catch (error) {
      logger.error(`State manager cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get state directory
   */
  public getStateDir(): string {
    return this.stateDir;
  }

  /**
   * Get project count
   */
  public getProjectCount(): number {
    return this.projectsIndex.size;
  }
}