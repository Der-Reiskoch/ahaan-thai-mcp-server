#!/usr/bin/env node

/**
 * Thai Book Info MCP Server
 * Provides access to Thai cookbook information from ahaan-thai.de API
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { logDebug, logError, logInfo } from "./src/lib/logger.js";
import * as bookInfo from "./src/lib/book-info-logic.js";

// Create server
logInfo("Initializing Thai Book Info Server");
const server = new Server(
  {
    name: "thai-book-info-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logDebug("Handling list_tools request");
  return {
    tools: [
      {
        name: "list_books",
        description: "List all available Thai cookbooks",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "search_books",
        description: "Search for books by author, title, or other criteria",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search term (searches in author, title, description)",
            },
            language: {
              type: "string",
              description: "Filter by language (de, en, th)",
              enum: ["de", "en", "th"],
            },
            level: {
              type: "string",
              description: "Filter by difficulty level (1, 2)",
              enum: ["1", "2"],
            },
            author: {
              type: "string",
              description: "Filter by specific author",
            },
            year: {
              type: "string",
              description: "Filter by publication year",
            },
            publisher: {
              type: "string",
              description: "Filter by publisher",
            },
          },
          required: [],
        },
      },
      {
        name: "get_book_by_isbn",
        description: "Get detailed book information by ISBN",
        inputSchema: {
          type: "object",
          properties: {
            isbn: {
              type: "string",
              description: "ISBN of the book",
            },
          },
          required: ["isbn"],
        },
      },
      {
        name: "get_books_by_author",
        description: "Get all books by a specific author",
        inputSchema: {
          type: "object",
          properties: {
            author: {
              type: "string",
              description: "Author name",
            },
          },
          required: ["author"],
        },
      },
      {
        name: "get_books_by_language",
        description: "Get all books in a specific language",
        inputSchema: {
          type: "object",
          properties: {
            language: {
              type: "string",
              description: "Language code (de, en, th)",
              enum: ["de", "en", "th"],
            },
          },
          required: ["language"],
        },
      },
      {
        name: "get_book_statistics",
        description: "Get statistics about the book collection",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logDebug(`Handling tool call: ${name}`, args);

  try {
    switch (name) {
      case "list_books": {
        const books = await bookInfo.listBooks();
        logInfo(`Returning list of ${books.length} books`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(books, null, 2),
            },
          ],
        };
      }

      case "search_books": {
        const books = await bookInfo.searchBooks(args);
        logInfo(`Search completed. Found ${books.length} matching books`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(books, null, 2),
            },
          ],
        };
      }

      case "get_book_by_isbn": {
        const book = await bookInfo.getBookByIsbn(args.isbn);
        logInfo(`Found book: "${book.title}" by ${book.author}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(book, null, 2),
            },
          ],
        };
      }

      case "get_books_by_author": {
        const books = await bookInfo.getBooksByAuthor(args.author);
        logInfo(`Found ${books.length} books by author: ${args.author}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(books, null, 2),
            },
          ],
        };
      }

      case "get_books_by_language": {
        const books = await bookInfo.getBooksByLanguage(args.language);
        logInfo(`Found ${books.length} books in language: ${args.language}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(books, null, 2),
            },
          ],
        };
      }

      case "get_book_statistics": {
        const stats = await bookInfo.getBookStatistics();
        logInfo("Book statistics calculated successfully");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      }

      default:
        logError(`Unknown tool: ${name}`);
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logError(`Error in tool ${name}:`, error.message);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

// Start server
async function main() {
  try {
    logInfo("Starting Thai Book Info Server");
    const transport = new StdioServerTransport();

    await server.connect(transport);
    logInfo("Server connected and ready to handle requests");
  } catch (error) {
    logError("Failed to start server:", error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  logInfo("Received SIGINT, shutting down gracefully");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logInfo("Received SIGTERM, shutting down gracefully");
  process.exit(0);
});

// Start
main().catch((error) => {
  logError("Fatal error:", error);
  process.exit(1);
});
