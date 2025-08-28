# Ahaan mcp-server

A MCP Server for the ahaan-thai.de APIs

## Prerequisites

- Node.js v18.17.0
- Node Version Manager (nvm)
- Access to `https://ahaan-thai.de/api/`

## Getting Started

1. Install dependencies

```bash
npm install
```

1. Make Script executable

We use a script to start the server to ensurce the correct node version is needed.
So we need to make the script executable:

```bash
chmod +x run-dictionary-server.sh
```

1. Start the server

```bash
./run-dictionary-server.sh
```

1. Inspect the server

to inspect the server we use the inspector from `modelcontextprotocol`

```bash
npm run inspect
```

## Usage

To use the server, you have to configure it in your AI Tool of choice.

### Example

This is how your configure the thai-food-dictionary in claude desktop config.
For MacOs this file is located at `~/Library/Application Support/Claude/config.json`

```json
{
  "mcpServers": {
    "thai-food-dictionary": {
      "command": "bash",
      "args": ["<PATH TO MCP SERVER>/run-dictionary-server.sh"]
    }
  }
}
```
