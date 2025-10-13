# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This project provides **dual-mode access** to Thai food-related APIs from ahaan-thai.de:

### MCP Servers (Local Usage via stdio)

Four MCP (Model Context Protocol) servers for local usage:

1. **Dictionary Server** (`dictionary-server.js`): Thai food dictionary with translations in Thai, English, and German
2. **Book Info Server** (`book-info-server.js`): Thai cookbook metadata (author, title, description, ISBN, etc.)
3. **Library Server** (`library-server.js`): Thai cookbook recipes and content
4. **Encyclopedia Server** (`encyclopedia-server.js`): Thai food encyclopedia with dishes, ingredients, and cooking methods

### HTTP MCP Server (Remote Usage via HTTP)

Single HTTP MCP server (`src/index.js`) that exposes all MCP functionality via Streamable HTTP transport for remote access. Provides 26 tools combining all 4 data sources.

### Shared Business Logic

All business logic is shared between MCP servers and REST API via `src/lib/*`:

- `src/lib/cache.js`: 5-minute TTL caching
- `src/lib/logger.js`: Debug logging (`logDebug`, `logError`, `logInfo`)
- `src/lib/dictionary-logic.js`: Dictionary business logic
- `src/lib/book-info-logic.js`: Book info business logic
- `src/lib/library-logic.js`: Library business logic
- `src/lib/encyclopedia-logic.js`: Encyclopedia business logic

**Benefits:**
- No code duplication
- Single source of truth for business logic
- Both local (stdio) and remote (HTTP) MCP modes available

### Key Constants and URLs

- **Dictionary API**: `https://www.ahaan-thai.de/api/thai-food-dictionary.json`
- **Book Info API**: `https://www.ahaan-thai.de/api/thai-cook-book-info.json`
- **Library API**: `https://www.ahaan-thai.de/api/thai-cook-book-library.json`
- **URL Prefixes**: `https://www.ahaan-thai.de` (DE/EN pages), `https://bilder.koch-reis.de/` (images)
- **Amazon Links**: `https://amzn.to/` prefix for affiliate links

## Development Commands

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

# Start via bash scripts (ensures correct Node.js version)
./run-dictionary-server.sh
./run-book-info-server.sh
./run-library-server.sh
./run-encyclopedia-server.sh
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

# Build MCPB bundle for Claude Desktop
npm run http-mcp:bundle:pack
```

### Prerequisites

- Node.js v18.17.0 (managed via `.nvmrc` and bash scripts)
- Make scripts executable: `chmod +x run-*.sh`

## Project Structure

```
├── src/                          # HTTP MCP Server (Development)
│   ├── index.js                  # HTTP MCP Server
│   └── lib/                      # Shared Business Logic
│       ├── cache.js              # 5-minute TTL cache
│       ├── logger.js             # Debug logging
│       ├── dictionary-logic.js   # Dictionary business logic
│       ├── book-info-logic.js    # Book info business logic
│       ├── library-logic.js      # Library business logic
│       └── encyclopedia-logic.js # Encyclopedia business logic
│
├── dist/                         # Production Build (for deployment)
│   ├── index.js                  # Bundled HTTP MCP Server (37kb)
│   └── package.json              # Auto-generated
│
├── mcpb/                         # Claude Desktop Extension Bundle
│   ├── manifest.json             # Bundle configuration
│   ├── package.json              # Bundle dependencies
│   ├── icon.png                  # Extension icon (32x32)
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
├── README.md                     # Main documentation
├── MCP-CLIENT-SETUP.md           # Client setup guide
└── CLAUDE.md                     # This file
```

### Key Files

- **Stdio MCP Servers**: `*-server.js` files in root - use shared logic from `src/lib/`
- **HTTP MCP Server**: `src/index.js` - uses same shared logic, provides 26 tools
- **Shared Logic**: `src/lib/*` - single source of truth for all business logic
- **Build Output**: `dist/index.js` - bundled for Netcup deployment (37kb, CommonJS)
- **Build Script**: `build-dist-package.js` - auto-generates `dist/package.json`

## Configuration

### Local MCP Servers

MCP servers are configured in AI tools (like Claude Desktop) using the bash script paths:

```json
{
  "mcpServers": {
    "thai-food-dictionary": {
      "command": "bash",
      "args": ["<PATH>/run-dictionary-server.sh"]
    },
    "thai-cook-book-info": {
      "command": "bash",
      "args": ["<PATH>/run-book-info-server.sh"]
    },
    "thai-cook-book-library": {
      "command": "bash",
      "args": ["<PATH>/run-library-server.sh"]
    },
    "thai-food-encyclopedia": {
      "command": "bash",
      "args": ["<PATH>/run-encyclopedia-server.sh"]
    }
  }
}
```

### Remote HTTP MCP Server

The HTTP MCP server is configured via `mcp-remote` (a proxy that bridges stdio to HTTP):

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

See [MCP-CLIENT-SETUP.md](./MCP-CLIENT-SETUP.md) for detailed client configuration.
See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions to Netcup or other hosting providers.
