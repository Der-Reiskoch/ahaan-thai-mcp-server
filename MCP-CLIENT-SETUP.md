# MCP Client Setup Guide

This guide shows you how to connect to the Ahaan Thai MCP Server from AI tools like Claude Desktop or Claude Code.

## What is MCP?

The Model Context Protocol (MCP) allows AI assistants to access external data sources and tools. The Ahaan Thai MCP Server provides access to Thai food dictionaries, cookbooks, recipes, and encyclopedia data.

## Option 1: Remote Access (Recommended)

Use the hosted REST API at `https://mcp.ahaan-thai.de` - no local setup required!

### Claude Desktop

Add this to your Claude Desktop config file (`claude_desktop_config.json`):

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ahaan-thai": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "https://mcp.ahaan-thai.de"
      ]
    }
  }
}
```

### Claude Code

Add this to your Claude Code config file:

**macOS/Linux**: `~/.config/claude-code/mcp_config.json`
**Windows**: `%APPDATA%/claude-code/mcp_config.json`

```json
{
  "mcpServers": {
    "ahaan-thai": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "https://mcp.ahaan-thai.de"
      ]
    }
  }
}
```

## Option 2: Local MCP Servers

Run the MCP servers locally for offline access or development.

### Prerequisites

- Node.js v18.17.0 or higher
- Clone this repository

### Claude Desktop (Local)

Add one or more servers to your config:

```json
{
  "mcpServers": {
    "thai-food-dictionary": {
      "command": "bash",
      "args": ["/path/to/ahaan-thai-mcp-server/run-dictionary-server.sh"]
    },
    "thai-cook-book-info": {
      "command": "bash",
      "args": ["/path/to/ahaan-thai-mcp-server/run-book-info-server.sh"]
    },
    "thai-cook-book-library": {
      "command": "bash",
      "args": ["/path/to/ahaan-thai-mcp-server/run-library-server.sh"]
    },
    "thai-food-encyclopedia": {
      "command": "bash",
      "args": ["/path/to/ahaan-thai-mcp-server/run-encyclopedia-server.sh"]
    }
  }
}
```

**Important**: Replace `/path/to/ahaan-thai-mcp-server/` with the actual path to your cloned repository.

### Claude Code (Local)

Same configuration as Claude Desktop above.

## Available Tools

Once configured, you'll have access to these tools in your AI assistant:

### Dictionary Tools

- `search_dictionary` - Search Thai food terms
- `get_category` - Get all items in a category
- `translate_word` - Translate Thai words
- `list_categories` - List all dictionary categories

### Book Info Tools

- `list_books` - List all Thai cookbooks
- `search_books` - Search cookbooks by criteria
- `get_book_by_isbn` - Get book details by ISBN
- `get_books_by_author` - Get books by author name
- `get_books_by_language` - Filter books by language
- `get_book_statistics` - Get book collection statistics

### Library Tools

- `list_cookbooks` - List all cookbooks with recipes
- `get_cookbook_recipes` - Get all recipes from a cookbook
- `search_recipes` - Search recipes by query, region, or cookbook
- `get_recipe_by_key` - Get a specific recipe
- `get_recipes_by_region` - Get recipes from a Thai region
- `get_cookbook_stats` - Get recipe statistics

### Encyclopedia Tools

- `search_entries` - Search encyclopedia entries
- `get_entries_by_region` - Get entries by Thai region
- `get_entries_by_tag` - Get entries by tag
- `get_all_entries` - Get all encyclopedia entries
- `list_regions` - List all Thai regions
- `list_relationships` - List relationship types

## Verifying Setup

After configuration:

1. **Restart** Claude Desktop or Claude Code
2. Open a new conversation
3. Ask: "What Thai food tools do you have access to?"
4. The AI should list the available MCP tools

## Troubleshooting

### Remote Access Issues

- Check if the server is online: Visit https://mcp.ahaan-thai.de in your browser
- Make sure `npx` is installed: Run `npm install -g npx`

### Local Server Issues

- Make sure Node.js v18+ is installed: `node --version`
- Make scripts executable: `chmod +x run-*.sh`
- Check the path in your config is correct
- Look at logs in Claude Desktop/Code settings

## More Information

- [Main README](./README.md) - Project overview
- [REST API Documentation](./README-REST-API.md) - Direct API access
- [MCP Documentation](https://modelcontextprotocol.io) - Learn more about MCP

## Support

For issues or questions, please open an issue on GitHub.
