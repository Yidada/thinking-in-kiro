#!/usr/bin/env node

/**
 * @fileoverview Main entry point for the Development Flow MCP Server
 * 
 * This module initializes and starts the Development Flow MCP (Model Context Protocol) server,
 * which provides structured development workflow management through phases like initialization,
 * requirements analysis, design, task management, and project completion.
 * 
 * The server runs as a standalone Node.js application and communicates with MCP clients
 * to facilitate organized software development processes.
 * 
 * @author Development Flow Team
 * @version 1.0.0
 */

import { DevelopmentFlowServer } from './server/DevelopmentFlowServer.js';
import { logger } from './utils/index.js';
import path from 'path';

/**
 * Main application entry point
 * 
 * Initializes and starts the Development Flow MCP server with default configuration.
 * Sets up error handling, logging, and graceful shutdown procedures. The server
 * will listen for MCP client connections and handle development flow operations.
 * 
 * Configuration includes:
 * - Base directory set to current working directory
 * - Logging enabled with 'info' level
 * - Automatic backup enabled for project data
 * 
 * @throws {Error} When server initialization or startup fails
 * 
 * @example
 * ```bash
 * # Start the server
 * npm start
 * # or
 * node dist/index.js
 * ```
 */
async function main(): Promise<void> {
  try {
    // Create server instance with production configuration
    const server = new DevelopmentFlowServer({
      baseDir: process.cwd(),        // Use current working directory as base
      projectsDir: process.env.PROJECTS_DIR || path.join('/tmp', '.dev'), // Projects directory
      enableLogging: true,           // Enable comprehensive logging
      logLevel: 'info',             // Set appropriate log level for production
      autoBackup: true              // Enable automatic project backups
    });

    // Initialize and start the MCP server
    await server.start();

    logger.info('Development flow MCP server started successfully');
  } catch (error) {
    logger.error(`Server startup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Global error handling for unhandled exceptions and promise rejections
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  logger.error(`Stack trace: ${error.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Promise rejection: ${reason}`);
  process.exit(1);
});

// Graceful shutdown handlers for clean server termination
process.on('SIGINT', () => {
  logger.info('Received SIGINT signal (Ctrl+C), initiating graceful shutdown...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal, initiating graceful shutdown...');
  process.exit(0);
});

// Bootstrap the application with error handling
main().catch((error) => {
  logger.error(`Application startup failed: ${error instanceof Error ? error.message : String(error)}`);
  if (error instanceof Error && error.stack) {
    logger.error(`Stack trace: ${error.stack}`);
  }
  process.exit(1);
});