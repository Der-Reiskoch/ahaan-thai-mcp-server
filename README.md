# Ahaan Thai MCP Servers

A collection of MCP Servers and REST API for the ahaan-thai.de APIs

## Features

- **Dual-Mode**: Available as both local MCP servers (stdio) and remote REST API
- **Shared Logic**: Business logic shared between MCP and REST implementations
- **Four APIs**: Dictionary, Book Info, Library, and Encyclopedia

## MCP Servers (Local Usage)

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

## REST API (Remote Usage)

All MCP functionality is also available as a REST API for remote access.

See [README-REST-API.md](./README-REST-API.md) for details.

Quick start:
```bash
npm run start:rest    # Start REST API on port 3000
npm run test:rest     # Run API tests
npm run build:rest    # Build for deployment
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

To use the servers, configure them in your AI tool of choice.

### Example Configuration

This is how you configure the servers in Claude Desktop config.
For macOS the config file is located at `~/Library/Application Support/Claude/claude_desktop_config.json`

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

## Project Structure

```
├── src/                          # REST API (Development)
│   ├── index.js                  # REST API Server
│   └── lib/                      # Shared Business Logic
│       ├── cache.js
│       ├── logger.js
│       ├── dictionary-logic.js
│       ├── book-info-logic.js
│       ├── library-logic.js
│       └── encyclopedia-logic.js
│
├── dist/                         # Production Build
│   ├── index.js                  # Bundled REST API (28.8kb)
│   └── package.json
│
├── dictionary-server.js          # MCP Server (uses src/lib/)
├── book-info-server.js           # MCP Server (uses src/lib/)
├── library-server.js             # MCP Server (uses src/lib/)
├── encyclopedia-server.js        # MCP Server (uses src/lib/)
│
├── run-*.sh                      # Startup scripts (ensure Node version)
├── test-api.js                   # REST API test suite
│
├── README.md                     # This file
├── README-REST-API.md            # REST API documentation
├── DEPLOYMENT.md                 # Deployment guide
└── CLAUDE.md                     # Development guide for Claude Code
```

## Available Scripts

### MCP Servers (Local)

```bash
# Start servers
npm run start:dictionary
npm run start:book-info
npm run start:library
npm run start:encyclopedia

# Start with debugging
npm run dev:dictionary
npm run dev:book-info
npm run dev:library
npm run dev:encyclopedia

# Inspect servers
npm run inspect:dictionary
npm run inspect:book-info
npm run inspect:library
npm run inspect:encyclopedia
```

### REST API (Remote)

```bash
# Start REST API
npm run start:rest

# Start with auto-reload
npm run dev:rest

# Test REST API
npm run test:rest

# Build for deployment
npm run build:rest
```

## Development

For development guidance and architecture details, see [CLAUDE.md](./CLAUDE.md).

## License

MIT

## Author

Der Reiskoch
