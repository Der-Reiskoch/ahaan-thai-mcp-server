import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { logDebug, logError, logInfo } from './src/lib/logger.js';
import * as library from './src/lib/library-logic.js';

// Tool handlers
const listCookbooks = async () => {
  logDebug('=== LIST COOKBOOKS START ===');
  try {
    const cookbooks = await library.listCookbooks();
    logInfo('Listed cookbooks', { count: cookbooks.length });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(cookbooks, null, 2),
        },
      ],
    };
  } catch (error) {
    logError('=== LIST COOKBOOKS ERROR ===', { error: error.message });
    throw error;
  }
};

const getCookbookRecipes = async (cookbookName) => {
  logDebug('Executing getCookbookRecipes', { cookbookName });
  const cookbook = await library.getCookbookRecipes(cookbookName);

  logInfo('Retrieved cookbook recipes', { cookbookName, recipeCount: Object.keys(cookbook).length });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(cookbook, null, 2),
      },
    ],
  };
};

const searchRecipes = async (params) => {
  logDebug('Executing searchRecipes', { params });
  const results = await library.searchRecipes(params);

  logInfo('Search completed', {
    query: params.query,
    region: params.region,
    cookbook: params.cookbook,
    resultCount: results.total_results
  });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(results, null, 2),
      },
    ],
  };
};

const getRecipeByKey = async (cookbookName, recipeKey) => {
  logDebug('Executing getRecipeByKey', { cookbookName, recipeKey });
  const recipe = await library.getRecipeByKey(cookbookName, recipeKey);

  logInfo('Retrieved recipe by key', { cookbookName, recipeKey, recipeTitle: recipe.title_de || recipe.title_en });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(recipe, null, 2),
      },
    ],
  };
};

const getRecipesByRegion = async (region) => {
  logDebug('Executing getRecipesByRegion', { region });
  const results = await library.getRecipesByRegion(region);

  logInfo('Retrieved recipes by region', { region, recipeCount: results.total_recipes });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(results, null, 2),
      },
    ],
  };
};

const getCookbookStats = async () => {
  logDebug('Executing getCookbookStats');
  const stats = await library.getCookbookStats();

  logInfo('Generated cookbook stats', {
    totalCookbooks: stats.total_cookbooks,
    totalRecipes: stats.total_recipes,
    regions: stats.regions
  });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(stats, null, 2),
      },
    ],
  };
};

// Tool routing
const handleToolCall = async (request) => {
  const { name, arguments: args } = request.params;
  logDebug('=== TOOL CALL START ===', { toolName: name, args: JSON.stringify(args) });

  try {
    let result;
    switch (name) {
      case 'list_cookbooks':
        logDebug('Routing to listCookbooks');
        result = await listCookbooks();
        break;

      case 'get_cookbook_recipes':
        if (!args || typeof args.cookbook_name !== 'string') {
          logError('Invalid parameters for get_cookbook_recipes', { args });
          throw new McpError(ErrorCode.InvalidParams, 'cookbook_name is required');
        }
        logDebug('Routing to getCookbookRecipes', { cookbookName: args.cookbook_name });
        result = await getCookbookRecipes(args.cookbook_name);
        break;

      case 'search_recipes':
        logDebug('Routing to searchRecipes', { params: args || {} });
        result = await searchRecipes(args || {});
        break;

      case 'get_recipe_by_key':
        if (!args || typeof args.cookbook_name !== 'string' || typeof args.recipe_key !== 'string') {
          logError('Invalid parameters for get_recipe_by_key', { args });
          throw new McpError(ErrorCode.InvalidParams, 'cookbook_name and recipe_key are required');
        }
        logDebug('Routing to getRecipeByKey', { cookbookName: args.cookbook_name, recipeKey: args.recipe_key });
        result = await getRecipeByKey(args.cookbook_name, args.recipe_key);
        break;

      case 'get_recipes_by_region':
        if (!args || typeof args.region !== 'string') {
          logError('Invalid parameters for get_recipes_by_region', { args });
          throw new McpError(ErrorCode.InvalidParams, 'region is required');
        }
        logDebug('Routing to getRecipesByRegion', { region: args.region });
        result = await getRecipesByRegion(args.region);
        break;

      case 'get_cookbook_stats':
        logDebug('Routing to getCookbookStats');
        result = await getCookbookStats();
        break;

      default:
        logError('Unknown tool requested', { toolName: name });
        throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
    }

    logDebug('=== TOOL CALL SUCCESS ===', { toolName: name, resultType: typeof result });
    return result;

  } catch (error) {
    if (error instanceof McpError) {
      logError('=== TOOL CALL MCP ERROR ===', { toolName: name, error: error.message });
      throw error;
    }
    logError('=== TOOL CALL UNEXPECTED ERROR ===', {
      toolName: name,
      errorType: error.constructor.name,
      error: error.message,
      stack: error.stack
    });
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool ${name}: ${error.message}`
    );
  }
};

// Server setup
const createServer = () => {
  logDebug('Creating MCP server');
  const server = new Server(
    {
      name: 'thai-cookbook-library',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logDebug('Listing available tools');

    const tools = [];

    // Tool 0: list_cookbooks
    tools.push({
      name: 'list_cookbooks',
      description: 'List all available Thai cookbooks in the library',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    });

    // Tool 1: get_cookbook_recipes
    tools.push({
      name: 'get_cookbook_recipes',
      description: 'Get all recipes from a specific cookbook',
      inputSchema: {
        type: 'object',
        properties: {
          cookbook_name: {
            type: 'string',
            description: 'Name of the cookbook (e.g. "bangkok_original_streetfood")'
          }
        },
        required: ['cookbook_name']
      }
    });

    // Tool 2: search_recipes
    tools.push({
      name: 'search_recipes',
      description: 'Search for recipes based on various criteria',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term (searches in German and English titles as well as Thai names)'
          },
          region: {
            type: 'string',
            description: 'Filter by region (e.g. "central", "north", "south", "isaan")'
          },
          cookbook: {
            type: 'string',
            description: 'Filter by cookbook'
          }
        },
        required: []
      }
    });

    // Tool 3: get_recipe_by_key
    tools.push({
      name: 'get_recipe_by_key',
      description: 'Get a specific recipe by its key',
      inputSchema: {
        type: 'object',
        properties: {
          cookbook_name: {
            type: 'string',
            description: 'Name of the cookbook'
          },
          recipe_key: {
            type: 'string',
            description: 'Key of the recipe (e.g. "042 Miang Kham")'
          }
        },
        required: ['cookbook_name', 'recipe_key']
      }
    });

    // Tool 4: get_recipes_by_region
    tools.push({
      name: 'get_recipes_by_region',
      description: 'Get all recipes from a specific Thai region',
      inputSchema: {
        type: 'object',
        properties: {
          region: {
            type: 'string',
            description: 'Thai region (central, north, south, isaan)'
          }
        },
        required: ['region']
      }
    });

    // Tool 5: get_cookbook_stats
    tools.push({
      name: 'get_cookbook_stats',
      description: 'Get statistics about the cookbook library',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    });

    const response = { tools };
    logDebug('Full tools response:', JSON.stringify(response, null, 2));

    return response;
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, handleToolCall);

  logInfo('MCP server created successfully');
  return server;
};

// Main function
const run = async () => {
  try {
    logInfo('=== SERVER STARTUP ===', {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd()
    });

    logDebug('Creating server...');
    const server = createServer();

    logDebug('Creating transport...');
    const transport = new StdioServerTransport();

    logDebug('Connecting server to transport...');
    await server.connect(transport);

    logInfo('=== SERVER READY ===', { message: 'Thai Cookbook Library MCP Server running on stdio' });
  } catch (error) {
    logError('=== SERVER STARTUP FAILED ===', {
      errorType: error.constructor.name,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Start server
logInfo('=== BOOTSTRAP ===', { message: 'Starting Thai Cookbook Library MCP Server...' });
run().catch((error) => {
  logError('=== BOOTSTRAP FAILED ===', {
    errorType: error.constructor.name,
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});
