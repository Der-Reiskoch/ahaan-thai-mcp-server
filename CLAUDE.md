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

### REST API (Remote Usage via HTTP)

Single REST API server (`src/index.js`) that exposes all MCP functionality via HTTP endpoints for remote access.

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
- Both local (MCP) and remote (REST) modes available

### Key Constants and URLs

- **Dictionary API**: `https://www.ahaan-thai.de/api/thai-food-dictionary.json`
- **Book Info API**: `https://www.ahaan-thai.de/api/thai-cook-book-info.json`
- **Library API**: `https://www.ahaan-thai.de/api/thai-cook-book-library.json`
- **URL Prefixes**: `https://www.ahaan-thai.de` (DE/EN pages), `https://bilder.koch-reis.de/` (images)
- **Amazon Links**: `https://amzn.to/` prefix for affiliate links

## Development Commands

### MCP Server Management (Local)

```bash
# Start MCP servers directly
npm run start:dictionary
npm run start:book-info
npm run start:library
npm run start:encyclopedia

# Start with debugging
npm run dev:dictionary
npm run dev:book-info
npm run dev:library
npm run dev:encyclopedia

# Start via bash scripts (ensures correct Node.js version)
./run-dictionary-server.sh
./run-book-info-server.sh
./run-library-server.sh
./run-encyclopedia-server.sh
```

### Server Inspection

```bash
# Inspect MCP servers using the MCP inspector
npm run inspect:dictionary
npm run inspect:book-info
npm run inspect:library
npm run inspect:encyclopedia
```

### REST API Management (Remote)

```bash
# Start REST API server
npm run start:rest

# Start with auto-reload
npm run dev:rest

# Test REST API
npm run test:rest

# Build for deployment
npm run build:rest
```

### Prerequisites

- Node.js v18.17.0 (managed via `.nvmrc` and bash scripts)
- Make scripts executable: `chmod +x run-*.sh`

## Project Structure

```
├── src/                          # REST API (Development)
│   ├── index.js                  # REST API Server
│   └── lib/                      # Shared Business Logic
│       ├── cache.js              # 5-minute TTL cache
│       ├── logger.js             # Debug logging
│       ├── dictionary-logic.js   # Dictionary business logic
│       ├── book-info-logic.js    # Book info business logic
│       ├── library-logic.js      # Library business logic
│       └── encyclopedia-logic.js # Encyclopedia business logic
│
├── dist/                         # Production Build (for deployment)
│   ├── index.js                  # Bundled REST API (28.8kb)
│   └── package.json              # Production dependencies only
│
├── dictionary-server.js          # MCP Server (uses src/lib/)
├── book-info-server.js           # MCP Server (uses src/lib/)
├── library-server.js             # MCP Server (uses src/lib/)
├── encyclopedia-server.js        # MCP Server (uses src/lib/)
│
├── run-*.sh                      # Startup scripts (ensure Node version)
├── test-api.js                   # REST API test suite
│
├── README.md                     # Main documentation
├── README-REST-API.md            # REST API documentation
├── DEPLOYMENT.md                 # Deployment guide
└── CLAUDE.md                     # This file
```

### Key Files

- **MCP Servers**: `*-server.js` files in root - use shared logic from `src/lib/`
- **REST API**: `src/index.js` - uses same shared logic
- **Shared Logic**: `src/lib/*` - single source of truth for all business logic
- **Build Output**: `dist/index.js` - bundled for Netcup deployment (28.8kb)
- **Tests**: `test-api.js` - comprehensive REST API test suite

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

### Remote REST API

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions to Netcup or other hosting providers.
