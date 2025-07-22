#!/usr/bin/env node

import { DevelopmentFlowServer } from './server/DevelopmentFlowServer.js';
import { logger } from './utils/index.js';

/**
 * Main function - Start development flow MCP server
 */
async function main(): Promise<void> {
  try {
    // Create server instance
    const server = new DevelopmentFlowServer({
      baseDir: process.cwd(),
      enableLogging: true,
      logLevel: 'info',
      autoBackup: true
    });

    // Start server
    await server.start();

    logger.info('Development flow MCP server started successfully');
  } catch (error) {
    logger.error(`Server startup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Promise rejection: ${reason}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT signal, shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal, shutting down server...');
  process.exit(0);
});

// Start application
main().catch((error) => {
  logger.error(`Application startup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});