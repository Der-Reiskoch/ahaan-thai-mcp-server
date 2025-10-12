#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logDebug, logError, logInfo } from "./src/lib/logger.js";
import * as dictionary from "./src/lib/dictionary-logic.js";

// Create server
logDebug("Creating MCP Server instance...");
const server = new Server(
  {
    name: "thai-food-dictionary-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);
logInfo("MCP Server instance created successfully");

// List available tools - now with dynamic categories
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logDebug("Handling ListTools request");

  // Get available categories dynamically
  const categories = await dictionary.getCategories();
  logDebug(`Building tools with ${categories.length} dynamic categories`);

  const tools = [
    {
      name: "search_thai_food",
      description:
        "Search for Thai food terms by German, English, Thai text, or transliteration",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search term (can be in German, English, Thai, or transliteration)",
          },
          category: {
            type: "string",
            description: "Optional: specific category to search in",
            enum: categories,
          },
        },
        required: ["query"],
      },
    },
    {
      name: "get_category",
      description:
        "Get all items from a specific category of Thai food dictionary",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Category name",
            enum: categories,
          },
        },
        required: ["category"],
      },
    },
    {
      name: "get_categories",
      description: "List all available categories in the Thai food dictionary",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "translate_thai_word",
      description: "Get translation and details for a specific Thai word",
      inputSchema: {
        type: "object",
        properties: {
          thai_word: {
            type: "string",
            description: "Thai word to translate",
          },
        },
        required: ["thai_word"],
      },
    },
  ];

  logDebug(`Returning ${tools.length} available tools with dynamic categories`);
  return { tools };
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  logDebug("Handling ListResources request");
  const resources = [
    {
      uri: "thai-food://dictionary/full",
      mimeType: "application/json",
      name: "Complete Thai Food Dictionary",
      description: "The complete Thai food dictionary data from ahaan-thai.de",
    },
    {
      uri: "thai-food://categories/list",
      mimeType: "application/json",
      name: "Thai Food Categories",
      description: "List of all available categories in the dictionary",
    },
  ];

  logDebug(`Returning ${resources.length} available resources`);
  return { resources };
});

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  logDebug(`Handling ReadResource request for URI: ${uri}`);

  try {
    switch (uri) {
      case "thai-food://dictionary/full":
        logDebug("Returning full dictionary data");
        const data = await dictionary.fetchDictionary();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };

      case "thai-food://categories/list":
        logDebug("Generating categories list");
        const categories = await dictionary.getCategoryList();
        logDebug(`Generated list of ${categories.length} categories`);
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(categories, null, 2),
            },
          ],
        };

      default:
        logError(`Unknown resource requested: ${uri}`);
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unknown resource: ${uri}`
        );
    }
  } catch (err) {
    logError(`Error handling ReadResource for ${uri}:`, err.message);
    throw err;
  }
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logDebug(`Handling tool call: ${name}`, args);

  try {
    switch (name) {
      case "search_thai_food": {
        const { query, category } = args;
        logDebug(
          `Search request - Query: "${query}", Category: ${category || "all"}`
        );

        const results = await dictionary.searchDictionary(query, category);

        logInfo(`Search completed: ${results.length} results for "${query}"`);
        return {
          content: [
            {
              type: "text",
              text:
                `Found ${results.length} results for "${query}"${
                  category ? ` in category "${category}"` : ""
                }:\n\n` +
                results
                  .map(
                    (item) =>
                      `🏷️ Category: ${item.category}\n` +
                      `🇹🇭 Thai: ${item.thai}\n` +
                      `🇩🇪 German: ${item.meaning_de}\n` +
                      `🇬🇧 English: ${item.meaning_en}\n` +
                      `📝 Transliteration (DE): ${item.trans_de}\n` +
                      `📝 Transliteration (EN): ${item.trans_en}\n`
                  )
                  .join("\n---\n\n"),
            },
          ],
        };
      }

      case "get_category": {
        const { category } = args;
        logDebug(`Get category request: ${category}`);

        const items = await dictionary.getCategory(category);

        logInfo(`Category "${category}" retrieved: ${items.length} items`);
        return {
          content: [
            {
              type: "text",
              text:
                `Category: ${category} (${items.length} items)\n\n` +
                items
                  .map(
                    (item) =>
                      `🇹🇭 ${item.thai} → 🇩🇪 ${item.meaning_de} / 🇬🇧 ${item.meaning_en}\n` +
                      `   📝 ${item.trans_de} / ${item.trans_en}`
                  )
                  .join("\n\n"),
            },
          ],
        };
      }

      case "get_categories": {
        logDebug("Get categories request");
        const categories = await dictionary.getCategoryList();

        const formattedCategories = categories.map((cat) =>
          `• ${cat.name} (${cat.count} items)`
        );

        logInfo(`Categories list generated: ${categories.length} categories`);
        return {
          content: [
            {
              type: "text",
              text: `Available Thai Food Dictionary Categories:\n\n${formattedCategories.join(
                "\n"
              )}`,
            },
          ],
        };
      }

      case "translate_thai_word": {
        const { thai_word } = args;
        logDebug(`Translate request for: "${thai_word}"`);

        const found = await dictionary.translateWord(thai_word);

        if (!found) {
          logDebug(`No exact match found for: "${thai_word}"`);
          return {
            content: [
              {
                type: "text",
                text: `Thai word "${thai_word}" not found in dictionary. Try using the search function for partial matches.`,
              },
            ],
          };
        }

        logInfo(
          `Translation found for "${thai_word}" in category "${found.category}"`
        );
        return {
          content: [
            {
              type: "text",
              text:
                `Translation for "${thai_word}":\n\n` +
                `🏷️ Category: ${found.category}\n` +
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
        logError(`Unknown tool requested: ${name}`);
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (err) {
    logError(`Error handling tool call "${name}":`, err.message);
    logError("Stack trace:", err.stack);
    throw err;
  }
});

// Start server
async function main() {
  try {
    logInfo("Starting Thai Food Dictionary MCP Server...");
    logDebug("Node.js version:", process.version);
    logDebug("Current working directory:", process.cwd());
    logDebug("Command line arguments:", process.argv);

    const transport = new StdioServerTransport();
    logDebug("StdioServerTransport created");

    await server.connect(transport);
    logInfo("Thai Food Dictionary MCP server connected and running on stdio");

    // Try to preload the data and categories
    try {
      await dictionary.fetchDictionary();
      const categories = await dictionary.getCategories();
      logInfo(`Thai Food Dictionary data preloaded successfully with ${categories.length} categories`);
      logDebug("Available categories:", categories);
    } catch (err) {
      logError("Failed to preload Thai Food Dictionary data:", err.message);
      logInfo("Data will be loaded on first request");
    }
  } catch (err) {
    logError("Failed to start MCP server:", err.message);
    logError("Stack trace:", err.stack);
    process.exit(1);
  }
}

// Handle process termination
process.on("SIGINT", () => {
  logInfo("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logInfo("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

process.on("uncaughtException", (err) => {
  logError("Uncaught exception:", err.message);
  logError("Stack trace:", err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logError("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

logDebug("Calling main function...");
main().catch((err) => {
  logError("Fatal error in main():", err.message);
  logError("Stack trace:", err.stack);
  process.exit(1);
});
