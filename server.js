#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Debug logging function
function debug(message, ...args) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [DEBUG] ${message}`, ...args);
}

function error(message, ...args) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] ${message}`, ...args);
}

function info(message, ...args) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [INFO] ${message}`, ...args);
}

// Thai Food Dictionary Data
let thaiFoodData = null;

// Fetch the Thai Food Dictionary data
async function fetchThaiFoodData() {
  if (!thaiFoodData) {
    try {
      debug('Fetching Thai Food Dictionary data from API...');
      // Use dynamic import for fetch in Node.js
      const fetch = (await import('node-fetch')).default;
      debug('Node-fetch imported successfully');
      
      const response = await fetch('https://www.der-reiskoch.de/api/thai-food-dictionary.json');
      debug(`API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      thaiFoodData = await response.json();
      const categories = Object.keys(thaiFoodData);
      const totalItems = categories.reduce((sum, cat) => sum + Object.keys(thaiFoodData[cat]).length, 0);
      
      info(`Thai Food Dictionary loaded successfully:`);
      info(`- Categories: ${categories.length}`);
      info(`- Total items: ${totalItems}`);
      debug('Categories:', categories);
      
    } catch (error) {
      error('Failed to fetch Thai Food Dictionary data:', error.message);
      error('Stack trace:', error.stack);
      throw new McpError(ErrorCode.InternalError, `Failed to fetch Thai Food Dictionary data: ${error.message}`);
    }
  } else {
    debug('Using cached Thai Food Dictionary data');
  }
  return thaiFoodData;
}

// Helper function to search in categories
function searchInCategory(data, category, searchTerm) {
  debug(`Searching in category "${category}" for term "${searchTerm}"`);
  
  if (!data[category]) {
    debug(`Category "${category}" not found in data`);
    return [];
  }
  
  const results = [];
  const lowerSearchTerm = searchTerm.toLowerCase();
  const categoryItems = Object.keys(data[category]).length;
  
  debug(`Category "${category}" has ${categoryItems} items`);
  
  for (const [thai, details] of Object.entries(data[category])) {
    const matches = [
      thai.includes(lowerSearchTerm),
      details.meaning_de.toLowerCase().includes(lowerSearchTerm),
      details.meaning_en.toLowerCase().includes(lowerSearchTerm),
      details.trans_de.toLowerCase().includes(lowerSearchTerm),
      details.trans_en.toLowerCase().includes(lowerSearchTerm)
    ];
    
    if (matches.some(match => match)) {
      results.push({
        category,
        thai,
        ...details
      });
      debug(`Match found: ${thai} (${details.meaning_de})`);
    }
  }
  
  debug(`Found ${results.length} results in category "${category}"`);
  return results;
}

// Create server
debug('Creating MCP Server instance...');
const server = new Server(
  {
    name: 'thai-food-dictionary-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);
info('MCP Server instance created successfully');

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  debug('Handling ListTools request');
  const tools = [
    {
      name: 'search_thai_food',
      description: 'Search for Thai food terms by German, English, Thai text, or transliteration',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term (can be in German, English, Thai, or transliteration)',
          },
          category: {
            type: 'string',
            description: 'Optional: specific category to search in',
            enum: [
              'attribute', 'blattgemuese', 'farben', 'fisch_meeresfruechte',
              'fleisch_wurst', 'fruechte_obst', 'gemuese', 'gewuerze_kraeuter',
              'nudeln_reis', 'pilze_tofu_eier_nuesse', 'regionen_provinzen',
              'salate', 'sossen_pasten_dips', 'suessspeisen', 'suppen_currys',
              'zubereitung'
            ]
          }
        },
        required: ['query'],
      },
    },
    {
      name: 'get_category',
      description: 'Get all items from a specific category of Thai food dictionary',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Category name',
            enum: [
              'attribute', 'blattgemuese', 'farben', 'fisch_meeresfruechte',
              'fleisch_wurst', 'fruechte_obst', 'gemuese', 'gewuerze_kraeuter',
              'nudeln_reis', 'pilze_tofu_eier_nuesse', 'regionen_provinzen',
              'salate', 'sossen_pasten_dips', 'suessspeisen', 'suppen_currys',
              'zubereitung'
            ]
          }
        },
        required: ['category'],
      },
    },
    {
      name: 'get_categories',
      description: 'List all available categories in the Thai food dictionary',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'translate_thai_word',
      description: 'Get translation and details for a specific Thai word',
      inputSchema: {
        type: 'object',
        properties: {
          thai_word: {
            type: 'string',
            description: 'Thai word to translate',
          }
        },
        required: ['thai_word'],
      },
    }
  ];
  
  debug(`Returning ${tools.length} available tools`);
  return { tools };
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  debug('Handling ListResources request');
  const resources = [
    {
      uri: 'thai-food://dictionary/full',
      mimeType: 'application/json',
      name: 'Complete Thai Food Dictionary',
      description: 'The complete Thai food dictionary data from der-reiskoch.de',
    },
    {
      uri: 'thai-food://categories/list',
      mimeType: 'application/json',
      name: 'Thai Food Categories',
      description: 'List of all available categories in the dictionary',
    }
  ];
  
  debug(`Returning ${resources.length} available resources`);
  return { resources };
});

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  debug(`Handling ReadResource request for URI: ${uri}`);
  
  try {
    const data = await fetchThaiFoodData();

    switch (uri) {
      case 'thai-food://dictionary/full':
        debug('Returning full dictionary data');
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      
      case 'thai-food://categories/list':
        debug('Generating categories list');
        const categories = Object.keys(data).map(key => ({
          key,
          name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          count: Object.keys(data[key]).length
        }));
        
        debug(`Generated list of ${categories.length} categories`);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(categories, null, 2),
            },
          ],
        };
      
      default:
        error(`Unknown resource requested: ${uri}`);
        throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    }
  } catch (err) {
    error(`Error handling ReadResource for ${uri}:`, err.message);
    throw err;
  }
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  debug(`Handling tool call: ${name}`, args);
  
  try {
    const data = await fetchThaiFoodData();

    switch (name) {
      case 'search_thai_food': {
        const { query, category } = args;
        debug(`Search request - Query: "${query}", Category: ${category || 'all'}`);
        let results = [];

        if (category) {
          // Search in specific category
          results = searchInCategory(data, category, query);
        } else {
          // Search in all categories
          const categories = Object.keys(data);
          debug(`Searching across ${categories.length} categories`);
          for (const cat of categories) {
            results.push(...searchInCategory(data, cat, query));
          }
        }

        info(`Search completed: ${results.length} results for "${query}"`);
        return {
          content: [
            {
              type: 'text',
              text: `Found ${results.length} results for "${query}"${category ? ` in category "${category}"` : ''}:\n\n` +
                    results.map(item => 
                      `🏷️ Category: ${item.category}\n` +
                      `🇹🇭 Thai: ${item.thai}\n` +
                      `🇩🇪 German: ${item.meaning_de}\n` +
                      `🇬🇧 English: ${item.meaning_en}\n` +
                      `📝 Transliteration (DE): ${item.trans_de}\n` +
                      `📝 Transliteration (EN): ${item.trans_en}\n`
                    ).join('\n---\n\n'),
            },
          ],
        };
      }

      case 'get_category': {
        const { category } = args;
        debug(`Get category request: ${category}`);
        
        if (!data[category]) {
          error(`Category "${category}" not found`);
          throw new McpError(ErrorCode.InvalidRequest, `Category "${category}" not found`);
        }

        const items = Object.entries(data[category]).map(([thai, details]) => ({
          thai,
          ...details
        }));

        info(`Category "${category}" retrieved: ${items.length} items`);
        return {
          content: [
            {
              type: 'text',
              text: `Category: ${category} (${items.length} items)\n\n` +
                    items.map(item => 
                      `🇹🇭 ${item.thai} → 🇩🇪 ${item.meaning_de} / 🇬🇧 ${item.meaning_en}\n` +
                      `   📝 ${item.trans_de} / ${item.trans_en}`
                    ).join('\n\n'),
            },
          ],
        };
      }

      case 'get_categories': {
        debug('Get categories request');
        const categories = Object.keys(data).map(key => {
          const count = Object.keys(data[key]).length;
          const displayName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return `• ${displayName} (${count} items)`;
        });

        info(`Categories list generated: ${categories.length} categories`);
        return {
          content: [
            {
              type: 'text',
              text: `Available Thai Food Dictionary Categories:\n\n${categories.join('\n')}`,
            },
          ],
        };
      }

      case 'translate_thai_word': {
        const { thai_word } = args;
        debug(`Translate request for: "${thai_word}"`);
        let found = null;
        let foundCategory = null;

        // Search for exact Thai word match
        for (const [category, items] of Object.entries(data)) {
          if (items[thai_word]) {
            found = items[thai_word];
            foundCategory = category;
            debug(`Found exact match in category: ${category}`);
            break;
          }
        }

        if (!found) {
          debug(`No exact match found for: "${thai_word}"`);
          return {
            content: [
              {
                type: 'text',
                text: `Thai word "${thai_word}" not found in dictionary. Try using the search function for partial matches.`,
              },
            ],
          };
        }

        info(`Translation found for "${thai_word}" in category "${foundCategory}"`);
        return {
          content: [
            {
              type: 'text',
              text: `Translation for "${thai_word}":\n\n` +
                    `🏷️ Category: ${foundCategory}\n` +
                    `🇹🇭 Thai: ${thai_word}\n` +
                    `🇩🇪 German: ${found.meaning_de}\n` +
                    `🇬🇧 English: ${found.meaning_en}\n` +
                    `📝 Transliteration (DE): ${found.trans_de}\n` +
                    `📝 Transliteration (EN): ${found.trans_en}`,
            },
          ],
        };
      }

      default:
        error(`Unknown tool requested: ${name}`);
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (err) {
    error(`Error handling tool call "${name}":`, err.message);
    error('Stack trace:', err.stack);
    throw err;
  }
});

// Start server
async function main() {
  try {
    info('Starting Thai Food Dictionary MCP Server...');
    debug('Node.js version:', process.version);
    debug('Current working directory:', process.cwd());
    debug('Command line arguments:', process.argv);
    
    const transport = new StdioServerTransport();
    debug('StdioServerTransport created');
    
    await server.connect(transport);
    info('Thai Food Dictionary MCP server connected and running on stdio');
    
    // Try to preload the data
    try {
      await fetchThaiFoodData();
      info('Thai Food Dictionary data preloaded successfully');
    } catch (err) {
      error('Failed to preload Thai Food Dictionary data:', err.message);
      info('Data will be loaded on first request');
    }
    
  } catch (err) {
    error('Failed to start MCP server:', err.message);
    error('Stack trace:', err.stack);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  error('Uncaught exception:', err.message);
  error('Stack trace:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

debug('Calling main function...');
main().catch((err) => {
  error('Fatal error in main():', err.message);
  error('Stack trace:', err.stack);
  process.exit(1);
});