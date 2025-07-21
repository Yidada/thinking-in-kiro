# Thinking-in-Kiro

A powerful Model Context Protocol (MCP) server that implements a structured development workflow.

## For Users

### Quick Start

Run the server with `npx`:

```bash
npx thinking-in-kiro
```

Then, configure your MCP client (e.g., Claude Desktop, VS Code) to use the server.

### Installation

For more permanent use, install it globally:

```bash
npm install -g thinking-in-kiro
thinking-in-kiro
```

### Configuration

Add the server to your MCP client's configuration file.

**Example for VS Code `settings.json` or `claude_desktop_config.json`:**

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

## For Contributors

### Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/thinking-in-kiro.git
    cd thinking-in-kiro
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run in development mode:**
    ```bash
    npm run dev
    ```

### Key Scripts

-   `npm run dev`: Start the server in development mode with auto-rebuild.
-   `npm run build`: Build for production.
-   `npm start`: Start the production server.
-   `npm test`: Run the test server.

### Project Structure

The core logic is in `src/`. When a development flow is initiated, it creates a `.dev/` directory to store state and generated documents (`requirement.md`, `design.md`, etc.).

### Architecture

-   **TypeScript** for type safety.
-   **@modelcontextprotocol/sdk** for MCP implementation.
-   Inspired by the [sequential thinking MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking).

## License

MIT