#!/usr/bin/env node

import { DevelopmentFlowServer } from './server/DevelopmentFlowServer.js';
import { logger } from './utils/index.js';

/**
 * 主函数 - 启动开发流程MCP服务器
 */
async function main(): Promise<void> {
  try {
    // 创建服务器实例
    const server = new DevelopmentFlowServer({
      baseDir: process.cwd(),
      enableLogging: true,
      logLevel: 'info',
      autoBackup: true
    });

    // 启动服务器
    await server.start();
    
    logger.info('开发流程MCP服务器启动成功');
  } catch (error) {
    logger.error(`服务器启动失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error(`未捕获的异常: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`未处理的Promise拒绝: ${reason}`);
  process.exit(1);
});

// 优雅关闭
process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

// 启动应用
main().catch((error) => {
  logger.error(`应用启动失败: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});