import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { logDebug, logError, logInfo } from './lib/logger.js';

// Global state
const API_URL = 'https://www.ahaan-thai.de/api/thai-cook-book-library.json';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// URL prefixes - as requested constants
const URL_PREFIX_DE_EN = 'https://www.ahaan-thai.de';
const IMAGE_URL_PREFIX = 'https://bilder.koch-reis.de/';

let cache = null;
let lastCacheUpdate = 0;

// Utility function to process recipe URLs
const processRecipeUrls = (recipe) => {
  const processedRecipe = { ...recipe };
  
  // Add URL prefixes for url_de and url_en if they exist and are relative
  if (processedRecipe.url_de && !processedRecipe.url_de.startsWith('http')) {
    processedRecipe.url_de = URL_PREFIX_DE_EN + (processedRecipe.url_de.startsWith('/') ? '' : '/') + processedRecipe.url_de;
  }
  
  if (processedRecipe.url_en && !processedRecipe.url_en.startsWith('http')) {
    processedRecipe.url_en = URL_PREFIX_DE_EN + (processedRecipe.url_en.startsWith('/') ? '' : '/') + processedRecipe.url_en;
  }
  
  // Add image URL prefix if imageUrl exists and is relative
  if (processedRecipe.imageUrl && !processedRecipe.imageUrl.startsWith('http')) {
    processedRecipe.imageUrl = IMAGE_URL_PREFIX + (processedRecipe.imageUrl.startsWith('/') ? processedRecipe.imageUrl.substring(1) : processedRecipe.imageUrl);
  }
  
  return processedRecipe;
};

// Utility function to process all recipes in a cookbook or result set
const processRecipesUrls = (recipes) => {
  if (Array.isArray(recipes)) {
    return recipes.map(processRecipeUrls);
  } else if (typeof recipes === 'object' && recipes !== null) {
    const processed = {};
    for (const [key, recipe] of Object.entries(recipes)) {
      processed[key] = processRecipeUrls(recipe);
    }
    return processed;
  }
  return recipes;
};

// Utility functions
const fetchCookbookData = async () => {
  const now = Date.now();
  
  logDebug('=== FETCH START ===', { now, lastCacheUpdate, cacheAge: now - lastCacheUpdate, cacheTTL: CACHE_TTL });
  
  // Cache check
  if (cache && (now - lastCacheUpdate) < CACHE_TTL) {
    logDebug('Using cached cookbook data', { cacheKeys: cache ? Object.keys(cache) : 'null' });
    return cache;
  }

  logInfo('Fetching cookbook data from API...', { url: API_URL });
  
  let response;
  let responseText;
  let responseJson;
  
  try {
    logDebug('About to call fetch()');
    response = await fetch(API_URL);
    logDebug('Fetch completed', { 
      ok: response.ok, 
      status: response.status, 
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      logError('HTTP Error Response', { status: response.status, statusText: response.statusText });
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    logDebug('Content-Type check', { contentType, includesJSON: contentType?.includes('application/json') });
    
    if (!contentType || !contentType.includes('application/json')) {
      logDebug('Getting response as text due to non-JSON content-type');
      responseText = await response.text();
      logError('API did not return JSON', { 
        contentType, 
        responseLength: responseText.length,
        responseStart: responseText.substring(0, 500),
        responseEnd: responseText.substring(Math.max(0, responseText.length - 100))
      });
      throw new Error(`API returned non-JSON response. Content-Type: ${contentType}`);
    }
    
    logDebug('About to parse JSON response');
    try {
      responseJson = await response.json();
      logDebug('JSON parsing successful', { 
        dataType: typeof responseJson,
        isArray: Array.isArray(responseJson),
        keys: responseJson && typeof responseJson === 'object' ? Object.keys(responseJson).slice(0, 10) : 'not-object'
      });
    } catch (jsonError) {
      logError('JSON parsing failed - getting response as text for debugging');
      // Try to get the raw text to see what we actually received
      const clonedResponse = response.clone();
      responseText = await clonedResponse.text();
      logError('JSON Parse Error Details', {
        jsonError: jsonError.message,
        responseLength: responseText.length,
        firstChar: responseText.charAt(0),
        firstCharCode: responseText.charCodeAt(0),
        first50Chars: responseText.substring(0, 50),
        last50Chars: responseText.substring(Math.max(0, responseText.length - 50)),
        fullResponse: responseText.length < 1000 ? responseText : 'too-long-to-log'
      });
      throw new Error(`JSON parsing failed: ${jsonError.message}`);
    }
    
    if (!responseJson || typeof responseJson !== 'object') {
      logError('Invalid data structure received', { 
        data: typeof responseJson,
        isNull: responseJson === null,
        isUndefined: responseJson === undefined,
        value: responseJson
      });
      throw new Error('Invalid data structure received from API');
    }
    
    // Process URLs for all recipes in all cookbooks
    const processedData = {};
    for (const [cookbookName, cookbook] of Object.entries(responseJson)) {
      processedData[cookbookName] = processRecipesUrls(cookbook);
    }
    
    cache = processedData;
    lastCacheUpdate = now;
    logInfo('Successfully fetched and cached cookbook data', { 
      cookbooks: Object.keys(processedData).length,
      totalRecipes: Object.values(processedData).reduce((sum, cookbook) => sum + Object.keys(cookbook).length, 0),
      sampleCookbooks: Object.keys(processedData).slice(0, 3)
    });
    return cache;
    
  } catch (error) {
    logError('=== FETCH ERROR ===', { 
      errorType: error.constructor.name,
      errorMessage: error.message, 
      url: API_URL,
      stack: error.stack,
      responseStatus: response?.status,
      responseStatusText: response?.statusText,
      responseHeaders: response ? Object.fromEntries(response.headers.entries()) : 'no-response'
    });
    
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to fetch cookbook data: ${error.message}`
    );
  }
};

// Tool handlers
const listCookbooks = async () => {
  logDebug('=== LIST COOKBOOKS START ===');
  try {
    const data = await fetchCookbookData();
    logDebug('Got cookbook data for listing', { dataType: typeof data, keys: Object.keys(data).slice(0, 5) });
    
    const cookbooks = Object.keys(data).map(name => ({
      name,
      recipe_count: Object.keys(data[name]).length,
      display_name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));

    logInfo('Listed cookbooks', { count: cookbooks.length });
    logDebug('=== LIST COOKBOOKS SUCCESS ===', { cookbooks: cookbooks.slice(0, 3) });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(cookbooks, null, 2),
        },
      ],
    };
  } catch (error) {
    logError('=== LIST COOKBOOKS ERROR ===', { error: error.message, stack: error.stack });
    throw error;
  }
};

const getCookbookRecipes = async (cookbookName) => {
  logDebug('Executing getCookbookRecipes', { cookbookName });
  const data = await fetchCookbookData();
  const cookbook = data[cookbookName];
  
  if (!cookbook) {
    logError('Cookbook not found', { cookbookName, availableCookbooks: Object.keys(data) });
    throw new McpError(ErrorCode.InvalidParams, `Cookbook "${cookbookName}" not found`);
  }

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
  const data = await fetchCookbookData();
  const { query, region, cookbook } = params;
  
  const results = [];
  
  for (const [cookbookName, cookbookData] of Object.entries(data)) {
    // Filter by cookbook if specified
    if (cookbook && cookbookName !== cookbook) continue;
    
    for (const [recipeKey, recipe] of Object.entries(cookbookData)) {
      // Filter by region if specified
      if (region && recipe.region !== region) continue;
      
      // Text search if specified
      if (query) {
        const searchText = `${recipe.title_de} ${recipe.title_en} ${recipe.transcript_de} ${recipe.thai}`.toLowerCase();
        if (!searchText.includes(query.toLowerCase())) continue;
      }
      
      results.push({
        ...recipe,
        cookbook: cookbookName,
        recipe_key: recipeKey
      });
    }
  }

  logInfo('Search completed', { 
    query, 
    region, 
    cookbook, 
    resultCount: results.length 
  });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          total_results: results.length,
          recipes: results
        }, null, 2),
      },
    ],
  };
};

const getRecipeByKey = async (cookbookName, recipeKey) => {
  logDebug('Executing getRecipeByKey', { cookbookName, recipeKey });
  const data = await fetchCookbookData();
  const cookbook = data[cookbookName];
  
  if (!cookbook) {
    logError('Cookbook not found for recipe lookup', { cookbookName });
    throw new McpError(ErrorCode.InvalidParams, `Cookbook "${cookbookName}" not found`);
  }
  
  const recipe = cookbook[recipeKey];
  if (!recipe) {
    logError('Recipe not found', { cookbookName, recipeKey, availableRecipes: Object.keys(cookbook) });
    throw new McpError(ErrorCode.InvalidParams, `Recipe "${recipeKey}" not found in cookbook "${cookbookName}"`);
  }

  logInfo('Retrieved recipe by key', { cookbookName, recipeKey, recipeTitle: recipe.title_de || recipe.title_en });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          ...recipe,
          cookbook: cookbookName,
          recipe_key: recipeKey
        }, null, 2),
      },
    ],
  };
};

const getRecipesByRegion = async (region) => {
  logDebug('Executing getRecipesByRegion', { region });
  const data = await fetchCookbookData();
  const results = [];
  
  for (const [cookbookName, cookbookData] of Object.entries(data)) {
    for (const [recipeKey, recipe] of Object.entries(cookbookData)) {
      if (recipe.region === region) {
        results.push({
          ...recipe,
          cookbook: cookbookName,
          recipe_key: recipeKey
        });
      }
    }
  }

  logInfo('Retrieved recipes by region', { region, recipeCount: results.length });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          region,
          total_recipes: results.length,
          recipes: results
        }, null, 2),
      },
    ],
  };
};

const getCookbookStats = async () => {
  logDebug('Executing getCookbookStats');
  const data = await fetchCookbookData();
  
  const stats = {
    total_cookbooks: Object.keys(data).length,
    total_recipes: 0,
    recipes_by_cookbook: {},
    recipes_by_region: {},
    regions: new Set(),
    cookbooks: Object.keys(data)
  };

  for (const [cookbookName, cookbookData] of Object.entries(data)) {
    const recipeCount = Object.keys(cookbookData).length;
    stats.total_recipes += recipeCount;
    stats.recipes_by_cookbook[cookbookName] = recipeCount;

    for (const recipe of Object.values(cookbookData)) {
      if (recipe.region) {
        stats.regions.add(recipe.region);
        stats.recipes_by_region[recipe.region] = (stats.recipes_by_region[recipe.region] || 0) + 1;
      }
    }
  }

  const result = {
    ...stats,
    regions: Array.from(stats.regions)
  };

  logInfo('Generated cookbook stats', { 
    totalCookbooks: result.total_cookbooks, 
    totalRecipes: result.total_recipes,
    regions: result.regions
  });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
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
    
    // Debug: Log each tool's inputSchema
    tools.forEach((tool, index) => {
      logDebug(`Tool ${index} (${tool.name}) inputSchema:`, JSON.stringify(tool.inputSchema));
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
      cwd: process.cwd(),
      urlPrefixDeEn: URL_PREFIX_DE_EN,
      imageUrlPrefix: IMAGE_URL_PREFIX
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