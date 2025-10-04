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
const IMAGE_BASE_URL = "https://bilder.koch-reis.de/media/";

// Thai Food Encyclopedia Data Cache
let encyclopediaData = null;

// Transform recipe links to full URLs based on their type
function transformRecipeLink(link) {
  // External links with autotranslation: ?trans=TH-DE, &trans=TH-DE, ?trans=TH-EN, &trans=TH-EN
  // Remove trans param and wrap with Google Translate URL
  if (
    (link.startsWith("http://") || link.startsWith("https://")) &&
    /trans=TH-(DE|EN)/.test(link)
  ) {
    // Extract target language (DE or EN)
    const targetLang = link.includes("trans=TH-DE") ? "de" : "en";
    const transParam = `trans=TH-${targetLang.toUpperCase()}`;

    // Remove trans parameter - handle both ?trans=... and &trans=...
    let cleanUrl = link.replace(new RegExp(`\\?${transParam}(&|$)`), "?"); // ?trans=...& -> ? or ?trans=...$ -> (empty)
    cleanUrl = cleanUrl.replace(new RegExp(`&${transParam}`), ""); // &trans=... -> (empty)
    cleanUrl = cleanUrl.replace(/\?$/, ""); // Remove trailing ? if no other params

    return `https://translate.google.com/translate?sl=th&tl=${targetLang}&js=y&prev=_t&hl=${targetLang}&ie=UTF-8&u=${encodeURIComponent(
      cleanUrl
    )}`;
  }

  // Already a full URL - return as is
  if (link.startsWith("http://") || link.startsWith("https://")) {
    return link;
  }

  // Reiskoch links: /reiskoch/... -> https://www.der-reiskoch.de/...
  if (link.startsWith("/reiskoch/")) {
    return link.replace("/reiskoch/", "https://www.der-reiskoch.de/");
  }

  // PDF links: /aa-pdf/... -> /pdf/andreas-ayasse/...
  if (link.startsWith("/aa-pdf/")) {
    return BASE_URL + link.replace("/aa-pdf/", "/pdf/andreas-ayasse/");
  }

  // YouTube links: /youtube/... -> https://www.youtube.com/watch?v=...
  if (link.startsWith("/youtube/")) {
    const videoId = link.replace("/youtube/", "");
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  // All other internal links (cookbooks, etc.) - prepend base URL
  return BASE_URL + link;
}

// Ensure relationship links end with /
function ensureTrailingSlash(url) {
  // Don't add trailing slash to:
  // - URLs with hash fragments (#)
  // - URLs with query strings (?)
  if (url.includes("#") || url.includes("?")) {
    return url;
  }

  // Add trailing slash if not present
  return url.endsWith("/") ? url : url + "/";
}

// Transform URL or array of URLs
function transformUrl(urlOrArray, addTrailingSlash = false) {
  if (Array.isArray(urlOrArray)) {
    return urlOrArray.map((url) => {
      const transformed = transformRecipeLink(url);
      return addTrailingSlash ? ensureTrailingSlash(transformed) : transformed;
    });
  }
  const transformed = transformRecipeLink(urlOrArray);
  return addTrailingSlash ? ensureTrailingSlash(transformed) : transformed;
}

// Process encyclopedia entry to transform all URLs (recipe links, relationship links, and image URLs)
function processEntry(entry) {
  const processed = { ...entry };

  // Recipe fields (don't add trailing slash - can have #anchors)
  const recipeFields = ["recipes"];

  // Relationship fields (add trailing slash if missing)
  const relationshipFields = [
    "url",
    "usedBy",
    "uses",
    "fits",
    "fittedBy",
    "variations",
    "variationOf",
  ];

  // Transform German URL fields
  if (processed.de) {
    recipeFields.forEach((field) => {
      if (processed.de[field]) {
        processed.de[field] = transformUrl(processed.de[field], false);
      }
    });
    relationshipFields.forEach((field) => {
      if (processed.de[field]) {
        processed.de[field] = transformUrl(processed.de[field], true);
      }
    });
  }

  // Transform English URL fields
  if (processed.en) {
    recipeFields.forEach((field) => {
      if (processed.en[field]) {
        processed.en[field] = transformUrl(processed.en[field], false);
      }
    });
    relationshipFields.forEach((field) => {
      if (processed.en[field]) {
        processed.en[field] = transformUrl(processed.en[field], true);
      }
    });
  }

  // Transform image URL
  if (processed.imageUrl && !processed.imageUrl.startsWith("http")) {
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
      logDebug(
        "Encyclopedia data loaded with entries for dishes, ingredients, and cooking methods"
      );
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
  logDebug(
    `Searching encyclopedia for term "${searchTerm}" with limit ${limit}`
  );

  const results = [];
  const lowerSearchTerm = searchTerm.toLowerCase();

  for (const entry of data) {
    // Search in multiple fields based on actual API structure
    const matches = [
      // Thai name
      entry.thaiName && entry.thaiName.toLowerCase().includes(lowerSearchTerm),
      // Alternative names
      entry.alternativeNames &&
        entry.alternativeNames.some((name) =>
          name.toLowerCase().includes(lowerSearchTerm)
        ),
      // German fields
      entry.de &&
        entry.de.transcription &&
        entry.de.transcription.toLowerCase().includes(lowerSearchTerm),
      entry.de &&
        entry.de.summary &&
        entry.de.summary.toLowerCase().includes(lowerSearchTerm),
      entry.de &&
        entry.de.description &&
        entry.de.description.toLowerCase().includes(lowerSearchTerm),
      entry.de &&
        entry.de.tags &&
        entry.de.tags.some((tag) =>
          tag.toLowerCase().includes(lowerSearchTerm)
        ),
      entry.de &&
        entry.de.regions &&
        entry.de.regions.some((region) =>
          region.toLowerCase().includes(lowerSearchTerm)
        ),
      // English fields
      entry.en &&
        entry.en.transcription &&
        entry.en.transcription.toLowerCase().includes(lowerSearchTerm),
      entry.en &&
        entry.en.summary &&
        entry.en.summary.toLowerCase().includes(lowerSearchTerm),
      entry.en &&
        entry.en.description &&
        entry.en.description.toLowerCase().includes(lowerSearchTerm),
      entry.en &&
        entry.en.tags &&
        entry.en.tags.some((tag) =>
          tag.toLowerCase().includes(lowerSearchTerm)
        ),
      entry.en &&
        entry.en.regions &&
        entry.en.regions.some((region) =>
          region.toLowerCase().includes(lowerSearchTerm)
        ),
    ];

    if (matches.some((match) => match)) {
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

  const results = data
    .filter((entry) => {
      const regionLower = region.toLowerCase();
      return (
        (entry.de &&
          entry.de.regions &&
          entry.de.regions.some((r) =>
            r.toLowerCase().includes(regionLower)
          )) ||
        (entry.en &&
          entry.en.regions &&
          entry.en.regions.some((r) => r.toLowerCase().includes(regionLower)))
      );
    })
    .slice(0, limit);

  logDebug(`Found ${results.length} entries for region "${region}"`);
  return results;
}

// Helper function to get entries by tag
function getEntriesByTag(data, tag, limit = 20) {
  logDebug(`Getting entries with tag "${tag}" with limit ${limit}`);

  const results = data
    .filter((entry) => {
      const tagLower = tag.toLowerCase();
      return (
        (entry.de &&
          entry.de.tags &&
          entry.de.tags.some((t) => t.toLowerCase().includes(tagLower))) ||
        (entry.en &&
          entry.en.tags &&
          entry.en.tags.some((t) => t.toLowerCase().includes(tagLower)))
      );
    })
    .slice(0, limit);

  logDebug(`Found ${results.length} entries with tag "${tag}"`);
  return results;
}

// Helper function to get all unique regions with translations from Thai food dictionary
function getAllRegions(data) {
  logDebug("Extracting standardized regions from Thai food dictionary");

  // Define the 4 main Thai regions as a map with Thai names and translations
  // Data from Thai food dictionary (ภาคกลาง, ภาคเหนือ, ภาคอีสาน, ปักษ์ใต้)
  // API data now uses canonical keys: zentralthailand, nordthailand, nordostthailand, suedthailand (DE)
  // and central-thailand, northern-thailand, northeastern-thailand, southern-thailand (EN)
  const regions = {
    central: {
      key_de: "zentralthailand",
      key_en: "central-thailand",
      thai: "ภาคกลาง",
      trans_de: "Phak Klang",
      trans_en: "Phak Klang",
      title_de: "Zentralthailand",
      title_en: "Central Thailand",
    },
    north: {
      key_de: "nordthailand",
      key_en: "northern-thailand",
      thai: "ภาคเหนือ",
      trans_de: "Phak Nuea",
      trans_en: "Phak Nuea",
      title_de: "Nordthailand",
      title_en: "Northern Thailand",
    },
    isaan: {
      key_de: "nordostthailand",
      key_en: "northeastern-thailand",
      thai: "ภาคอีสาน",
      trans_de: "Phak Isan",
      trans_en: "Phak Isan",
      title_de: "Nordostthailand (Isaan)",
      title_en: "Northeastern Thailand (Isaan)",
    },
    south: {
      key_de: "suedthailand",
      key_en: "southern-thailand",
      thai: "ปักษ์ใต้",
      trans_de: "Pak Tai",
      trans_en: "Pak Tai",
      title_de: "Südthailand",
      title_en: "Southern Thailand",
    },
  };

  logDebug(`Returning ${Object.keys(regions).length} standardized regions`);
  return regions;
}

// Helper function to get relationship types with translations from i18n
function getRelationshipTypes(data) {
  logDebug("Extracting relationship types from i18n");

  // Define relationship field types with their i18n translations
  // Translations from /i18n/de.json and /i18n/en.json
  const relationships = {
    uses: {
      title_de: "Verwendet",
      title_en: "Uses",
    },
    usedBy: {
      title_de: "Verwendung",
      title_en: "Usages",
    },
    fits: {
      title_de: "Passt gut zu",
      title_en: "Fits",
    },
    fittedBy: {
      title_de: "Dazu passt gut",
      title_en: "Best accompanied by",
    },
    variations: {
      title_de: "Variationen",
      title_en: "Variations",
    },
    variationOf: {
      title_de: "Eine Variation von",
      title_en: "A Variation of",
    },
  };

  logDebug(
    `Returning ${Object.keys(relationships).length} relationship types`
  );
  return relationships;
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
    const data = await fetchEncyclopediaData();

    switch (name) {
      case "search_encyclopedia": {
        const { query, limit = 20 } = args;
        if (!query) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            "Query parameter is required"
          );
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
          throw new McpError(
            ErrorCode.InvalidRequest,
            "Region parameter is required"
          );
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
          throw new McpError(
            ErrorCode.InvalidRequest,
            "Tag parameter is required"
          );
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

      case "list_regions": {
        const regions = getAllRegions(data);

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
        const relationships = getRelationshipTypes(data);

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
    await fetchEncyclopediaData();
    logInfo("Thai Food Encyclopedia data preloaded successfully");
  } catch (error) {
    logError("Failed to start server:", error);
    process.exit(1);
  }
}

main();
