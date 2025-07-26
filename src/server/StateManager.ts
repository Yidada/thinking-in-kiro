import { promises as fs } from 'fs';
import path from 'path';
import { ProjectState, DevelopmentFlowConfig, DevelopmentFlowError } from '../types/index.js';
import { ensureDir, readJsonFile, writeJsonFile, logger } from '../utils/index.js';

/**
 * State manager for development flow projects
 * 
 * Handles persistent storage and retrieval of project states, including
 * project data management, backup operations, and state indexing.
 * Provides a centralized interface for all project state operations.
 * 
 * Features:
 * - Project state persistence with JSON storage
 * - Automatic backup creation and management
 * - Project indexing for fast lookups
 * - State validation and cleanup
 * - Project statistics and filtering
 * - Backup restoration capabilities
 * 
 * @example
 * ```typescript
 * const stateManager = new StateManager(config);
 * await stateManager.saveProjectState(project);
 * const loadedProject = await stateManager.loadProjectState(projectId);
 * ```
 */
export class StateManager {
  /** Configuration object containing state management settings */
  private config: DevelopmentFlowConfig;
  
  /** Directory path where project states are stored */
  private stateDir: string;
  
  /** Index mapping project IDs to their file paths for fast lookups */
  private projectsIndex: Map<string, string> = new Map(); // projectId -> filePath

  /** Flag to track initialization status */
  private initialized: boolean = false;
  
  /** Promise to track initialization completion */
  private initPromise: Promise<void>;

  /**
   * Creates a new StateManager instance
   * 
   * Initializes the state manager with the provided configuration,
   * sets up the state directory, and loads the existing projects index.
   * 
   * @param config - Development flow configuration object
   * 
   * @example
   * ```typescript
   * const stateManager = new StateManager({
   *   projectsDir: '/path/to/projects',
   *   autoBackup: true,
   *   enableLogging: true
   * });
   * await stateManager.ensureInitialized();
   * ```
   */
  constructor(config: DevelopmentFlowConfig) {
    this.config = config;
    this.stateDir = path.join(config.projectsDir, 'states');
    this.initPromise = this.initializeStateManager();
  }
  
  /**
   * Ensures the state manager is properly initialized
   * 
   * @returns Promise that resolves when initialization is complete
   */
  public async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  /**
   * Initializes the state manager
   * 
   * Sets up the state directory structure and loads the existing
   * projects index. This method is called automatically during
   * construction and handles initial setup errors gracefully.
   * 
   * @throws {DevelopmentFlowError} When initialization fails
   */
  private async initializeStateManager(): Promise<void> {
    try {
      await ensureDir(this.stateDir);
      await this.loadProjectsIndex();
      this.initialized = true;
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
   * Loads the projects index from persistent storage
   * 
   * Reads the projects.json file containing the mapping of project IDs
   * to their file paths. If the index file doesn't exist, starts with
   * an empty index.
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
   * Saves the projects index to persistent storage
   * 
   * Writes the current projects index to the projects.json file,
   * ensuring the mapping between project IDs and file paths is
   * preserved across application restarts.
   */
  private async saveProjectsIndex(): Promise<void> {
    const indexPath = path.join(this.stateDir, 'projects.json');
    const index = Object.fromEntries(this.projectsIndex);
    await writeJsonFile(indexPath, index);
  }

  /**
   * Saves a project state to persistent storage
   * 
   * Persists the project state to a JSON file, creates a backup if enabled,
   * and updates the projects index. This is the primary method for storing
   * project data and ensuring it survives application restarts.
   * 
   * @param project - Project state to save
   * @throws {DevelopmentFlowError} When save operation fails
   * 
   * @example
   * ```typescript
   * await stateManager.saveProjectState({
   *   id: 'proj_123',
   *   name: 'My Project',
   *   phase: DevelopmentPhase.DESIGN,
   *   // ... other project properties
   * });
   * ```
   */
  public async saveProjectState(project: ProjectState): Promise<void> {
    await this.ensureInitialized();
    
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
   * Loads a project state from persistent storage
   * 
   * Retrieves the project state from storage using the project ID.
   * Returns null if the project doesn't exist or the state file is corrupted.
   * 
   * @param projectId - Unique identifier of the project to load
   * @returns Promise resolving to project state or null if not found
   * @throws {DevelopmentFlowError} When load operation fails
   * 
   * @example
   * ```typescript
   * const project = await stateManager.loadProjectState('proj_123');
   * if (project) {
   *   console.log(`Loaded project: ${project.name}`);
   * } else {
   *   console.log('Project not found');
   * }
   * ```
   */
  public async loadProjectState(projectId: string): Promise<ProjectState | null> {
    await this.ensureInitialized();
    
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
   * Deletes a project state from persistent storage
   * 
   * Removes the project state file and updates the projects index.
   * Creates a backup before deletion if auto-backup is enabled.
   * 
   * @param projectId - Unique identifier of the project to delete
   * @returns Promise resolving to true if deleted, false if not found
   * @throws {DevelopmentFlowError} When delete operation fails
   * 
   * @example
   * ```typescript
   * const deleted = await stateManager.deleteProjectState('proj_123');
   * if (deleted) {
   *   console.log('Project deleted successfully');
   * } else {
   *   console.log('Project not found');
   * }
   * ```
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
   * Checks if a project exists in storage
   * 
   * Verifies that a project with the given ID exists and its state file
   * is accessible. Automatically cleans up invalid index entries.
   * 
   * @param projectId - Unique identifier of the project to check
   * @returns Promise resolving to true if project exists, false otherwise
   * 
   * @example
   * ```typescript
   * const exists = await stateManager.projectExists('proj_123');
   * if (exists) {
   *   console.log('Project exists');
   * } else {
   *   console.log('Project not found');
   * }
   * ```
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
   * Retrieves all project states from storage
   * 
   * Loads and returns all projects currently stored in the state manager.
   * Projects are loaded from their individual state files based on the
   * projects index. Invalid or corrupted projects are automatically cleaned up.
   * 
   * @returns Promise resolving to array of all project states
   * @throws {DevelopmentFlowError} When loading projects fails
   * 
   * @example
   * ```typescript
   * const allProjects = await stateManager.getAllProjects();
   * console.log(`Found ${allProjects.length} projects`);
   * allProjects.forEach(project => {
   *   console.log(`- ${project.name} (${project.phase})`);
   * });
   * ```
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
   * Finds projects matching specified criteria
   * 
   * Searches through all projects and returns those that match the given
   * criteria. Uses partial matching against project properties.
   * 
   * @param filter - Partial project state object to match against
   * @returns Promise resolving to array of matching project states
   * @throws {DevelopmentFlowError} When search operation fails
   * 
   * @example
   * ```typescript
   * // Find all projects in design phase
   * const designProjects = await stateManager.findProjects({
   *   phase: DevelopmentPhase.DESIGN
   * });
   * 
   * // Find projects by name
   * const webProjects = await stateManager.findProjects({
   *   name: 'My Web Project'
   * });
   * ```
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
   * Retrieves comprehensive project statistics
   * 
   * Analyzes all projects and returns statistical information including
   * total count, distribution by phase, and recently updated projects.
   * 
   * @returns Promise resolving to project statistics object
   * @returns returns.total - Total number of projects
   * @returns returns.byPhase - Count of projects by development phase
   * @returns returns.recent - Array of 5 most recently updated projects
   * @throws {DevelopmentFlowError} When statistics calculation fails
   * 
   * @example
   * ```typescript
   * const stats = await stateManager.getProjectStats();
   * console.log(`Total projects: ${stats.total}`);
   * console.log(`Recent projects: ${stats.recent.length}`);
   * 
   * Object.entries(stats.byPhase).forEach(([phase, count]) => {
   *   console.log(`${phase}: ${count} projects`);
   * });
   * ```
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
   * Creates a backup of a project state
   * 
   * Saves a timestamped backup copy of the project state to the backups
   * directory. Backups are automatically cleaned up based on retention settings.
   * 
   * @param projectId - Unique identifier of the project to backup
   * @throws {DevelopmentFlowError} When backup creation fails
   * 
   * @example
   * ```typescript
   * // This is called automatically during save operations
   * await this.createBackup('proj_123');
   * ```
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
   * Cleans up old backup files for a specific project
   * 
   * Removes backup files older than the configured retention period.
   * This helps prevent unlimited disk usage from accumulated backups.
   * 
   * @param projectId - Unique identifier of the project to clean backups for
   * @throws {DevelopmentFlowError} When cleanup operation fails
   * 
   * @example
   * ```typescript
   * // This is called automatically during backup creation
   * await this.cleanupOldBackups('proj_123');
   * ```
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
   * Restores a project state from a backup
   * 
   * Loads a project state from a specific backup file and restores it
   * as the current state. If no timestamp is provided, restores from
   * the most recent backup.
   * 
   * @param projectId - Unique identifier of the project to restore
   * @param backupTimestamp - Optional timestamp of the backup to restore from
   * @returns Promise resolving to restored project state or null if backup not found
   * @throws {DevelopmentFlowError} When restore operation fails
   * 
   * @example
   * ```typescript
   * // Restore from latest backup
   * const restored = await stateManager.restoreProjectState('proj_123');
   * 
   * // Restore from specific backup
   * const restored = await stateManager.restoreProjectState(
   *   'proj_123',
   *   '2024-01-15T10-30-00-000Z'
   * );
   * ```
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
        
        backupFile = projectBackups[0]!;
      }
      
      const backupPath = path.join(backupDir, backupFile);
      const project = await readJsonFile<ProjectState>(backupPath);
      
      if (!project) {
        logger.warn(`Backup file corrupted: ${backupPath}`);
        return null;
      }
      
      // Restore project state
      await this.saveProjectState(project);
      
      logger.info(`Project state restored: ${projectId} from ${backupFile!}`);
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
   * Performs cleanup operations for the state manager
   * 
   * Verifies all indexed files exist and removes invalid entries.
   * Should be called periodically or during application shutdown
   * to maintain data integrity.
   * 
   * @throws {DevelopmentFlowError} When cleanup operations fail
   * 
   * @example
   * ```typescript
   * // Call during application shutdown
   * await stateManager.cleanup();
   * ```
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
   * Gets the state directory path
   * 
   * Returns the absolute path to the directory where project states
   * and related files are stored.
   * 
   * @returns Absolute path to the state directory
   * 
   * @example
   * ```typescript
   * const stateDir = stateManager.getStateDir();
   * console.log(`States stored in: ${stateDir}`);
   * ```
   */
  public getStateDir(): string {
    return this.stateDir;
  }

  /**
   * Gets the total number of projects
   * 
   * Returns the count of projects currently tracked in the projects index.
   * This is a synchronous operation that doesn't load project files.
   * 
   * @returns Number of projects in the index
   * 
   * @example
   * ```typescript
   * const count = stateManager.getProjectCount();
   * console.log(`Total projects: ${count}`);
   * ```
   */
  public getProjectCount(): number {
    return this.projectsIndex.size;
  }
}