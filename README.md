# Ahaan Thai MCP servers

A collection of MCP Servers for the ahaan-thai.de APIs

## MCP Servers

Currently we have two servers for the APIs provided by ahaan-thai.de

### Dictionary Server

A MCP Server for the thai food dictionary. It provides translations of many food related terms in thai, english and german.

- thai-food-dictionary-server (dictionary-server.js)

### Library Server

A MCP Server for the thai cook book library with more than 500 dishes from different cook books

- thai-cook-book-library-server (library-server.js)

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

We use bash scripts to start the servers to ensurce the correct node version is used.
So we need to make surethe scripts are executable:

```bash
chmod +x run-dictionary-server.sh
chmod +x run-library-server.sh
```

1. Start the servers

```bash
./run-dictionary-server.sh
```

or

```bash
./run-library-server.sh
```

1. Inspect the servers

To inspect the servers we use the inspector from `modelcontextprotocol`

```bash
npm run inspect:dictionary
```

```bash
npm run inspect:library
```

## Usage

To use the servers, you have to configure them in your AI Tool of choice.

### Example

This is how you configure the thai-food-dictionary in claude desktop config.
For MacOs the config file is located at `~/Library/Application Support/Claude/config.json`

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
