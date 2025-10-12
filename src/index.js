#!/usr/bin/env node

/**
 * Ahaan Thai MCP Server
 * MCP server with HTTP transport for Thai food data
 * Combines Dictionary, Book Info, Library, and Encyclopedia
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import * as dictionary from './lib/dictionary-logic.js';
import * as bookInfo from './lib/book-info-logic.js';
import * as library from './lib/library-logic.js';
import * as encyclopedia from './lib/encyclopedia-logic.js';

// Create MCP Server
const server = new McpServer({
  name: 'ahaan-thai',
  version: '1.0.0',
});

// ============================================================================
// DICTIONARY TOOLS
// ============================================================================

server.registerTool(
  'search_dictionary',
  {
    title: 'Search Thai Food Dictionary',
    description: 'Search for Thai food terms across all categories or within a specific category',
    inputSchema: {
      query: z.string().describe('Search term (Thai, English, or German)'),
      category: z.string().optional().describe('Optional category to search within'),
    },
  },
  async ({ query, category }) => {
    const results = await dictionary.searchDictionary(query, category || null);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

server.registerTool(
  'get_dictionary_category',
  {
    title: 'Get Dictionary Category',
    description: 'Get all items in a specific dictionary category',
    inputSchema: {
      category: z.string().describe('Category name (e.g., "curries", "soups")'),
    },
  },
  async ({ category }) => {
    try {
      const items = await dictionary.getCategory(category);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(items, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: error.message,
        }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'translate_thai_word',
  {
    title: 'Translate Thai Word',
    description: 'Translate a Thai word to English and German',
    inputSchema: {
      word: z.string().describe('Thai word to translate'),
    },
  },
  async ({ word }) => {
    const result = await dictionary.translateWord(word);
    if (!result) {
      return {
        content: [{
          type: 'text',
          text: `Thai word "${word}" not found in dictionary`,
        }],
        isError: true,
      };
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2),
      }],
    };
  }
);

server.registerTool(
  'list_dictionary_categories',
  {
    title: 'List Dictionary Categories',
    description: 'List all available dictionary categories',
    inputSchema: {},
  },
  async () => {
    const categories = await dictionary.getCategoryList();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(categories, null, 2),
      }],
    };
  }
);

// ============================================================================
// BOOK INFO TOOLS
// ============================================================================

server.registerTool(
  'list_cookbooks',
  {
    title: 'List Thai Cookbooks',
    description: 'List all Thai cookbooks in the collection',
    inputSchema: {},
  },
  async () => {
    const books = await bookInfo.listBooks();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(books, null, 2),
      }],
    };
  }
);

server.registerTool(
  'search_cookbooks',
  {
    title: 'Search Cookbooks',
    description: 'Search cookbooks by various criteria',
    inputSchema: {
      query: z.string().optional().describe('Search query'),
      language: z.string().optional().describe('Language code (de, en, th)'),
      level: z.string().optional().describe('Difficulty level'),
      author: z.string().optional().describe('Author name'),
      year: z.string().optional().describe('Publication year'),
      publisher: z.string().optional().describe('Publisher name'),
    },
  },
  async (filters) => {
    const books = await bookInfo.searchBooks(filters);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(books, null, 2),
      }],
    };
  }
);

server.registerTool(
  'get_cookbook_by_isbn',
  {
    title: 'Get Cookbook by ISBN',
    description: 'Get detailed information about a cookbook by its ISBN',
    inputSchema: {
      isbn: z.string().describe('ISBN of the cookbook'),
    },
  },
  async ({ isbn }) => {
    try {
      const book = await bookInfo.getBookByIsbn(isbn);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(book, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: error.message,
        }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'get_cookbooks_by_author',
  {
    title: 'Get Cookbooks by Author',
    description: 'Get all cookbooks by a specific author',
    inputSchema: {
      author: z.string().describe('Author name'),
    },
  },
  async ({ author }) => {
    try {
      const books = await bookInfo.getBooksByAuthor(author);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(books, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: error.message,
        }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'get_cookbooks_by_language',
  {
    title: 'Get Cookbooks by Language',
    description: 'Get all cookbooks in a specific language',
    inputSchema: {
      language: z.string().describe('Language code (de, en, th)'),
    },
  },
  async ({ language }) => {
    try {
      const books = await bookInfo.getBooksByLanguage(language);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(books, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: error.message,
        }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'get_cookbook_statistics',
  {
    title: 'Get Cookbook Statistics',
    description: 'Get statistics about the cookbook collection',
    inputSchema: {},
  },
  async () => {
    const stats = await bookInfo.getBookStatistics();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(stats, null, 2),
      }],
    };
  }
);

// ============================================================================
// LIBRARY TOOLS
// ============================================================================

server.registerTool(
  'list_library_cookbooks',
  {
    title: 'List Library Cookbooks',
    description: 'List all cookbooks with recipes in the library',
    inputSchema: {},
  },
  async () => {
    const cookbooks = await library.listCookbooks();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(cookbooks, null, 2),
      }],
    };
  }
);

server.registerTool(
  'get_cookbook_recipes',
  {
    title: 'Get Cookbook Recipes',
    description: 'Get all recipes from a specific cookbook',
    inputSchema: {
      cookbook: z.string().describe('Cookbook name'),
    },
  },
  async ({ cookbook }) => {
    try {
      const recipes = await library.getCookbookRecipes(cookbook);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(recipes, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: error.message,
        }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'search_recipes',
  {
    title: 'Search Recipes',
    description: 'Search recipes by query, region, or cookbook',
    inputSchema: {
      query: z.string().optional().describe('Search query'),
      region: z.string().optional().describe('Thai region'),
      cookbook: z.string().optional().describe('Cookbook name'),
    },
  },
  async (params) => {
    const results = await library.searchRecipes(params);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

server.registerTool(
  'get_recipe',
  {
    title: 'Get Recipe Details',
    description: 'Get detailed information about a specific recipe',
    inputSchema: {
      cookbook: z.string().describe('Cookbook name'),
      recipe_key: z.string().describe('Recipe key/ID'),
    },
  },
  async ({ cookbook, recipe_key }) => {
    try {
      const recipe = await library.getRecipeByKey(cookbook, recipe_key);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(recipe, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: error.message,
        }],
        isError: true,
      };
    }
  }
);

server.registerTool(
  'get_recipes_by_region',
  {
    title: 'Get Recipes by Region',
    description: 'Get all recipes from a specific Thai region',
    inputSchema: {
      region: z.string().describe('Thai region (central, north, isaan, south)'),
    },
  },
  async ({ region }) => {
    const results = await library.getRecipesByRegion(region);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

server.registerTool(
  'get_library_statistics',
  {
    title: 'Get Library Statistics',
    description: 'Get statistics about the recipe library',
    inputSchema: {},
  },
  async () => {
    const stats = await library.getCookbookStats();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(stats, null, 2),
      }],
    };
  }
);

// ============================================================================
// ENCYCLOPEDIA TOOLS
// ============================================================================

server.registerTool(
  'search_encyclopedia',
  {
    title: 'Search Encyclopedia',
    description: 'Search the Thai food encyclopedia',
    inputSchema: {
      query: z.string().describe('Search query'),
      limit: z.number().optional().describe('Maximum number of results (default: 20)'),
    },
  },
  async ({ query, limit }) => {
    const results = await encyclopedia.searchEntries(query, limit || 20);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

server.registerTool(
  'get_encyclopedia_by_region',
  {
    title: 'Get Encyclopedia Entries by Region',
    description: 'Get encyclopedia entries from a specific Thai region',
    inputSchema: {
      region: z.string().describe('Thai region'),
      limit: z.number().optional().describe('Maximum number of results (default: 20)'),
    },
  },
  async ({ region, limit }) => {
    const results = await encyclopedia.getEntriesByRegion(region, limit || 20);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

server.registerTool(
  'get_encyclopedia_by_tag',
  {
    title: 'Get Encyclopedia Entries by Tag',
    description: 'Get encyclopedia entries with a specific tag',
    inputSchema: {
      tag: z.string().describe('Tag name'),
      limit: z.number().optional().describe('Maximum number of results (default: 20)'),
    },
  },
  async ({ tag, limit }) => {
    const results = await encyclopedia.getEntriesByTag(tag, limit || 20);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

server.registerTool(
  'get_all_encyclopedia_entries',
  {
    title: 'Get All Encyclopedia Entries',
    description: 'Get all encyclopedia entries (up to limit)',
    inputSchema: {
      limit: z.number().optional().describe('Maximum number of results (default: 100)'),
    },
  },
  async ({ limit }) => {
    const results = await encyclopedia.getAllEntries(limit || 100);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  }
);

server.registerTool(
  'list_thai_regions',
  {
    title: 'List Thai Regions',
    description: 'List all Thai regions with their details',
    inputSchema: {},
  },
  async () => {
    const regions = await encyclopedia.getAllRegions();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(regions, null, 2),
      }],
    };
  }
);

server.registerTool(
  'list_relationship_types',
  {
    title: 'List Relationship Types',
    description: 'List all encyclopedia relationship types',
    inputSchema: {},
  },
  async () => {
    const relationships = await encyclopedia.getRelationshipTypes();
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(relationships, null, 2),
      }],
    };
  }
);

// ============================================================================
// HTTP SERVER SETUP
// ============================================================================

const app = express();
app.use(express.json());

// CORS configuration
app.use(
  cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'Mcp-Session-Id', 'Accept'],
  })
);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'ahaan-thai',
    version: '1.0.0',
  });
});

// Root endpoint - Info about MCP server
app.get('/', (req, res) => {
  res.json({
    name: 'Ahaan Thai MCP Server',
    version: '1.0.0',
    description: 'MCP server for Thai food data - Dictionary, Cookbooks, Library, and Encyclopedia',
    mcp_endpoint: '/mcp',
    health_endpoint: '/health',
    protocol: 'MCP (Model Context Protocol)',
    transport: 'Streamable HTTP',
    tools_count: 26,
    documentation: 'https://github.com/yourusername/ahaan-thai-mcp-server',
  });
});

// MCP endpoint - Streamable HTTP
app.post('/mcp', async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    hint: 'MCP endpoint is at POST /mcp',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Ahaan Thai MCP Server running on http://localhost:${PORT}`);
  console.log(`📚 MCP Endpoint: http://localhost:${PORT}/mcp`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health\n`);
}).on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Export app for testing
export default app;
