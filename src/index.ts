#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from "@modelcontextprotocol/sdk/types.js";
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';

// 核心接口定义
interface DevFlowState {
  currentPhase: 'init' | 'requirement' | 'design' | 'todo' | 'execution' | 'complete';
  projectId: string;
  devPath: string;
  userConfirmations: Record<string, boolean>;
  tasks: TaskItem[];
  createdAt: Date;
}

interface TaskItem {
  id: string;
  title: string;
  status: 'pending' | 'completed';
  description?: string;
}

// 主服务器类
class DevelopmentFlowServer {
  private state: DevFlowState | null = null;
  private disableLogging: boolean;

  constructor() {
    this.disableLogging = process.env.DISABLE_FLOW_LOGGING === 'true';
  }

  // 1. 初始化开发流程
  async initDevFlow(input: any) {
    const projectId = this.generateProjectId();
    const devPath = path.join(process.cwd(), '.dev', projectId);
    
    await fs.mkdir(devPath, { recursive: true });
    
    this.state = {
      currentPhase: 'init',
      projectId,
      devPath,
      userConfirmations: {},
      tasks: [],
      createdAt: new Date()
    };
    
    await this.saveState();
    this.log(`✅ 初始化项目: ${devPath}`);
    
    return this.formatResponse(`项目已初始化，路径: ${devPath}`);
  }

  // 2. 生成需求文档
  async generateRequirement(input: any) {
    if (!this.state) throw new Error('请先初始化项目');
    
    const content = this.generateRequirementMarkdown(input);
    const filePath = path.join(this.state.devPath, 'requirement.md');
    
    await fs.writeFile(filePath, content, 'utf8');
    this.state.currentPhase = 'requirement';
    await this.saveState();
    
    this.log(`📝 生成需求文档: requirement.md`);
    return this.formatResponse(`需求文档已生成: ${filePath}`);
  }

  // 3. 等待用户确认
  async waitUserConfirmation(input: any) {
    if (!this.state) throw new Error('请先初始化项目');
    
    const { phase, confirmed } = input;
    
    if (confirmed === undefined) {
      // 返回确认请求
      return this.formatResponse(
        `请确认 ${phase} 阶段的内容。确认后请调用此工具并设置 confirmed: true`,
        'USER_CONFIRMATION_REQUIRED'
      );
    }
    
    if (confirmed) {
      this.state.userConfirmations[phase] = true;
      await this.saveState();
      this.log(`✅ 用户确认: ${phase}`);
      return this.formatResponse(`${phase} 阶段已确认，可以继续下一步`);
    } else {
      return this.formatResponse(`${phase} 阶段未确认，请修改后重新提交`);
    }
  }

  // 4. 生成设计文档
  async generateDesign(input: any) {
    if (!this.isConfirmed('requirement')) {
      throw new Error('请先确认需求文档');
    }
    
    const content = this.generateDesignMarkdown(input);
    const filePath = path.join(this.state!.devPath, 'design.md');
    
    await fs.writeFile(filePath, content, 'utf8');
    this.state!.currentPhase = 'design';
    await this.saveState();
    
    this.log(`🎨 生成设计文档: design.md`);
    return this.formatResponse(`设计文档已生成: ${filePath}`);
  }

  // 5. 生成任务清单
  async generateTodo(input: any) {
    if (!this.isConfirmed('design')) {
      throw new Error('请先确认设计文档');
    }
    
    const tasks = this.generateTaskList(input);
    this.state!.tasks = tasks;
    
    const content = this.generateTodoMarkdown(tasks);
    const filePath = path.join(this.state!.devPath, 'todo.md');
    
    await fs.writeFile(filePath, content, 'utf8');
    this.state!.currentPhase = 'todo';
    await this.saveState();
    
    this.log(`📋 生成任务清单: todo.md`);
    return this.formatResponse(`任务清单已生成: ${filePath}`);
  }

  // 6. 标记任务完成
  async markTaskComplete(input: any) {
    if (!this.state) throw new Error('请先初始化项目');
    
    const { taskId } = input;
    const task = this.state.tasks.find(t => t.id === taskId);
    
    if (!task) throw new Error(`任务不存在: ${taskId}`);
    
    task.status = 'completed';
    await this.saveState();
    
    // 更新todo.md文档，添加删除线
    await this.updateTodoMarkdown();
    
    this.log(`✅ 任务完成: ${task.title}`);
    
    // 检查是否所有任务完成
    const allComplete = this.state.tasks.every(t => t.status === 'completed');
    if (allComplete) {
      this.state.currentPhase = 'execution';
      await this.saveState();
      return this.formatResponse(`任务 ${taskId} 已完成。所有任务已完成，可以生成完成报告。`);
    }
    
    return this.formatResponse(`任务 ${taskId} 已完成`);
  }

  // 7. 生成完成报告
  async generateCompletion() {
    if (!this.state || this.state.tasks.some(t => t.status !== 'completed')) {
      throw new Error('请先完成所有任务');
    }
    
    const content = this.generateCompletionMarkdown();
    const filePath = path.join(this.state.devPath, 'done.md');
    
    await fs.writeFile(filePath, content, 'utf8');
    this.state.currentPhase = 'complete';
    await this.saveState();
    
    this.log(`🎉 生成完成报告: done.md`);
    return this.formatResponse(`🎉 所有任务已完成！完成报告: ${filePath}`);
  }

  // 工具方法
  private generateProjectId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    
    // 生成时间序号
    const timeStr = now.getHours().toString().padStart(2, '0') + 
                   now.getMinutes().toString().padStart(2, '0');
    
    return `${dateStr}_${timeStr}`;
  }

  private async saveState() {
    if (!this.state) return;
    const statePath = path.join(this.state.devPath, 'state.json');
    await fs.writeFile(statePath, JSON.stringify(this.state, null, 2));
  }

  private async loadState(projectId: string): Promise<DevFlowState | null> {
    try {
      const devPath = path.join(process.cwd(), '.dev', projectId);
      const statePath = path.join(devPath, 'state.json');
      const content = await fs.readFile(statePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  private isConfirmed(phase: string): boolean {
    return this.state?.userConfirmations[phase] === true;
  }

  private formatResponse(text: string, type?: string) {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ message: text, type }, null, 2)
      }]
    };
  }

  private log(message: string) {
    if (!this.disableLogging) {
      console.error(chalk.blue('🔄'), message);
    }
  }

  // 文档生成方法
  private generateRequirementMarkdown(input: any): string {
    const title = input.projectName || '项目需求';
    const description = input.description || '';
    const requirements = input.requirements || [];
    
    return `# ${title}

## 项目概述
${description}

## 核心需求
${requirements.map((r: string) => `- ${r}`).join('\n')}

## 功能需求
${input.functionalRequirements?.map((r: string) => `- ${r}`).join('\n') || '待补充'}

## 技术需求
${input.technicalRequirements?.map((r: string) => `- ${r}`).join('\n') || '待补充'}

## 验收标准
${input.acceptanceCriteria?.map((r: string) => `- ${r}`).join('\n') || '待补充'}

---
*生成时间: ${new Date().toLocaleString()}*
`;
  }

  private generateDesignMarkdown(input: any): string {
    const architecture = input.architecture || '';
    const implementation = input.implementation || '';
    
    return `# 技术设计文档

## 技术架构
${architecture}

## 实现方案
${implementation}

## 系统设计
${input.systemDesign || '待补充'}

## 数据结构
${input.dataStructures || '待补充'}

## 接口设计
${input.interfaces || '待补充'}

## 部署方案
${input.deployment || '待补充'}

---
*生成时间: ${new Date().toLocaleString()}*
`;
  }

  private generateTaskList(input: any): TaskItem[] {
    const tasks = input.tasks || [];
    return tasks.map((task: any, index: number) => ({
      id: `task_${(index + 1).toString().padStart(3, '0')}`,
      title: typeof task === 'string' ? task : task.title,
      status: 'pending' as const,
      description: typeof task === 'object' ? task.description : undefined
    }));
  }

  private generateTodoMarkdown(tasks: TaskItem[]): string {
    const taskList = tasks.map(task => 
      `- [ ] **${task.id}**: ${task.title}${task.description ? `\n  ${task.description}` : ''}`
    ).join('\n\n');
    
    return `# 任务清单

## 待办任务

${taskList}

## 统计信息
- **总任务数**: ${tasks.length}
- **待完成**: ${tasks.filter(t => t.status === 'pending').length}
- **已完成**: ${tasks.filter(t => t.status === 'completed').length}

---
*生成时间: ${new Date().toLocaleString()}*
`;
  }

  private async updateTodoMarkdown() {
    if (!this.state) return;
    
    const tasks = this.state.tasks;
    const taskList = tasks.map(task => {
      const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
      const title = task.status === 'completed' ? `~~${task.title}~~` : task.title;
      return `- ${checkbox} **${task.id}**: ${title}${task.description ? `\n  ${task.description}` : ''}`;
    }).join('\n\n');
    
    const content = `# 任务清单

## 任务列表

${taskList}

## 统计信息
- **总任务数**: ${tasks.length}
- **待完成**: ${tasks.filter(t => t.status === 'pending').length}
- **已完成**: ${tasks.filter(t => t.status === 'completed').length}

---
*更新时间: ${new Date().toLocaleString()}*
`;
    
    const filePath = path.join(this.state.devPath, 'todo.md');
    await fs.writeFile(filePath, content, 'utf8');
  }

  private generateCompletionMarkdown(): string {
    const completedTasks = this.state!.tasks.filter(t => t.status === 'completed');
    const taskList = completedTasks.map(task => `- ✅ ${task.title}`).join('\n');
    
    const duration = this.state!.createdAt ? 
      Math.round((Date.now() - this.state!.createdAt.getTime()) / (1000 * 60)) : 0;
    
    return `# 项目完成报告

## 项目信息
- **项目ID**: ${this.state!.projectId}
- **开始时间**: ${this.state!.createdAt.toLocaleString()}
- **完成时间**: ${new Date().toLocaleString()}
- **总耗时**: ${duration} 分钟

## 已完成任务
${taskList}

## 项目总结
🎉 项目已成功完成！所有计划任务均已按时完成。

## 成果产出
- ✅ 需求文档 (requirement.md)
- ✅ 设计文档 (design.md)  
- ✅ 任务清单 (todo.md)
- ✅ 完成报告 (done.md)

## 下一步计划
根据项目需要制定后续优化和维护计划。

---
*生成时间: ${new Date().toLocaleString()}*
`;
  }
}

// MCP工具定义 - 将在任务3中完整实现
const TOOLS: Tool[] = [
  {
    name: "init_dev_flow",
    description: "初始化开发流程，创建.dev目录",
    inputSchema: {
      type: "object",
      properties: {
        projectName: { type: "string", description: "项目名称" }
      },
      required: ["projectName"]
    }
  },
  {
    name: "generate_requirement", 
    description: "生成需求文档",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "项目描述" },
        requirements: { type: "array", items: { type: "string" }, description: "需求列表" }
      },
      required: ["description"]
    }
  },
  {
    name: "wait_user_confirmation",
    description: "等待用户确认",
    inputSchema: {
      type: "object", 
      properties: {
        phase: { type: "string", description: "确认阶段" },
        confirmed: { type: "boolean", description: "是否确认" }
      },
      required: ["phase"]
    }
  },
  {
    name: "generate_design",
    description: "生成设计文档", 
    inputSchema: {
      type: "object",
      properties: {
        architecture: { type: "string", description: "技术架构" },
        implementation: { type: "string", description: "实现方案" }
      },
      required: ["architecture"]
    }
  },
  {
    name: "generate_todo",
    description: "生成任务清单",
    inputSchema: {
      type: "object",
      properties: {
        tasks: { type: "array", items: { type: "object" }, description: "任务列表" }
      },
      required: ["tasks"]
    }
  },
  {
    name: "mark_task_complete",
    description: "标记任务完成",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "任务ID" }
      },
      required: ["taskId"]
    }
  },
  {
    name: "generate_completion",
    description: "生成完成报告",
    inputSchema: { type: "object", properties: {} }
  }
];

// MCP服务器设置
const server = new Server(
  { name: "thinking-in-kiro", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const flowServer = new DevelopmentFlowServer();

// 工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}));

// 工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case "init_dev_flow":
        return await flowServer.initDevFlow(args);
        
      case "generate_requirement":
        return await flowServer.generateRequirement(args);
        
      case "wait_user_confirmation":
        return await flowServer.waitUserConfirmation(args);
        
      case "generate_design":
        return await flowServer.generateDesign(args);
        
      case "generate_todo":
        return await flowServer.generateTodo(args);
        
      case "mark_task_complete":
        return await flowServer.markTaskComplete(args);
        
      case "generate_completion":
        return await flowServer.generateCompletion();
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ 
          error: errorMessage, 
          type: 'TOOL_ERROR',
          timestamp: new Date().toISOString()
        }, null, 2)
      }],
      isError: true
    };
  }
});

// 启动服务器
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(chalk.green("🚀 Thinking-in-Kiro MCP Server running on stdio"));
  console.error(chalk.blue("📋 Available tools:"), TOOLS.map(t => t.name).join(', '));
}

// 运行服务器
runServer().catch((error) => {
  console.error(chalk.red("Fatal error running server:"), error);
  process.exit(1);
}); 