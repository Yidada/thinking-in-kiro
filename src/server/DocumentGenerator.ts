import { promises as fs } from 'fs';
import path from 'path';
import { ProjectState, DevelopmentFlowConfig, DocumentTemplate } from '../types/index.js';
import { ensureDir, generateNumberedDir, sanitizeFileName, formatTimestamp, logger } from '../utils/index.js';

/**
 * 文档生成器
 */
export class DocumentGenerator {
  private config: DevelopmentFlowConfig;
  private templates: Map<string, DocumentTemplate> = new Map();

  constructor(config: DevelopmentFlowConfig) {
    this.config = config;
    this.initializeTemplates();
  }

  /**
   * 初始化文档模板
   */
  private initializeTemplates(): void {
    // 需求文档模板
    this.templates.set('requirement', {
      name: 'requirement',
      path: 'requirement.md',
      variables: ['projectName', 'description', 'requirements', 'functionalRequirements', 'technicalRequirements', 'acceptanceCriteria'],
      content: `# 需求分析文档

## 项目概述
**项目名称**: {{projectName}}
**创建时间**: {{createdAt}}
**项目描述**: {{description}}

## 核心需求
{{#if requirements}}
{{#each requirements}}
- {{this}}
{{/each}}
{{/if}}

## 功能需求
{{#if functionalRequirements}}
{{#each functionalRequirements}}
- {{this}}
{{/each}}
{{/if}}

## 技术需求
{{#if technicalRequirements}}
{{#each technicalRequirements}}
- {{this}}
{{/each}}
{{/if}}

## 验收标准
{{#if acceptanceCriteria}}
{{#each acceptanceCriteria}}
- {{this}}
{{/each}}
{{/if}}

---
*文档生成时间: {{timestamp}}*`
    });

    // 设计文档模板
    this.templates.set('design', {
      name: 'design',
      path: 'design.md',
      variables: ['projectName', 'architecture', 'implementation', 'systemDesign', 'dataStructures', 'interfaces', 'deployment'],
      content: `# 技术设计文档

## 项目信息
**项目名称**: {{projectName}}
**设计时间**: {{updatedAt}}

## 技术架构
{{#if architecture}}
{{architecture}}
{{/if}}

## 实现方案
{{#if implementation}}
{{implementation}}
{{/if}}

## 系统设计
{{#if systemDesign}}
{{systemDesign}}
{{/if}}

## 数据结构
{{#if dataStructures}}
{{dataStructures}}
{{/if}}

## 接口设计
{{#if interfaces}}
{{interfaces}}
{{/if}}

## 部署方案
{{#if deployment}}
{{deployment}}
{{/if}}

---
*文档生成时间: {{timestamp}}*`
    });

    // 任务清单模板
    this.templates.set('todo', {
      name: 'todo',
      path: 'todo.md',
      variables: ['projectName', 'tasks'],
      content: `# 任务清单

## 项目信息
**项目名称**: {{projectName}}
**任务生成时间**: {{updatedAt}}

## 待执行任务
{{#if tasks}}
{{#each tasks}}
- [ ] **{{id}}**: {{title}}
  - 描述: {{description}}
  - 优先级: {{priority}}
  - 预估工时: {{estimatedHours}}小时
  {{#if dependencies}}
  - 依赖: {{#each dependencies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
  {{/if}}
{{/each}}
{{else}}
暂无任务
{{/if}}

## 实施阶段
1. **准备阶段**: 环境配置和依赖安装
2. **开发阶段**: 核心功能实现
3. **测试阶段**: 功能测试和集成测试
4. **部署阶段**: 生产环境部署
5. **验收阶段**: 用户验收和文档整理

---
*文档生成时间: {{timestamp}}*`
    });

    // 完成报告模板
    this.templates.set('done', {
      name: 'done',
      path: 'done.md',
      variables: ['projectName', 'completedTasks', 'tasks'],
      content: `# 项目完成报告

## 项目信息
**项目名称**: {{projectName}}
**完成时间**: {{updatedAt}}
**项目周期**: {{createdAt}} - {{updatedAt}}

## 已完成任务
{{#if completedTasks}}
{{#each completedTasks}}
- [x] {{this}}
{{/each}}
{{else}}
暂无已完成任务
{{/if}}

## 任务统计
- 总任务数: {{#if tasks}}{{tasks.length}}{{else}}0{{/if}}
- 已完成: {{#if completedTasks}}{{completedTasks.length}}{{else}}0{{/if}}
- 完成率: {{#if tasks}}{{#if completedTasks}}{{math completedTasks.length '/' tasks.length '*' 100}}%{{else}}0%{{/if}}{{else}}N/A{{/if}}

## 项目总结
项目 "{{projectName}}" 已成功完成所有预定目标。

### 主要成果
- 完成了完整的开发流程
- 生成了规范的项目文档
- 实现了所有核心功能

### 经验总结
- 遵循了标准的开发流程
- 保持了良好的文档记录
- 确保了代码质量和可维护性

---
*报告生成时间: {{timestamp}}*`
    });
  }

  /**
   * 生成需求文档
   */
  public async generateRequirementDocument(project: ProjectState): Promise<string> {
    const template = this.templates.get('requirement');
    if (!template) {
      throw new Error('需求文档模板不存在');
    }

    const content = this.renderTemplate(template, {
      ...project,
      timestamp: formatTimestamp()
    });

    const dirPath = await this.getProjectDir(project);
    const filePath = path.join(dirPath, template.path);
    
    await ensureDir(dirPath);
    await fs.writeFile(filePath, content, 'utf-8');
    
    logger.info(`需求文档已生成: ${filePath}`);
    return filePath;
  }

  /**
   * 生成设计文档
   */
  public async generateDesignDocument(project: ProjectState): Promise<string> {
    const template = this.templates.get('design');
    if (!template) {
      throw new Error('设计文档模板不存在');
    }

    const content = this.renderTemplate(template, {
      ...project,
      timestamp: formatTimestamp()
    });

    const dirPath = await this.getProjectDir(project);
    const filePath = path.join(dirPath, template.path);
    
    await ensureDir(dirPath);
    await fs.writeFile(filePath, content, 'utf-8');
    
    logger.info(`设计文档已生成: ${filePath}`);
    return filePath;
  }

  /**
   * 生成任务文档
   */
  public async generateTodoDocument(project: ProjectState): Promise<string> {
    const template = this.templates.get('todo');
    if (!template) {
      throw new Error('任务文档模板不存在');
    }

    const content = this.renderTemplate(template, {
      ...project,
      timestamp: formatTimestamp()
    });

    const dirPath = await this.getProjectDir(project);
    const filePath = path.join(dirPath, template.path);
    
    await ensureDir(dirPath);
    await fs.writeFile(filePath, content, 'utf-8');
    
    logger.info(`任务文档已生成: ${filePath}`);
    return filePath;
  }

  /**
   * 生成完成报告
   */
  public async generateDoneDocument(project: ProjectState): Promise<string> {
    const template = this.templates.get('done');
    if (!template) {
      throw new Error('完成报告模板不存在');
    }

    const content = this.renderTemplate(template, {
      ...project,
      timestamp: formatTimestamp()
    });

    const dirPath = await this.getProjectDir(project);
    const filePath = path.join(dirPath, template.path);
    
    await ensureDir(dirPath);
    await fs.writeFile(filePath, content, 'utf-8');
    
    logger.info(`完成报告已生成: ${filePath}`);
    return filePath;
  }

  /**
   * 获取项目目录
   */
  private async getProjectDir(project: ProjectState): Promise<string> {
    const sanitizedName = sanitizeFileName(project.name);
    const dirName = generateNumberedDir(this.config.projectsDir, sanitizedName);
    return path.join(this.config.projectsDir, dirName);
  }

  /**
   * 渲染模板
   */
  private renderTemplate(template: DocumentTemplate, data: any): string {
    let content = template.content;
    
    // 简单的模板渲染（替换变量）
    content = content.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
      return data[key] || '';
    });

    // 处理条件语句 {{#if variable}}
    content = content.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match: string, key: string, block: string) => {
      return data[key] ? block : '';
    });

    // 处理循环语句 {{#each array}}
    content = content.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match: string, key: string, block: string) => {
      const array = data[key];
      if (!Array.isArray(array)) return '';
      
      return array.map((item: any) => {
        let itemBlock = block;
        // 替换 {{this}} 为当前项
        itemBlock = itemBlock.replace(/\{\{this\}\}/g, typeof item === 'string' ? item : JSON.stringify(item));
        // 替换对象属性
        if (typeof item === 'object' && item !== null) {
          itemBlock = itemBlock.replace(/\{\{(\w+)\}\}/g, (propMatch: string, propKey: string) => {
            return item[propKey] || '';
          });
        }
        return itemBlock;
      }).join('');
    });

    // 处理数学运算（简单实现）
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
   * 添加自定义模板
   */
  public addTemplate(template: DocumentTemplate): void {
    this.templates.set(template.name, template);
    logger.info(`添加自定义模板: ${template.name}`);
  }

  /**
   * 获取所有模板
   */
  public getTemplates(): DocumentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * 删除模板
   */
  public removeTemplate(name: string): boolean {
    const result = this.templates.delete(name);
    if (result) {
      logger.info(`删除模板: ${name}`);
    }
    return result;
  }
}