# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This project contains three MCP (Model Context Protocol) servers that provide access to Thai food-related APIs from ahaan-thai.de:

1. **Dictionary Server** (`dictionary-server.js`): Thai food dictionary with translations in Thai, English, and German
2. **Book Info Server** (`book-info-server.js`): Thai cookbook metadata (author, title, description, ISBN, etc.)
3. **Library Server** (`library-server.js`): Thai cookbook recipes and content

Each server follows the same architectural pattern:

- Uses `@modelcontextprotocol/sdk` for MCP protocol implementation
- Implements caching with 5-minute TTL for API responses
- Provides debug logging functions (`logDebug`, `logError`, `logInfo`)
- Uses `node-fetch` for external API calls
- Connects to `https://ahaan-thai.de/api/` endpoints

### Key Constants and URLs

- **Dictionary API**: `https://www.ahaan-thai.de/api/thai-food-dictionary.json`
- **Book Info API**: `https://www.ahaan-thai.de/api/thai-cook-book-info.json`
- **Library API**: `https://www.ahaan-thai.de/api/thai-cook-book-library.json`
- **URL Prefixes**: `https://www.ahaan-thai.de` (DE/EN pages), `https://bilder.koch-reis.de/` (images)
- **Amazon Links**: `https://amzn.to/` prefix for affiliate links

## Development Commands

### Server Management

```bash
# Start servers directly
npm run start:dictionary
npm run start:book-info
npm run start:library

# Start with debugging
npm run dev:dictionary
npm run dev:book-info
npm run dev:library

# Start via bash scripts (ensures correct Node.js version)
./run-dictionary-server.sh
./run-book-info-server.sh
./run-library-server.sh
```

### Server Inspection

```bash
# Inspect MCP servers using the MCP inspector
npm run inspect:dictionary
npm run inspect:book-info
npm run inspect:library
```

### Prerequisites

- Node.js v18.17.0 (managed via `.nvmrc` and bash scripts)
- Make scripts executable: `chmod +x run-*.sh`

## Project Structure

- `dictionary-server.js`: Main dictionary server with category filtering
- `book-info-server.js`: Book metadata server with Amazon link generation
- `library-server.js`: Recipe library server with URL processing
- `run-*.sh`: Bash scripts that ensure correct Node version via nvm
- `package.json`: Contains all npm scripts and dependencies

## Configuration

MCP servers are configured in AI tools (like Claude Desktop) using the bash script paths:

```json
{
  "mcpServers": {
    "thai-food-dictionary": {
      "command": "bash",
      "args": ["<PATH>/run-dictionary-server.sh"]
    }
  }
}
```
