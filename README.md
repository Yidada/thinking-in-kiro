# Thinking-in-Kiro

A powerful Model Context Protocol (MCP) server that implements a structured 10-step development workflow, designed to streamline project development with automated documentation generation and user confirmation mechanisms.

## Quick Start

```bash
# Run directly with npx (recommended)
npx thinking-in-kiro

# Or install globally
npm install -g thinking-in-kiro
thinking-in-kiro
```

Then configure your MCP client (Claude Desktop, VS Code, etc.) to use the server.

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development Flow](#development-flow)
- [Available Tools](#available-tools)
- [Example Usage](#example-usage)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Architecture](#architecture)
- [License](#license)

## Features

- ✅ Structured 10-step development process
- ✅ Automatic document generation (requirement.md, design.md, todo.md, done.md)
- ✅ User confirmation synchronization mechanism
- ✅ Task completion tracking with strikethrough
- ✅ Project organization with dated directories (.dev/YYYYMMDD_HHMM/)

## Installation

### Option 1: Using npx (Recommended)

```bash
# No installation needed, run directly
npx thinking-in-kiro
```

### Option 2: Global Installation

```bash
npm install -g thinking-in-kiro
thinking-in-kiro
```

### Option 3: Local Development

```bash
# Clone and build locally
git clone https://github.com/your-username/thinking-in-kiro.git
cd thinking-in-kiro
npm install
npm run build
node dist/index.js
```

## Configuration

### Claude Desktop

Add this to your `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "thinking-in-kiro": {
      "command": "npx",
      "args": ["-y", "thinking-in-kiro"]
    }
  }
}
```

### VS Code

Add this to your VS Code MCP settings:

```json
{
  "mcp": {
    "servers": {
      "thinking-in-kiro": {
        "command": "npx",
        "args": ["-y", "thinking-in-kiro"]
      }
    }
  }
}
```

### Environment Variables

- `DISABLE_FLOW_LOGGING=true` - Disable colored terminal output

## Development Flow

The server implements a 10-step structured development process:

1. **Initialize** - Create .dev directory with date/time ID
2. **Generate Requirements** - Create requirement.md 
3. **User Confirmation** - Wait for requirement approval
4. **Generate Design** - Create design.md based on requirements
5. **User Confirmation** - Wait for design approval  
6. **Generate Tasks** - Create todo.md with task breakdown
7. **User Confirmation** - Wait for task list approval
8. **Execute Tasks** - Complete tasks one by one
9. **Mark Completion** - Update todo.md with strikethrough
10. **Generate Report** - Create done.md completion report

## Available Tools

The server provides a unified `development_flow` tool that supports the following actions:

- `init` - Initialize development flow with project setup
- `requirement` - Generate requirements document with detailed analysis
- `confirmation` - Handle user confirmation for each phase
- `design` - Generate design document based on requirements
- `todo` - Generate task list with breakdown and priorities
- `task_complete` - Mark individual tasks as completed
- `finish` - Generate completion report and finalize project

## Example Usage

Here's a complete example of using the development flow:

### 1. Initialize Project
```
Call: development_flow
Input: { "action": "init", "projectName": "my-awesome-app" }
Result: Creates .dev/20250120_1430/ directory
```

### 2. Generate Requirements
```
Call: development_flow
Input: {
  "action": "requirement",
  "description": "A web application for task management",
  "requirements": ["User authentication", "Task CRUD operations", "Real-time updates"]
}
Result: Creates requirement.md
```

### 3. Confirm Requirements
```
Call: development_flow
Input: { "action": "confirmation", "phase": "requirement" }
Result: Returns confirmation request

Call: development_flow
Input: { "action": "confirmation", "phase": "requirement", "confirmed": true }
Result: Requirement phase confirmed
```

### 4. Continue through Design → Todo → Execution → Completion

Each phase follows the same pattern: generate → confirm → proceed.

## Project Structure

When you run a development flow, the following structure is created:

```
.dev/
└── 20250120_1430/          # Date_Time format
    ├── state.json          # Project state
    ├── requirement.md      # Requirements document
    ├── design.md          # Technical design
    ├── todo.md            # Task list with progress
    └── done.md            # Completion report
```

## Troubleshooting

### Server Won't Start
- Check Node.js version (requires Node 18+)
- Verify TypeScript compilation: `npm run build`
- Check for port conflicts

### Tools Not Appearing in Client
- Restart your MCP client (Claude Desktop/VS Code)
- Verify configuration file syntax
- Check MCP client logs

### Permission Errors
- Ensure write permissions in working directory
- Check if `.dev` directory can be created
- Verify file system permissions

## Development

```bash
# Install dependencies
npm install

# Development mode with auto-rebuild
npm run dev

# Build for production
npm run build

# Start built server
npm start

# Test the server
node test-server.js
```

## Architecture

This server is built with:
- **TypeScript** for type safety
- **@modelcontextprotocol/sdk** for MCP protocol
- **chalk** for colored terminal output
- **Single-file architecture** for simplicity

Inspired by the [sequential thinking MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking) architecture.

## License

MIT

---

*Built with reference to the sequential thinking MCP server architecture.*