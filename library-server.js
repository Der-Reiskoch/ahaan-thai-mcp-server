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

// Book Info handlers (merged from book-info-server)
const listBooks = async () => {
  logDebug('Executing listBooks');
  const books = await library.listBooks();

  logInfo('Listed books', { count: books.length });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(books, null, 2),
      },
    ],
  };
};

const getBookInfo = async (cookbookName) => {
  logDebug('Executing getBookInfo', { cookbookName });
  const bookInfo = await library.getBookInfo(cookbookName);

  logInfo('Retrieved book info', { cookbookName });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(bookInfo, null, 2),
      },
    ],
  };
};

const searchBooks = async (filters) => {
  logDebug('Executing searchBooks', { filters });
  const results = await library.searchBooks(filters || {});

  logInfo('Search books completed', { resultCount: results.length });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(results, null, 2),
      },
    ],
  };
};

const getBookByIsbn = async (isbn) => {
  logDebug('Executing getBookByIsbn', { isbn });
  const book = await library.getBookByIsbn(isbn);

  logInfo('Retrieved book by ISBN', { isbn });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(book, null, 2),
      },
    ],
  };
};

const getBooksByAuthor = async (authorName) => {
  logDebug('Executing getBooksByAuthor', { authorName });
  const books = await library.getBooksByAuthor(authorName);

  logInfo('Retrieved books by author', { authorName, count: books.length });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(books, null, 2),
      },
    ],
  };
};

const getBooksByLanguage = async (language) => {
  logDebug('Executing getBooksByLanguage', { language });
  const books = await library.getBooksByLanguage(language);

  logInfo('Retrieved books by language', { language, count: books.length });
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(books, null, 2),
      },
    ],
  };
};

const getBookStatistics = async () => {
  logDebug('Executing getBookStatistics');
  const stats = await library.getBookStatistics();

  logInfo('Generated book statistics', { totalBooks: stats.total_books });
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

      case 'list_books':
        logDebug('Routing to listBooks');
        result = await listBooks();
        break;

      case 'get_book_info':
        if (!args || typeof args.cookbook_name !== 'string') {
          logError('Invalid parameters for get_book_info', { args });
          throw new McpError(ErrorCode.InvalidParams, 'cookbook_name is required');
        }
        logDebug('Routing to getBookInfo', { cookbookName: args.cookbook_name });
        result = await getBookInfo(args.cookbook_name);
        break;

      case 'search_books':
        logDebug('Routing to searchBooks', { filters: args || {} });
        result = await searchBooks(args || {});
        break;

      case 'get_book_by_isbn':
        if (!args || typeof args.isbn !== 'string') {
          logError('Invalid parameters for get_book_by_isbn', { args });
          throw new McpError(ErrorCode.InvalidParams, 'isbn is required');
        }
        logDebug('Routing to getBookByIsbn', { isbn: args.isbn });
        result = await getBookByIsbn(args.isbn);
        break;

      case 'get_books_by_author':
        if (!args || typeof args.author_name !== 'string') {
          logError('Invalid parameters for get_books_by_author', { args });
          throw new McpError(ErrorCode.InvalidParams, 'author_name is required');
        }
        logDebug('Routing to getBooksByAuthor', { authorName: args.author_name });
        result = await getBooksByAuthor(args.author_name);
        break;

      case 'get_books_by_language':
        if (!args || typeof args.language !== 'string') {
          logError('Invalid parameters for get_books_by_language', { args });
          throw new McpError(ErrorCode.InvalidParams, 'language is required');
        }
        logDebug('Routing to getBooksByLanguage', { language: args.language });
        result = await getBooksByLanguage(args.language);
        break;

      case 'get_book_statistics':
        logDebug('Routing to getBookStatistics');
        result = await getBookStatistics();
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

    // Tool 6: list_books
    tools.push({
      name: 'list_books',
      description: 'List all available Thai cookbook editions (bilingual: German and English)',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    });

    // Tool 7: get_book_info
    tools.push({
      name: 'get_book_info',
      description: 'Get bilingual book info for a specific cookbook (both German and English editions if available)',
      inputSchema: {
        type: 'object',
        properties: {
          cookbook_name: {
            type: 'string',
            description: 'Name of the cookbook (e.g. "pok_pok", "thailand_the_cookbook")'
          }
        },
        required: ['cookbook_name']
      }
    });

    // Tool 8: search_books
    tools.push({
      name: 'search_books',
      description: 'Search for cookbook editions based on various criteria',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search term (searches in title, author, description)'
          },
          language: {
            type: 'string',
            description: 'Filter by language (de or en)'
          },
          level: {
            type: 'string',
            description: 'Filter by difficulty level'
          },
          author: {
            type: 'string',
            description: 'Filter by author name'
          },
          year: {
            type: 'string',
            description: 'Filter by publication year'
          },
          publisher: {
            type: 'string',
            description: 'Filter by publisher'
          }
        },
        required: []
      }
    });

    // Tool 9: get_book_by_isbn
    tools.push({
      name: 'get_book_by_isbn',
      description: 'Get book information by ISBN',
      inputSchema: {
        type: 'object',
        properties: {
          isbn: {
            type: 'string',
            description: 'ISBN of the book'
          }
        },
        required: ['isbn']
      }
    });

    // Tool 10: get_books_by_author
    tools.push({
      name: 'get_books_by_author',
      description: 'Get all cookbook editions by a specific author',
      inputSchema: {
        type: 'object',
        properties: {
          author_name: {
            type: 'string',
            description: 'Name of the author (e.g. "Andy Ricker", "Leela Punyaratabandhu")'
          }
        },
        required: ['author_name']
      }
    });

    // Tool 11: get_books_by_language
    tools.push({
      name: 'get_books_by_language',
      description: 'Get all cookbook editions in a specific language',
      inputSchema: {
        type: 'object',
        properties: {
          language: {
            type: 'string',
            description: 'Language code (de for German, en for English)'
          }
        },
        required: ['language']
      }
    });

    // Tool 12: get_book_statistics
    tools.push({
      name: 'get_book_statistics',
      description: 'Get statistics about cookbook editions (languages, authors, publishers, etc.)',
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
