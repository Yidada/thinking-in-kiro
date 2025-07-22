import { promises as fs } from 'fs';
import path from 'path';
import { ProjectState, DevelopmentFlowConfig, DocumentTemplate } from '../types/index.js';
import { ensureDir, generateNumberedDir, sanitizeFileName, formatTimestamp, logger } from '../utils/index.js';

/**
 * Document generator
 */
export class DocumentGenerator {
  private config: DevelopmentFlowConfig;
  private templates: Map<string, DocumentTemplate> = new Map();

  constructor(config: DevelopmentFlowConfig) {
    this.config = config;
    this.initializeTemplates();
  }

  /**
   * Initialize document templates
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
   * Generate requirement document
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
   * Generate design document
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
   * Generate task document
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
   * Generate completion report
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
   * Get project directory
   */
  private async getProjectDir(project: ProjectState): Promise<string> {
    const sanitizedName = sanitizeFileName(project.name);
    const dirName = generateNumberedDir(this.config.projectsDir, sanitizedName);
    return path.join(this.config.projectsDir, dirName);
  }

  /**
   * Render template
   */
  private renderTemplate(template: DocumentTemplate, data: any): string {
    let content = template.content;
    
    // Simple template rendering (replace variables)
    content = content.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
      return data[key] || '';
    });

    // Handle conditional statements {{#if variable}}
    content = content.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match: string, key: string, block: string) => {
      return data[key] ? block : '';
    });

    // Handle loop statements {{#each array}}
    content = content.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match: string, key: string, block: string) => {
      const array = data[key];
      if (!Array.isArray(array)) return '';
      
      return array.map((item: any) => {
        let itemBlock = block;
        // Replace {{this}} with current item
        itemBlock = itemBlock.replace(/\{\{this\}\}/g, typeof item === 'string' ? item : JSON.stringify(item));
        // Replace object properties
        if (typeof item === 'object' && item !== null) {
          itemBlock = itemBlock.replace(/\{\{(\w+)\}\}/g, (propMatch: string, propKey: string) => {
            return item[propKey] || '';
          });
        }
        return itemBlock;
      }).join('');
    });

    // Handle mathematical operations (simple implementation)
    content = content.replace(/\{\{math ([\d.]+) '([+\-*/])' ([\d.]+) '\*' ([\d.]+)\}\}/g, (match: string, a: string, op: string, b: string, c: string) => {
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
   * Add custom template
   */
  public addTemplate(template: DocumentTemplate): void {
    this.templates.set(template.name, template);
    logger.info(`Added custom template: ${template.name}`);
  }

  /**
   * Get all templates
   */
  public getTemplates(): DocumentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Remove template
   */
  public removeTemplate(name: string): boolean {
    const result = this.templates.delete(name);
    if (result) {
      logger.info(`Removed template: ${name}`);
    }
    return result;
  }
}