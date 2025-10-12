# MCP Client Setup Guide

This guide shows you how to connect to the Ahaan Thai MCP Server from AI tools like Claude Desktop or Claude Code.

## What is MCP?

The Model Context Protocol (MCP) allows AI assistants to access external data sources and tools. The Ahaan Thai MCP Server provides access to Thai food dictionaries, cookbooks, recipes, and encyclopedia data through **26 tools**.

## Option 1: Remote Access (Recommended) ⭐

Use the hosted HTTP MCP server at `https://mcp.ahaan-thai.de/mcp` - no local setup required!

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
        "mcp-remote",
        "https://mcp.ahaan-thai.de/mcp"
      ]
    }
  }
}
```

**Note**: This uses `mcp-remote` as a proxy to connect Claude Desktop (which only supports stdio) to the remote HTTP MCP server.

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
        "mcp-remote",
        "https://mcp.ahaan-thai.de/mcp"
      ]
    }
  }
}
```

## Option 2: Local Stdio Servers

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

## Available Tools (26 total)

Once configured, you'll have access to these tools:

### Dictionary Tools (4)

- `search_dictionary` - Search Thai food terms
- `get_dictionary_category` - Get all items in a category
- `translate_thai_word` - Translate Thai words
- `list_dictionary_categories` - List all dictionary categories

### Book Info Tools (6)

- `list_cookbooks` - List all Thai cookbooks
- `search_cookbooks` - Search cookbooks by criteria
- `get_cookbook_by_isbn` - Get book details by ISBN
- `get_cookbooks_by_author` - Get books by author name
- `get_cookbooks_by_language` - Filter books by language
- `get_cookbook_statistics` - Get book collection statistics

### Library Tools (6)

- `list_library_cookbooks` - List all cookbooks with recipes
- `get_cookbook_recipes` - Get all recipes from a cookbook
- `search_recipes` - Search recipes by query, region, or cookbook
- `get_recipe` - Get a specific recipe
- `get_recipes_by_region` - Get recipes from a Thai region
- `get_library_statistics` - Get recipe statistics

### Encyclopedia Tools (6)

- `search_encyclopedia` - Search encyclopedia entries
- `get_encyclopedia_by_region` - Get entries by Thai region
- `get_encyclopedia_by_tag` - Get entries by tag
- `get_all_encyclopedia_entries` - Get all encyclopedia entries
- `list_thai_regions` - List all Thai regions
- `list_relationship_types` - List relationship types

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
- Check your internet connection
- Make sure Node.js v18+ is installed (required by `mcp-remote`): `node --version`
- If `mcp-remote` fails to install, try: `npm install -g mcp-remote`

### Local Server Issues

- Make sure Node.js v18+ is installed: `node --version`
- Make scripts executable: `chmod +x run-*.sh`
- Check the path in your config is correct
- Look at logs in Claude Desktop/Code settings

## Testing with MCP Inspector

You can test the MCP server using the official MCP Inspector:

```bash
# Install dependencies
npm install

# Start the HTTP MCP server (for testing remote mode)
npm run http-mcp:start

# Open MCP Inspector
npm run http-mcp:inspect
```

In the Inspector:
1. Select **Transport Type**: "Streamable HTTP"
2. Select **Connection Method**: "via proxy"
3. Enter **URL**: `http://localhost:3000/mcp` (local) or `https://mcp.ahaan-thai.de/mcp` (remote)
4. Click **Connect**

## More Information

- [Main README](./README.md) - Project overview
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [MCP Documentation](https://modelcontextprotocol.io) - Learn more about MCP

## Support

For issues or questions, please open an issue on GitHub.
