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
import * as encyclopedia from "./src/lib/encyclopedia-logic.js";

// Removed inline implementation - using shared library logic

// Create and configure the server
const server = new Server(
  {
    name: "thai-food-encyclopedia-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  logDebug("Handling ListResources request");

  return {
    resources: [
      {
        uri: "encyclopedia://entries",
        mimeType: "application/json",
        name: "All Encyclopedia Entries",
        description: "Complete Thai Food Encyclopedia data",
      },
    ],
  };
});

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  logDebug(`Reading resource: ${request.params.uri}`);

  if (request.params.uri === "encyclopedia://entries") {
    const data = await encyclopedia.fetchEncyclopedia();
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  throw new McpError(
    ErrorCode.InvalidRequest,
    `Unknown resource: ${request.params.uri}`
  );
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logDebug("Handling ListTools request");

  return {
    tools: [
      {
        name: "search_encyclopedia",
        description:
          "Search the Thai Food Encyclopedia for dishes, ingredients, or cooking methods",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Search term to look for in names, descriptions, tags, and regions",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 20)",
              default: 20,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_entries_by_region",
        description: "Get encyclopedia entries for a specific Thai region",
        inputSchema: {
          type: "object",
          properties: {
            region: {
              type: "string",
              description:
                "Thai region name (e.g., 'Bangkok', 'Isaan', 'Northern Thailand')",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 20)",
              default: 20,
            },
          },
          required: ["region"],
        },
      },
      {
        name: "get_entries_by_tag",
        description:
          "Get encyclopedia entries filtered by tag (e.g., cooking method, ingredient type)",
        inputSchema: {
          type: "object",
          properties: {
            tag: {
              type: "string",
              description:
                "Tag to filter by (e.g., 'curry', 'noodles', 'dessert', 'spicy')",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 20)",
              default: 20,
            },
          },
          required: ["tag"],
        },
      },
      {
        name: "get_all_entries",
        description:
          "Get all encyclopedia entries (use with caution for large datasets)",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of entries to return (default: 100)",
              default: 100,
            },
          },
        },
      },
      {
        name: "list_regions",
        description:
          "Get a list of all unique Thai regions found in the encyclopedia",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_relationships",
        description:
          "Get a list of all relationship field types with German and English translations",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logDebug(`Calling tool: ${name}`, args);

  try {
    switch (name) {
      case "search_encyclopedia": {
        const { query, limit = 20 } = args;
        if (!query) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "Query parameter is required"
          );
        }

        const results = await encyclopedia.searchEntries(query, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "get_entries_by_region": {
        const { region, limit = 20 } = args;
        if (!region) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "Region parameter is required"
          );
        }

        const results = await encyclopedia.getEntriesByRegion(region, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "get_entries_by_tag": {
        const { tag, limit = 20 } = args;
        if (!tag) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "Tag parameter is required"
          );
        }

        const results = await encyclopedia.getEntriesByTag(tag, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "get_all_entries": {
        const { limit = 100 } = args;
        const results = await encyclopedia.getAllEntries(limit);

        logInfo(`Returning ${results.length} encyclopedia entries`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "list_regions": {
        const regions = await encyclopedia.getAllRegions();

        logInfo(`Returning ${Object.keys(regions).length} unique regions`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(regions, null, 2),
            },
          ],
        };
      }

      case "list_relationships": {
        const relationships = await encyclopedia.getRelationshipTypes();

        logInfo(
          `Returning ${Object.keys(relationships).length} relationship types`
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(relationships, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    logError(`Error calling tool ${name}:`, error.message);
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Tool ${name} failed: ${error.message}`
    );
  }
});

// Initialize and start server
async function main() {
  logDebug("Creating MCP Server instance...");

  try {
    logInfo("MCP Server instance created successfully");
    logDebug("Calling main function...");
    logInfo("Starting Thai Food Encyclopedia MCP Server...");
    logDebug(`Node.js version: ${process.version}`);
    logDebug(`Current working directory: ${process.cwd()}`);
    logDebug(`Command line arguments:`, process.argv);

    const transport = new StdioServerTransport();
    logDebug("StdioServerTransport created");

    await server.connect(transport);
    logInfo("Thai Food Encyclopedia MCP server connected and running on stdio");

    // Pre-load data
    await encyclopedia.fetchEncyclopedia();
    logInfo("Thai Food Encyclopedia data preloaded successfully");
  } catch (error) {
    logError("Failed to start server:", error);
    process.exit(1);
  }
}

main();
