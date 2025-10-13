# Ahaan Thai MCP Servers

A collection of MCP Servers and REST API for the ahaan-thai.de APIs

## Features

- **Dual-Mode**: Available as both local MCP servers (stdio) and remote HTTP MCP server
- **Shared Logic**: Business logic shared between all implementations
- **Four APIs**: Dictionary, Book Info, Library, and Encyclopedia
- **26 Tools**: Access to all functionality via MCP protocol

## Quick Start

### One-Click Install (Easiest)

Install the `.mcpb` bundle for Claude Desktop - drag and drop installation!

Build the bundle:
```bash
npm install
npm run http-mcp:bundle:pack
```

This creates `mcpb/ahaan-thai.mcpb` (1.4MB). Simply drag the `.mcpb` file into Claude Desktop to install. No configuration needed!

### Remote Access (Using mcp-remote)

Use the hosted MCP server at `https://mcp.ahaan-thai.de/mcp` - no local setup required!

See [MCP-CLIENT-SETUP.md](./MCP-CLIENT-SETUP.md) for configuration instructions.

### Local Development

Clone this repo and run locally for development or offline access.

## MCP Servers

Currently we have four servers for the APIs provided by ahaan-thai.de:

### Dictionary Server

A MCP Server for the Thai food dictionary. It provides translations of many food-related terms in Thai, English and German.

- `thai-food-dictionary-server` (dictionary-server.js)

### Book Info Server

A MCP Server for the Thai cook book library which provides information like author, title, description, ISBN, language, level, publisher, year, etc.

- `thai-cook-book-info-server` (book-info-server.js)

### Library Server

A MCP Server for the Thai cook book library which provides the recipes that are contained in the books.

- `thai-cook-book-library-server` (library-server.js)

### Encyclopedia Server

A MCP Server for the Thai food encyclopedia with dishes, ingredients, and cooking methods.

- `thai-food-encyclopedia-server` (encyclopedia-server.js)

## HTTP MCP Server (Remote Usage)

All MCP functionality is available via HTTP at `https://mcp.ahaan-thai.de/mcp`

Quick start:

```bash
npm run http-mcp:start    # Start HTTP MCP server on port 3000
npm run http-mcp:dev      # Start with auto-reload
npm run http-mcp:build    # Build for deployment
npm run http-mcp:inspect  # Open MCP Inspector
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

## Prerequisites

- Node.js v18.17.0 or higher
- Node Version Manager (nvm) recommended
- Access to `https://ahaan-thai.de/api/`

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Make scripts executable

We use bash scripts to start the servers to ensure the correct node version is used:

```bash
chmod +x run-book-info-server.sh
chmod +x run-dictionary-server.sh
chmod +x run-library-server.sh
chmod +x run-encyclopedia-server.sh
```

### 3. Start the MCP servers

```bash
./run-dictionary-server.sh
./run-book-info-server.sh
./run-library-server.sh
./run-encyclopedia-server.sh
```

Or use npm scripts:

```bash
npm run start:dictionary
npm run start:book-info
npm run start:library
npm run start:encyclopedia
```

### 4. Inspect the servers

To inspect the servers we use the inspector from `modelcontextprotocol`:

```bash
npm run inspect:dictionary
npm run inspect:book-info
npm run inspect:library
npm run inspect:encyclopedia
```

## Usage with Claude Desktop

### Option 1: MCPB Bundle (Easiest - Recommended)

Install the `.mcpb` bundle:

1. Build: `npm run http-mcp:bundle:pack`
2. Drag and drop `mcpb/ahaan-thai.mcpb` into Claude Desktop
3. Restart Claude Desktop

That's it! No configuration needed.

### Option 2: Using mcp-remote

Use the hosted HTTP MCP server via `mcp-remote`:

For macOS, edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ahaan-thai": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.ahaan-thai.de/mcp"
      ]
    }
  }
}
```

### Option 3: Local Stdio Servers

Run the MCP servers locally (for development):

```json
{
  "mcpServers": {
    "thai-food-dictionary": {
      "command": "bash",
      "args": ["<PATH_TO_PROJECT>/run-dictionary-server.sh"]
    },
    "thai-cook-book-info": {
      "command": "bash",
      "args": ["<PATH_TO_PROJECT>/run-book-info-server.sh"]
    },
    "thai-cook-book-library": {
      "command": "bash",
      "args": ["<PATH_TO_PROJECT>/run-library-server.sh"]
    },
    "thai-food-encyclopedia": {
      "command": "bash",
      "args": ["<PATH_TO_PROJECT>/run-encyclopedia-server.sh"]
    }
  }
}
```

See [MCP-CLIENT-SETUP.md](./MCP-CLIENT-SETUP.md) for detailed setup instructions.

## Project Structure

```
├── src/                          # HTTP MCP Server (Development)
│   ├── index.js                  # HTTP MCP Server
│   └── lib/                      # Shared Business Logic
│       ├── cache.js
│       ├── logger.js
│       ├── dictionary-logic.js
│       ├── book-info-logic.js
│       ├── library-logic.js
│       └── encyclopedia-logic.js
│
├── dist/                         # Production Build
│   ├── index.js                  # Bundled HTTP MCP Server (37kb)
│   └── package.json              # Auto-generated
│
├── mcpb/                         # Claude Desktop Extension Bundle
│   ├── manifest.json             # Bundle configuration
│   ├── package.json              # Bundle dependencies
│   ├── icon.png                  # Extension icon
│   ├── node_modules/             # Bundled dependencies (mcp-remote)
│   └── ahaan-thai.mcpb           # Pre-built bundle (1.4MB)
│
├── dictionary-server.js          # Stdio MCP Server (uses src/lib/)
├── book-info-server.js           # Stdio MCP Server (uses src/lib/)
├── library-server.js             # Stdio MCP Server (uses src/lib/)
├── encyclopedia-server.js        # Stdio MCP Server (uses src/lib/)
│
├── run-*.sh                      # Startup scripts (ensure Node version)
├── build-dist-package.js         # Generates dist/package.json
│
├── README.md                     # This file
├── MCP-CLIENT-SETUP.md           # Client setup guide
└── CLAUDE.md                     # Development guide for Claude Code
```

## Available Scripts

### Stdio MCP Servers (Local)

```bash
# Start servers
npm run stdio:dictionary:start
npm run stdio:book-info:start
npm run stdio:library:start
npm run stdio:encyclopedia:start

# Start with debugging
npm run stdio:dictionary:dev
npm run stdio:book-info:dev
npm run stdio:library:dev
npm run stdio:encyclopedia:dev

# Inspect servers
npm run stdio:dictionary:inspect
npm run stdio:book-info:inspect
npm run stdio:library:inspect
npm run stdio:encyclopedia:inspect
```

### HTTP MCP Server (Remote)

```bash
# Start HTTP MCP server
npm run http-mcp:start

# Start with auto-reload
npm run http-mcp:dev

# Build for deployment
npm run http-mcp:build

# Open MCP Inspector
npm run http-mcp:inspect
```

### MCPB Bundle

```bash
# Build the .mcpb bundle
npm run http-mcp:bundle:pack
```

This creates `mcpb/ahaan-thai.mcpb` which can be installed in Claude Desktop.

## Development

For development guidance and architecture details, see [CLAUDE.md](./CLAUDE.md).

## License

MIT

## Author

Der Reiskoch
