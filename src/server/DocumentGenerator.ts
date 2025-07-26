import { promises as fs } from 'fs';
import path from 'path';
import { ProjectState, DevelopmentFlowConfig, DocumentTemplate } from '../types/index.js';
import { ensureDir, generateNumberedDir, sanitizeFileName, formatTimestamp, logger } from '../utils/index.js';

/**
 * Document generator for development flow projects
 * 
 * Handles the generation of various project documents including requirements,
 * design specifications, task lists, and completion reports. Uses a template-based
 * approach with variable substitution and conditional rendering.
 * 
 * Features:
 * - Pre-built templates for common document types
 * - Custom template support
 * - Variable substitution and conditional rendering
 * - Automatic file organization and directory management
 * - Markdown format output for easy viewing and editing
 * 
 * @example
 * ```typescript
 * const generator = new DocumentGenerator(config);
 * const filePath = await generator.generateRequirementDocument(project);
 * console.log(`Requirements document created at: ${filePath}`);
 * ```
 */
export class DocumentGenerator {
  /** Configuration object containing project settings and paths */
  private config: DevelopmentFlowConfig;
  
  /** Map of document templates indexed by template name */
  private templates: Map<string, DocumentTemplate> = new Map();

  /**
   * Creates a new DocumentGenerator instance
   * 
   * Initializes the document generator with the provided configuration
   * and sets up default templates for requirements, design, tasks, and
   * completion reports.
   * 
   * @param config - Development flow configuration object
   * 
   * @example
   * ```typescript
   * const generator = new DocumentGenerator({
   *   baseDir: '/path/to/project',
   *   projectsDir: '/path/to/projects',
   *   enableLogging: true
   * });
   * ```
   */
  constructor(config: DevelopmentFlowConfig) {
    this.config = config;
    this.initializeTemplates();
  }

  /**
   * Initializes default document templates
   * 
   * Sets up pre-built templates for:
   * - Requirements analysis document
   * - Technical design document
   * - Task list and todo document
   * - Project completion report
   * 
   * Each template includes variable placeholders, conditional blocks,
   * and formatting for professional document output.
   */
  private initializeTemplates(): void {
    // Requirement document template
    this.templates.set('requirement', {
      name: 'requirement',
      path: 'requirement.md',
      variables: ['projectName', 'description', 'requirements', 'functionalRequirements', 'technicalRequirements', 'acceptanceCriteria'],
      content: `# Requirements Analysis Document

## Project Overview
**Project Name**: {{projectName}}
**Creation Time**: {{createdAt}}
**Project Description**: {{description}}

## Core Requirements
{{#if requirements}}
{{#each requirements}}
- {{this}}
{{/each}}
{{/if}}

## Functional Requirements
{{#if functionalRequirements}}
{{#each functionalRequirements}}
- {{this}}
{{/each}}
{{/if}}

## Technical Requirements
{{#if technicalRequirements}}
{{#each technicalRequirements}}
- {{this}}
{{/each}}
{{/if}}

## Acceptance Criteria
{{#if acceptanceCriteria}}
{{#each acceptanceCriteria}}
- {{this}}
{{/each}}
{{/if}}

---
*Document generated at: {{timestamp}}*`
    });

    // Design document template
    this.templates.set('design', {
      name: 'design',
      path: 'design.md',
      variables: ['projectName', 'architecture', 'implementation', 'systemDesign', 'dataStructures', 'interfaces', 'deployment'],
      content: `# Technical Design Document

## Project Information
**Project Name**: {{projectName}}
**Design Time**: {{updatedAt}}

## Technical Architecture
{{#if architecture}}
{{architecture}}
{{/if}}

## Implementation Plan
{{#if implementation}}
{{implementation}}
{{/if}}

## System Design
{{#if systemDesign}}
{{systemDesign}}
{{/if}}

## Data Structures
{{#if dataStructures}}
{{dataStructures}}
{{/if}}

## Interface Design
{{#if interfaces}}
{{interfaces}}
{{/if}}

## Deployment Plan
{{#if deployment}}
{{deployment}}
{{/if}}

---
*Document generated at: {{timestamp}}*`
    });

    // Task list template
    this.templates.set('todo', {
      name: 'todo',
      path: 'todo.md',
      variables: ['projectName', 'tasks'],
      content: `# Task List

## Project Information
**Project Name**: {{projectName}}
**Task Generation Time**: {{updatedAt}}

## Pending Tasks
{{#if tasks}}
{{#each tasks}}
- [ ] **{{id}}**: {{title}}
  - Description: {{description}}
  - Priority: {{priority}}
  - Estimated Hours: {{estimatedHours}} hours
  {{#if dependencies}}
  - Dependencies: {{#each dependencies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
  {{/if}}
{{/each}}
{{else}}
No tasks available
{{/if}}

## Implementation Phases
1. **Preparation Phase**: Environment configuration and dependency installation
2. **Development Phase**: Core functionality implementation
3. **Testing Phase**: Functional testing and integration testing
4. **Deployment Phase**: Production environment deployment
5. **Acceptance Phase**: User acceptance and documentation organization

---
*Document generated at: {{timestamp}}*`
    });

    // Completion report template
    this.templates.set('done', {
      name: 'done',
      path: 'done.md',
      variables: ['projectName', 'completedTasks', 'tasks'],
      content: `# Project Completion Report

## Project Information
**Project Name**: {{projectName}}
**Completion Time**: {{updatedAt}}
**Project Cycle**: {{createdAt}} - {{updatedAt}}

## Completed Tasks
{{#if completedTasks}}
{{#each completedTasks}}
- [x] {{this}}
{{/each}}
{{else}}
No completed tasks
{{/if}}

## Task Statistics
- Total Tasks: {{#if tasks}}{{tasks.length}}{{else}}0{{/if}}
- Completed: {{#if completedTasks}}{{completedTasks.length}}{{else}}0{{/if}}
- Completion Rate: {{#if tasks}}{{#if completedTasks}}{{math completedTasks.length '/' tasks.length '*' 100}}%{{else}}0%{{/if}}{{else}}N/A{{/if}}

## Project Summary
Project "{{projectName}}" has successfully completed all predetermined objectives.

### Key Achievements
- Completed the full development workflow
- Generated standardized project documentation
- Implemented all core functionalities

### Lessons Learned
- Followed standard development processes
- Maintained good documentation practices
- Ensured code quality and maintainability

---
*Report generated at: {{timestamp}}*`
    });
  }

  /**
   * Generates a requirements analysis document
   * 
   * Creates a comprehensive requirements document based on the project state,
   * including project overview, core requirements, functional requirements,
   * technical requirements, and acceptance criteria.
   * 
   * @param project - Project state containing requirement information
   * @returns Promise resolving to the file path of the generated document
   * @throws {Error} When requirement template is not found or file operations fail
   * 
   * @example
   * ```typescript
   * const filePath = await generator.generateRequirementDocument(project);
   * console.log(`Requirements document created: ${filePath}`);
   * ```
   */
  public async generateRequirementDocument(project: ProjectState): Promise<string> {
    const template = this.templates.get('requirement');
    if (!template) {
      throw new Error('Requirement document template does not exist');
    }

    const content = this.renderTemplate(template, {
      ...project,
      timestamp: formatTimestamp()
    });

    const dirPath = await this.getProjectDir(project);
    const filePath = path.join(dirPath, template.path);
    
    await ensureDir(dirPath);
    await fs.writeFile(filePath, content, 'utf-8');
    
    logger.info(`Requirement document generated: ${filePath}`);
    return filePath;
  }

  /**
   * Generates a technical design document
   * 
   * Creates a detailed design document including technical architecture,
   * implementation plan, system design, data structures, interface design,
   * and deployment strategies.
   * 
   * @param project - Project state containing design information
   * @returns Promise resolving to the file path of the generated document
   * @throws {Error} When design template is not found or file operations fail
   * 
   * @example
   * ```typescript
   * const filePath = await generator.generateDesignDocument(project);
   * console.log(`Design document created: ${filePath}`);
   * ```
   */
  public async generateDesignDocument(project: ProjectState): Promise<string> {
    const template = this.templates.get('design');
    if (!template) {
      throw new Error('Design document template does not exist');
    }

    const content = this.renderTemplate(template, {
      ...project,
      timestamp: formatTimestamp()
    });

    const dirPath = await this.getProjectDir(project);
    const filePath = path.join(dirPath, template.path);
    
    await ensureDir(dirPath);
    await fs.writeFile(filePath, content, 'utf-8');
    
    logger.info(`Design document generated: ${filePath}`);
    return filePath;
  }

  /**
   * Generates a task list document
   * 
   * Creates a comprehensive todo list with task details including IDs,
   * descriptions, priorities, estimated hours, dependencies, and
   * implementation phases for project execution.
   * 
   * @param project - Project state containing task information
   * @returns Promise resolving to the file path of the generated document
   * @throws {Error} When todo template is not found or file operations fail
   * 
   * @example
   * ```typescript
   * const filePath = await generator.generateTodoDocument(project);
   * console.log(`Task list created: ${filePath}`);
   * ```
   */
  public async generateTodoDocument(project: ProjectState): Promise<string> {
    const template = this.templates.get('todo');
    if (!template) {
      throw new Error('Task document template does not exist');
    }

    const content = this.renderTemplate(template, {
      ...project,
      timestamp: formatTimestamp()
    });

    const dirPath = await this.getProjectDir(project);
    const filePath = path.join(dirPath, template.path);
    
    await ensureDir(dirPath);
    await fs.writeFile(filePath, content, 'utf-8');
    
    logger.info(`Task document generated: ${filePath}`);
    return filePath;
  }

  /**
   * Generates a project completion report
   * 
   * Creates a final report documenting project completion including
   * completed tasks, statistics, achievements, and lessons learned.
   * This serves as a project closure document.
   * 
   * @param project - Project state with completion information
   * @returns Promise resolving to the file path of the generated document
   * @throws {Error} When completion template is not found or file operations fail
   * 
   * @example
   * ```typescript
   * const filePath = await generator.generateDoneDocument(project);
   * console.log(`Completion report created: ${filePath}`);
   * ```
   */
  public async generateDoneDocument(project: ProjectState): Promise<string> {
    const template = this.templates.get('done');
    if (!template) {
      throw new Error('Completion report template does not exist');
    }

    const content = this.renderTemplate(template, {
      ...project,
      timestamp: formatTimestamp()
    });

    const dirPath = await this.getProjectDir(project);
    const filePath = path.join(dirPath, template.path);
    
    await ensureDir(dirPath);
    await fs.writeFile(filePath, content, 'utf-8');
    
    logger.info(`Completion report generated: ${filePath}`);
    return filePath;
  }

  /**
   * Gets the project directory path for document storage
   * 
   * Generates a sanitized directory path based on the project name
   * and ensures it follows the configured project directory structure.
   * 
   * @param project - Project state containing the project name
   * @returns Promise resolving to the absolute directory path
   * 
   * @example
   * ```typescript
   * const dirPath = await generator.getProjectDir(project);
   * // Returns: '/projects/my-project_20231201_001'
   * ```
   */
  private async getProjectDir(project: ProjectState): Promise<string> {
    const sanitizedName = sanitizeFileName(project.name);
    const dirName = generateNumberedDir(this.config.projectsDir, sanitizedName);
    return path.join(this.config.projectsDir, await dirName);
  }

  /**
   * Renders a document template with provided data
   * 
   * Processes template content by substituting variables, handling conditional
   * blocks, processing loops, and performing basic mathematical operations.
   * Supports Handlebars-like syntax for dynamic content generation.
   * 
   * Supported features:
   * - Variable substitution: {{variableName}}
   * - Conditional blocks: {{#if condition}}...{{/if}}
   * - Array iteration: {{#each array}}...{{/each}}
   * - Mathematical operations: {{math a '/' b '*' c}}
   * 
   * @param template - Document template with placeholders
   * @param data - Data object containing values for template variables
   * @returns Rendered template content as string
   * 
   * @example
   * ```typescript
   * const content = generator.renderTemplate(template, {
   *   projectName: 'My Project',
   *   tasks: ['Task 1', 'Task 2']
   * });
   * ```
   */
  private renderTemplate(template: DocumentTemplate, data: any): string {
    let content = template.content;
    
    // Simple template rendering (replace variables)
    content = content.replace(/\{\{(\w+)\}\}/g, (_match: string, key: string) => {
      return data[key] || '';
    });

    // Handle conditional statements {{#if variable}}
    content = content.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match: string, key: string, block: string) => {
      return data[key] ? block : '';
    });

    // Handle loop statements {{#each array}}
    content = content.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_match: string, key: string, block: string) => {
      const array = data[key];
      if (!Array.isArray(array)) return '';
      
      return array.map((item: any) => {
        let itemBlock = block;
        // Replace {{this}} with current item
        itemBlock = itemBlock.replace(/\{\{this\}\}/g, typeof item === 'string' ? item : JSON.stringify(item));
        // Replace object properties
        if (typeof item === 'object' && item !== null) {
          itemBlock = itemBlock.replace(/\{\{(\w+)\}\}/g, (_propMatch: string, propKey: string) => {
            return item[propKey] || '';
          });
        }
        return itemBlock;
      }).join('');
    });

    // Handle mathematical operations (simple implementation)
    content = content.replace(/\{\{math ([\d.]+) '([+\-*/])' ([\d.]+) '\*' ([\d.]+)\}\}/g, (_match: string, a: string, op: string, b: string, c: string) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      const numC = parseFloat(c);
      
      let result = 0;
      switch (op) {
        case '/':
          result = (numA / numB) * numC;
          break;
        default:
          result = 0;
      }
      
      return Math.round(result).toString();
    });

    return content;
  }

  /**
   * Adds a custom document template
   * 
   * Registers a new template that can be used for document generation.
   * Custom templates follow the same variable substitution and conditional
   * rendering rules as built-in templates.
   * 
   * @param template - Document template to add
   * 
   * @example
   * ```typescript
   * generator.addTemplate({
   *   name: 'custom-report',
   *   path: 'custom-report.md',
   *   variables: ['title', 'content'],
   *   content: '# {{title}}\n\n{{content}}'
   * });
   * ```
   */
  public addTemplate(template: DocumentTemplate): void {
    this.templates.set(template.name, template);
    logger.info(`Added custom template: ${template.name}`);
  }

  /**
   * Gets all available document templates
   * 
   * Returns an array of all registered templates including both
   * built-in and custom templates.
   * 
   * @returns Array of all available document templates
   * 
   * @example
   * ```typescript
   * const templates = generator.getTemplates();
   * console.log(`Available templates: ${templates.map(t => t.name).join(', ')}`);
   * ```
   */
  public getTemplates(): DocumentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Removes a document template by name
   * 
   * Unregisters a template from the generator. Built-in templates
   * can be removed, but this may affect standard document generation
   * functionality.
   * 
   * @param name - Name of the template to remove
   * @returns True if template was found and removed, false otherwise
   * 
   * @example
   * ```typescript
   * const removed = generator.removeTemplate('custom-report');
   * if (removed) {
   *   console.log('Template removed successfully');
   * }
   * ```
   */
  public removeTemplate(name: string): boolean {
    const result = this.templates.delete(name);
    if (result) {
      logger.info(`Removed template: ${name}`);
    }
    return result;
  }
}