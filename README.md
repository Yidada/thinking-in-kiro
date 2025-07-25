# Thinking in Kiro - Development Flow MCP Server

[![npm version](https://badge.fury.io/js/@stirstir%2Fthinking-in-kiro.svg)](https://badge.fury.io/js/@stirstir%2Fthinking-in-kiro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive development flow management system built on the Model Context Protocol (MCP) that provides structured project lifecycle management, from initial requirements gathering to final completion.

## Overview

Thinking in Kiro is an intelligent development flow server that guides projects through a systematic development process. It provides tools for requirement analysis, design documentation, task management, and project completion tracking, all while maintaining persistent state and generating comprehensive documentation.

## Features

### 🔄 **Structured Development Flow**
- **8-Phase Development Process**: From initialization to completion
- **State Persistence**: Automatic project state saving and restoration
- **Phase Validation**: Ensures proper progression through development stages
- **Rollback Support**: Ability to restore from backups

### 📋 **Project Management**
- **Requirement Analysis**: Structured requirement gathering and validation
- **Design Documentation**: Technical architecture and implementation planning
- **Task Breakdown**: Automatic task generation from design specifications
- **Progress Tracking**: Real-time project status and completion monitoring

### 📄 **Document Generation**
- **Template System**: Customizable document templates
- **Auto-generation**: Requirements, design, todo, and completion documents
- **Variable Substitution**: Dynamic content based on project state
- **Conditional Logic**: Smart template rendering with loops and conditions

### 🔍 **Advanced Features**
- **Project Search**: Find projects by criteria (phase, name, date)
- **Statistics**: Comprehensive project analytics
- **Backup System**: Automatic state backups with retention policies
- **Logging**: Detailed operation logging with multiple levels
- **Type Safety**: Full TypeScript implementation with comprehensive types

## Architecture

### Core Components

#### **DevelopmentFlowServer**
The main MCP server that handles all development flow operations:
- Manages the 8-phase development workflow
- Handles client requests and responses
- Coordinates between StateManager and DocumentGenerator
- Provides comprehensive error handling and validation

#### **StateManager**
Persistent state management for projects:
- JSON-based project storage
- Automatic backup creation and cleanup
- Project indexing and search capabilities
- Data integrity validation

#### **DocumentGenerator**
Template-based document generation system:
- Customizable templates for each development phase
- Variable substitution and conditional rendering
- Support for loops, conditions, and mathematical operations
- Automatic file generation and organization

### Development Phases

1. **INIT** - Project initialization and setup
2. **REQUIREMENT** - Requirements gathering and analysis
3. **CONFIRMATION** - User confirmation of requirements
4. **DESIGN** - Technical design and architecture
5. **TODO** - Task breakdown and planning
6. **TASK_COMPLETE** - Individual task completion
7. **STATUS** - Project status monitoring
8. **FINISH** - Project completion and documentation

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd thinking-in-kiro

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## Usage

### Starting the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Custom configuration
BASE_DIR=/custom/path npm start
```

### MCP Client Integration

The server exposes the following MCP tools:

#### **development_flow**
Main tool for managing development workflow:

```typescript
// Initialize a new project
const result = await client.callTool('development_flow', {
  action: 'init',
  projectName: 'My New Project',
  description: 'A sample project for demonstration'
});

// Add requirements
const reqResult = await client.callTool('development_flow', {
  action: 'requirement',
  projectName: 'My New Project',
  requirements: [
    'User authentication system',
    'Data persistence layer',
    'RESTful API endpoints'
  ]
});

// Generate design documentation
const designResult = await client.callTool('development_flow', {
  action: 'design',
  projectName: 'My New Project'
});
```

### Project Lifecycle Example

```typescript
// 1. Initialize project
await client.callTool('development_flow', {
  action: 'init',
  projectName: 'E-commerce Platform',
  description: 'Modern e-commerce solution with React and Node.js'
});

// 2. Define requirements
await client.callTool('development_flow', {
  action: 'requirement',
  projectName: 'E-commerce Platform',
  requirements: [
    'User registration and authentication',
    'Product catalog management',
    'Shopping cart functionality',
    'Payment processing integration',
    'Order management system'
  ],
  functionalRequirements: [
    'Users can browse products by category',
    'Users can add items to cart',
    'Users can checkout and pay securely'
  ],
  technicalRequirements: [
    'React frontend with TypeScript',
    'Node.js backend with Express',
    'PostgreSQL database',
    'Stripe payment integration'
  ]
});

// 3. Confirm requirements
await client.callTool('development_flow', {
  action: 'confirmation',
  projectName: 'E-commerce Platform',
  confirmed: true
});

// 4. Generate design
await client.callTool('development_flow', {
  action: 'design',
  projectName: 'E-commerce Platform'
});

// 5. Create task list
await client.callTool('development_flow', {
  action: 'todo',
  projectName: 'E-commerce Platform'
});

// 6. Complete tasks
await client.callTool('development_flow', {
  action: 'task_complete',
  projectName: 'E-commerce Platform',
  taskId: 'task_001'
});

// 7. Check status
await client.callTool('development_flow', {
  action: 'status',
  projectName: 'E-commerce Platform'
});

// 8. Finish project
await client.callTool('development_flow', {
  action: 'finish',
  projectName: 'E-commerce Platform'
});
```

## Configuration

### Environment Variables

```bash
# Base directory for all operations (default: current directory)
BASE_DIR=/path/to/projects

# Enable debug logging
DEBUG=true

# Custom templates directory
TEMPLATES_DIR=/path/to/templates

# Maximum number of projects to maintain
MAX_PROJECTS=100

# Enable automatic backups
AUTO_BACKUP=true
```

### Custom Templates

Create custom document templates in the templates directory:

```markdown
<!-- templates/custom-requirement.md -->
# {{projectName}} - Requirements

## Project Description
{{description}}

## Requirements
{{#each requirements}}
- {{this}}
{{/each}}

## Functional Requirements
{{#each functionalRequirements}}
- {{this}}
{{/each}}

## Technical Requirements
{{#each technicalRequirements}}
- {{this}}
{{/each}}
```

## API Reference

### DevelopmentFlowInput Interface

```typescript
interface DevelopmentFlowInput {
  action: DevelopmentPhase;
  projectName?: string;
  description?: string;
  requirements?: string[];
  functionalRequirements?: string[];
  technicalRequirements?: string[];
  acceptanceCriteria?: string[];
  confirmed?: boolean;
  taskId?: string;
  force?: boolean;
}
```

### DevelopmentFlowResult Interface

```typescript
interface DevelopmentFlowResult {
  success: boolean;
  message: string;
  data?: any;
  projectId?: string;
  phase?: DevelopmentPhase;
  nextSteps?: string[];
  generatedFiles?: string[];
}
```

## File Structure

```
thinking-in-kiro/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── server/
│   │   ├── DevelopmentFlowServer.ts  # Core MCP server
│   │   ├── StateManager.ts           # State persistence
│   │   └── DocumentGenerator.ts      # Document generation
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   └── utils/
│       └── index.ts             # Utility functions
├── templates/                   # Document templates
├── .dev/                       # Development process files
├── states/                     # Project state storage
└── projects/                   # Generated project files
```

## Development

### Building

```bash
# Build TypeScript
npm run build

# Watch mode for development
npm run dev

# Type checking
npm run type-check
```

### Testing

```bash
# Run tests
npm test

# Test with coverage
npm run test:coverage

# Integration tests
npm run test:integration
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions, issues, or contributions, please:
- Open an issue on GitHub
- Check the documentation
- Review existing issues and discussions

---

**Thinking in Kiro** - Structured development flow management for modern software projects.

## Table of Contents

- [For Users](#for-users)
  - [Prerequisites](#prerequisites)
  - [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Usage Examples](#usage-examples)
  - [Troubleshooting](#troubleshooting)
  - [FAQ](#faq)
- [For Contributors](#for-contributors)
  - [Development Setup](#development-setup)
  - [Project Architecture](#project-architecture)
  - [Contributing Guidelines](#contributing-guidelines)
  - [Code Style](#code-style)
  - [Testing](#testing)
  - [Release Process](#release-process)
- [License](#license)

## For Users

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher (comes with Node.js)
- **MCP Client**: Such as Claude Desktop, VS Code with MCP extension, or any MCP-compatible application

### Quick Start

The fastest way to get started is using `npx`:

```bash
npx @stirstir/thinking-in-kiro
```

This command will:
1. Download and run the latest version
2. Start the MCP server on stdio
3. Display available tools and capabilities

Then, configure your MCP client to connect to the server (see [Configuration](#configuration) section).

### Installation

#### Method 1: Global Installation (Recommended)

For permanent use, install globally:

```bash
npm install -g @stirstir/thinking-in-kiro
```

Then run:

```bash
thinking-in-kiro
```

#### Method 2: Local Project Installation

For project-specific use:

```bash
npm install @stirstir/thinking-in-kiro
```

Then run:

```bash
npx thinking-in-kiro
```

#### Method 3: Direct from Source

For development or latest features:

```bash
git clone https://github.com/Yidada/thinking-in-kiro.git
cd thinking-in-kiro
npm install
npm run build
npm start
```

### Configuration

Add the server to your MCP client's configuration file.

#### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "thinking-in-kiro": {
      "command": "npx",
      "args": ["-y", "@stirstir/thinking-in-kiro"]
    }
  }
}
```

#### VS Code Configuration

Add to your VS Code `settings.json`:

```json
{
  "mcp.servers": {
    "thinking-in-kiro": {
      "command": "npx",
      "args": ["-y", "@stirstir/thinking-in-kiro"]
    }
  }
}
```

#### Global Installation Configuration

If you installed globally, use:

```json
{
  "mcpServers": {
    "thinking-in-kiro": {
      "command": "@stirstir/thinking-in-kiro"
    }
  }
}
```

### Usage Examples

#### Starting a New Development Project

1. **Initialize Development Flow**:
   ```
   Use the init_dev_flow tool with your project name
   ```

2. **Follow the Structured Process**:
   - Requirement analysis
   - Technical design
   - Task planning
   - Sequential execution

#### Typical Workflow

1. **Project Initialization**: Create a new development flow
2. **Requirement Gathering**: Analyze and document requirements
3. **Design Phase**: Create technical solution design
4. **Task Planning**: Break down implementation into actionable tasks
5. **Execution**: Complete tasks sequentially with progress tracking
6. **Documentation**: Generate completion reports

### Troubleshooting

#### Common Issues

**Server Won't Start**
- Ensure Node.js 18+ is installed: `node --version`
- Check if port is available
- Verify installation: `npm list -g @stirstir/thinking-in-kiro`

**MCP Client Can't Connect**
- Verify configuration file syntax
- Check that the command path is correct
- Ensure the server is running: test with `npx @stirstir/thinking-in-kiro`

**Permission Errors**
- On macOS/Linux, you might need: `sudo npm install -g @stirstir/thinking-in-kiro`
- Or use a Node version manager like nvm

**Tools Not Available**
- Restart your MCP client after configuration changes
- Check server logs for initialization errors
- Verify the server version matches your expectations

#### Getting Help

- Check the [FAQ](#faq) section
- Review server logs for error messages
- Ensure your MCP client supports the required protocol version
- Test with a minimal configuration first

### FAQ

**Q: What is the Model Context Protocol (MCP)?**
A: MCP is a protocol that allows AI assistants to securely connect to external tools and data sources.

**Q: Do I need to restart my MCP client after installing?**
A: Yes, most MCP clients require a restart to recognize new server configurations.

**Q: Can I use this with multiple projects?**
A: Yes, each project can have its own development flow instance.

**Q: Is this compatible with all MCP clients?**
A: It's designed to work with any MCP-compatible client, but has been tested primarily with Claude Desktop and VS Code.

**Q: How do I update to the latest version?**
A: Run `npm update -g @stirstir/thinking-in-kiro` for global installations, or `npm update @stirstir/thinking-in-kiro` for local installations.

## For Contributors

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/stirstir-labs/thinking-in-kiro.git
   cd thinking-in-kiro
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

### Project Architecture

```
src/
├── index.ts              # Main entry point and MCP server setup
├── server/               # Core server implementation
│   ├── DevelopmentFlowServer.ts  # Main server class
│   ├── DocumentGenerator.ts      # Document generation logic
│   └── StateManager.ts          # State management
├── types/                # TypeScript type definitions
│   └── index.ts
└── utils/                # Utility functions
    └── index.ts
```

#### Key Components

- **DevelopmentFlowServer**: Main MCP server implementation
- **StateManager**: Manages project state and .dev directory
- **DocumentGenerator**: Creates requirement.md, design.md, todo.md files
- **Types**: TypeScript interfaces for type safety

#### Development Flow

When a development flow is initiated, the server:
1. Creates a `.dev/` directory with timestamp
2. Generates structured documents (requirement.md, design.md, todo.md)
3. Tracks progress through sequential phases
4. Maintains state between sessions

### Contributing Guidelines

1. **Fork the repository** and create a feature branch
2. **Follow the existing code style** (see Code Style section)
3. **Write tests** for new functionality
4. **Update documentation** as needed
5. **Submit a pull request** with a clear description

#### Pull Request Process

1. Ensure all tests pass: `npm run test` (when available)
2. Update README.md if needed
3. Add your changes to the changelog
4. Request review from maintainers

### Code Style

- **TypeScript**: Use strict type checking
- **ESLint**: Follow the configured linting rules
- **Prettier**: Use for code formatting
- **Naming**: Use camelCase for variables, PascalCase for classes
- **Comments**: Document complex logic and public APIs

#### Code Organization

- Keep functions small and focused
- Use meaningful variable and function names
- Separate concerns into different modules
- Follow the existing project structure

### Testing

#### Running Tests

Currently, the project includes a basic test script:

```bash
node test/test-server.js
```

This script tests:
- Server startup
- Tool registration
- Basic tool functionality

#### Writing Tests

When contributing:
- Add tests for new features
- Test error conditions
- Verify MCP protocol compliance
- Test with different MCP clients when possible

### Release Process

1. **Version Bump**: Update version in package.json
2. **Changelog**: Update CHANGELOG.md with new features/fixes
3. **Build**: Run `npm run build` to ensure clean build
4. **Test**: Verify all functionality works
5. **Publish**: `npm publish` (maintainers only)
6. **Tag**: Create git tag for the release

#### Key Scripts

- `npm run dev`: Start development server with auto-rebuild
- `npm run build`: Build TypeScript to JavaScript
- `npm start`: Start production server
- `npm run prepare`: Pre-publish build step

## License

MIT License - see the [LICENSE](LICENSE) file for details.

---

**Inspired by**: The [sequential thinking MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking) and structured development methodologies.