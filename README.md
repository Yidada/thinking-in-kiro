# Thinking-in-Kiro

[![npm version](https://badge.fury.io/js/@stirstir%2Fthinking-in-kiro.svg)](https://badge.fury.io/js/@stirstir%2Fthinking-in-kiro)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful Model Context Protocol (MCP) server that implements a structured development workflow with systematic requirement analysis, design planning, and task execution.

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