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
import { logDebug, logError, logInfo } from "./lib/logger.js";

const THAI_FOOD_ENCYCLOPEDIA_API_URL =
  "https://www.ahaan-thai.de/api/thai-food-encyclopedia.json";
const BASE_URL = "https://www.ahaan-thai.de";
const IMAGE_BASE_URL = "https://bilder.koch-reis.de/";

// Thai Food Encyclopedia Data Cache
let encyclopediaData = null;

// Transform recipe links to full URLs based on their type
function transformRecipeLink(link) {
  // Already a full URL - return as is
  if (link.startsWith('http://') || link.startsWith('https://')) {
    return link;
  }

  // Reiskoch links: /reiskoch/... -> https://www.der-reiskoch.de/...
  if (link.startsWith('/reiskoch/')) {
    return link.replace('/reiskoch/', 'https://www.der-reiskoch.de/');
  }

  // PDF links: /aa-pdf/... -> /pdf/andreas-ayasse/...
  if (link.startsWith('/aa-pdf/')) {
    return BASE_URL + link.replace('/aa-pdf/', '/pdf/andreas-ayasse/');
  }

  // YouTube links: /youtube/... -> https://www.youtube.com/watch?v=...
  if (link.startsWith('/youtube/')) {
    const videoId = link.replace('/youtube/', '');
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  // All other internal links (cookbooks, etc.) - prepend base URL
  return BASE_URL + link;
}

// Process encyclopedia entry to transform recipe links and image URLs
function processEntry(entry) {
  const processed = { ...entry };

  // Transform German recipes
  if (processed.de && processed.de.recipes) {
    processed.de.recipes = processed.de.recipes.map(transformRecipeLink);
  }

  // Transform English recipes
  if (processed.en && processed.en.recipes) {
    processed.en.recipes = processed.en.recipes.map(transformRecipeLink);
  }

  // Transform image URL
  if (processed.imageUrl && !processed.imageUrl.startsWith('http')) {
    processed.imageUrl = IMAGE_BASE_URL + processed.imageUrl;
  }

  return processed;
}

// Fetch the Thai Food Encyclopedia data
async function fetchEncyclopediaData() {
  if (!encyclopediaData) {
    try {
      logDebug("Fetching Thai Food Encyclopedia data from API...");
      // Use dynamic import for fetch in Node.js
      const fetch = (await import("node-fetch")).default;
      logDebug("Node-fetch imported successfully");

      const response = await fetch(THAI_FOOD_ENCYCLOPEDIA_API_URL);
      logDebug(
        `API response status: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        logError(`HTTP ${response.status}: ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();

      // Transform all entries to include full recipe URLs
      encyclopediaData = rawData.map(processEntry);

      logInfo(`Thai Food Encyclopedia loaded successfully:`);
      logInfo(`- Total entries: ${encyclopediaData.length}`);
      logDebug("Encyclopedia data loaded with entries for dishes, ingredients, and cooking methods");
    } catch (err) {
      logError("Failed to fetch Thai Food Encyclopedia data:", err.message);
      logError("Stack trace:", err.stack);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch Thai Food Encyclopedia data: ${err.message}`
      );
    }
  } else {
    logDebug("Using cached Thai Food Encyclopedia data");
  }
  return encyclopediaData;
}

// Helper function to search entries
function searchEntries(data, searchTerm, limit = 20) {
  logDebug(`Searching encyclopedia for term "${searchTerm}" with limit ${limit}`);
  
  const results = [];
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  for (const entry of data) {
    // Search in multiple fields based on actual API structure
    const matches = [
      // Thai name
      entry.thaiName && entry.thaiName.toLowerCase().includes(lowerSearchTerm),
      // Alternative names
      entry.alternativeNames && entry.alternativeNames.some(name => 
        name.toLowerCase().includes(lowerSearchTerm)
      ),
      // German fields
      entry.de && entry.de.transcription && entry.de.transcription.toLowerCase().includes(lowerSearchTerm),
      entry.de && entry.de.summary && entry.de.summary.toLowerCase().includes(lowerSearchTerm),
      entry.de && entry.de.description && entry.de.description.toLowerCase().includes(lowerSearchTerm),
      entry.de && entry.de.tags && entry.de.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)),
      entry.de && entry.de.regions && entry.de.regions.some(region => region.toLowerCase().includes(lowerSearchTerm)),
      // English fields
      entry.en && entry.en.transcription && entry.en.transcription.toLowerCase().includes(lowerSearchTerm),
      entry.en && entry.en.summary && entry.en.summary.toLowerCase().includes(lowerSearchTerm),
      entry.en && entry.en.description && entry.en.description.toLowerCase().includes(lowerSearchTerm),
      entry.en && entry.en.tags && entry.en.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)),
      entry.en && entry.en.regions && entry.en.regions.some(region => region.toLowerCase().includes(lowerSearchTerm)),
    ];

    if (matches.some(match => match)) {
      results.push(entry);
      if (results.length >= limit) {
        break;
      }
    }
  }

  logDebug(`Found ${results.length} matching entries`);
  return results;
}

// Helper function to get entries by region
function getEntriesByRegion(data, region, limit = 20) {
  logDebug(`Getting entries for region "${region}" with limit ${limit}`);
  
  const results = data.filter(entry => {
    const regionLower = region.toLowerCase();
    return (
      (entry.de && entry.de.regions && entry.de.regions.some(r => 
        r.toLowerCase().includes(regionLower)
      )) ||
      (entry.en && entry.en.regions && entry.en.regions.some(r => 
        r.toLowerCase().includes(regionLower)
      ))
    );
  }).slice(0, limit);
  
  logDebug(`Found ${results.length} entries for region "${region}"`);
  return results;
}

// Helper function to get entries by tag
function getEntriesByTag(data, tag, limit = 20) {
  logDebug(`Getting entries with tag "${tag}" with limit ${limit}`);
  
  const results = data.filter(entry => {
    const tagLower = tag.toLowerCase();
    return (
      (entry.de && entry.de.tags && entry.de.tags.some(t => 
        t.toLowerCase().includes(tagLower)
      )) ||
      (entry.en && entry.en.tags && entry.en.tags.some(t => 
        t.toLowerCase().includes(tagLower)
      ))
    );
  }).slice(0, limit);
  
  logDebug(`Found ${results.length} entries with tag "${tag}"`);
  return results;
}

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
    const data = await fetchEncyclopediaData();
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
        description: "Search the Thai Food Encyclopedia for dishes, ingredients, or cooking methods",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search term to look for in names, descriptions, tags, and regions",
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
              description: "Thai region name (e.g., 'Bangkok', 'Isaan', 'Northern Thailand')",
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
        description: "Get encyclopedia entries filtered by tag (e.g., cooking method, ingredient type)",
        inputSchema: {
          type: "object",
          properties: {
            tag: {
              type: "string",
              description: "Tag to filter by (e.g., 'curry', 'noodles', 'dessert', 'spicy')",
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
        description: "Get all encyclopedia entries (use with caution for large datasets)",
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
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logDebug(`Calling tool: ${name}`, args);

  try {
    const data = await fetchEncyclopediaData();

    switch (name) {
      case "search_encyclopedia": {
        const { query, limit = 20 } = args;
        if (!query) {
          throw new McpError(ErrorCode.InvalidRequest, "Query parameter is required");
        }
        
        const results = searchEntries(data, query, limit);
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
          throw new McpError(ErrorCode.InvalidRequest, "Region parameter is required");
        }
        
        const results = getEntriesByRegion(data, region, limit);
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
          throw new McpError(ErrorCode.InvalidRequest, "Tag parameter is required");
        }
        
        const results = getEntriesByTag(data, tag, limit);
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
        const results = data.slice(0, limit);
        
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

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    logError(`Error calling tool ${name}:`, error.message);
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(ErrorCode.InternalError, `Tool ${name} failed: ${error.message}`);
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
    await fetchEncyclopediaData();
    logInfo("Thai Food Encyclopedia data preloaded successfully");
  } catch (error) {
    logError("Failed to start server:", error);
    process.exit(1);
  }
}

main();