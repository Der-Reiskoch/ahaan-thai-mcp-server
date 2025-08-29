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

// Debug logging functions
function logDebug(message, ...args) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [DEBUG] ${message}`, ...args);
}

function logError(message, ...args) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] ${message}`, ...args);
}

function logInfo(message, ...args) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [INFO] ${message}`, ...args);
}

class ThaiBookInfoServer {
  constructor() {
    this.server = new Server(
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

    this.apiUrl = "https://www.ahaan-thai.de/api/thai-cook-book-info.json";
    this.amazonUrlPrefix = "https://amzn.to/"; // Amazon URL prefix constant
    this.booksCache = null;
    this.cacheTimestamp = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes in milliseconds

    logInfo("Initializing Thai Book Info Server");
    this.setupHandlers();
  }

  /**
   * Process book data to handle Amazon URLs
   * @param {Object} book - Book object from API
   * @returns {Object} - Processed book object
   */
  processBookData(book) {
    logDebug(`Processing book data for: "${book.title}"`);
    
    const processedBook = { ...book };
    
    // Handle Amazon URL transformation
    if (book.shop === "amazon" && book.target && book.target.trim() !== "") {
      logDebug(`Converting Amazon target "${book.target}" to full URL`);
      processedBook.url = this.amazonUrlPrefix + book.target;
      
      // Remove the original target field since we converted it to url
      delete processedBook.target;
      
      logDebug(`Amazon URL created: ${processedBook.url}`);
    } else if (book.target) {
      // Keep target field for non-Amazon shops
      logDebug(`Keeping target field for non-Amazon shop: ${book.shop}`);
    }
    
    return processedBook;
  }

  setupHandlers() {
    logDebug("Setting up request handlers");

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logDebug(`Handling tool call: ${name}`, args);

      try {
        switch (name) {
          case "list_books":
            return await this.listBooks();
          case "search_books":
            return await this.searchBooks(args);
          case "get_book_by_isbn":
            return await this.getBookByIsbn(args.isbn);
          case "get_books_by_author":
            return await this.getBooksByAuthor(args.author);
          case "get_books_by_language":
            return await this.getBooksByLanguage(args.language);
          case "get_book_statistics":
            return await this.getBookStatistics();
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

    logDebug("Request handlers setup complete");
  }

  async fetchBooks() {
    logDebug("Checking book cache");
    
    // Check if we have valid cached data
    if (this.booksCache && this.cacheTimestamp && 
        (Date.now() - this.cacheTimestamp < this.cacheExpiry)) {
      logDebug("Using cached book data");
      return this.booksCache;
    }

    logInfo("Fetching fresh book data from API");
    
    try {
      const response = await fetch(this.apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawBooks = await response.json();
      logInfo(`Successfully fetched ${rawBooks.length} books from API`);
      
      // Process books to handle Amazon URLs and other transformations
      const books = rawBooks.map(book => this.processBookData(book));
      logDebug("Book data processing completed");
      
      // Update cache
      this.booksCache = books;
      this.cacheTimestamp = Date.now();
      logDebug("Book data cached successfully");
      
      return books;
    } catch (error) {
      logError("Failed to fetch book data:", error.message);
      
      // Return cached data if available, even if expired
      if (this.booksCache) {
        logInfo("Returning expired cached data due to fetch failure");
        return this.booksCache;
      }
      
      throw new Error(`Failed to fetch book data: ${error.message}`);
    }
  }

  async listBooks() {
    logDebug("Listing all books");
    const books = await this.fetchBooks();
    
    const bookList = books.map((book) => {
      const bookData = {
        title: book.title,
        author: book.author,
        year: book.year,
        language: book.lang,
        isbn: book.isbn,
        level: book.level,
        publisher: book.publisher,
        description: book.description || "No description available"
      };

      // Add URL if it exists (converted from Amazon target)
      if (book.url) {
        bookData.url = book.url;
        logDebug(`Including Amazon URL for "${book.title}": ${book.url}`);
      }

      return bookData;
    });

    logInfo(`Returning list of ${bookList.length} books`);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(bookList, null, 2),
        },
      ],
    };
  }

  async searchBooks(args) {
    logDebug("Searching books with criteria:", args);
    const books = await this.fetchBooks();
    let filteredBooks = [...books];

    // Text search in title, author, and description
    if (args.query) {
      const query = args.query.toLowerCase();
      logDebug(`Filtering by query: "${query}"`);
      
      filteredBooks = filteredBooks.filter(book => 
        (book.title && book.title.toLowerCase().includes(query)) ||
        (book.author && book.author.toLowerCase().includes(query)) ||
        (book.description && book.description.toLowerCase().includes(query)) ||
        (book.text && book.text.toLowerCase().includes(query))
      );
      logDebug(`After query filter: ${filteredBooks.length} books`);
    }

    // Language filter
    if (args.language) {
      logDebug(`Filtering by language: ${args.language}`);
      filteredBooks = filteredBooks.filter(book => book.lang === args.language);
      logDebug(`After language filter: ${filteredBooks.length} books`);
    }

    // Level filter
    if (args.level) {
      logDebug(`Filtering by level: ${args.level}`);
      filteredBooks = filteredBooks.filter(book => book.level?.toString() === args.level);
      logDebug(`After level filter: ${filteredBooks.length} books`);
    }

    // Author filter
    if (args.author) {
      const author = args.author.toLowerCase();
      logDebug(`Filtering by author: "${author}"`);
      filteredBooks = filteredBooks.filter(book => 
        book.author && book.author.toLowerCase().includes(author)
      );
      logDebug(`After author filter: ${filteredBooks.length} books`);
    }

    // Year filter
    if (args.year) {
      logDebug(`Filtering by year: ${args.year}`);
      filteredBooks = filteredBooks.filter(book => 
        book.year?.toString() === args.year
      );
      logDebug(`After year filter: ${filteredBooks.length} books`);
    }

    // Publisher filter
    if (args.publisher) {
      const publisher = args.publisher.toLowerCase();
      logDebug(`Filtering by publisher: "${publisher}"`);
      filteredBooks = filteredBooks.filter(book => 
        book.publisher && book.publisher.toLowerCase().includes(publisher)
      );
      logDebug(`After publisher filter: ${filteredBooks.length} books`);
    }

    const result = filteredBooks.map((book) => {
      const bookData = {
        title: book.title,
        author: book.author,
        year: book.year,
        language: book.lang,
        isbn: book.isbn,
        level: book.level,
        publisher: book.publisher,
        description: book.description || "No description available",
        location: book.location,
        image: book.image
      };

      // Add URL if it exists (converted from Amazon target)
      if (book.url) {
        bookData.url = book.url;
        logDebug(`Including Amazon URL for "${book.title}": ${book.url}`);
      }

      return bookData;
    });

    logInfo(`Search completed. Found ${result.length} matching books`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  async getBookByIsbn(isbn) {
    logDebug(`Getting book by ISBN: ${isbn}`);
    const books = await this.fetchBooks();
    
    const book = books.find(b => b.isbn === isbn);
    
    if (!book) {
      logInfo(`No book found with ISBN: ${isbn}`);
      throw new Error(`No book found with ISBN: ${isbn}`);
    }

    logInfo(`Found book: "${book.title}" by ${book.author}`);

    // Log Amazon URL if present
    if (book.url) {
      logDebug(`Book has Amazon URL: ${book.url}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(book, null, 2),
        },
      ],
    };
  }

  async getBooksByAuthor(authorName) {
    logDebug(`Getting books by author: ${authorName}`);
    const books = await this.fetchBooks();
    
    const authorBooks = books.filter(book => 
      book.author && book.author.toLowerCase().includes(authorName.toLowerCase())
    );

    if (authorBooks.length === 0) {
      logInfo(`No books found for author: ${authorName}`);
      throw new Error(`No books found for author: ${authorName}`);
    }

    logInfo(`Found ${authorBooks.length} books by author: ${authorName}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(authorBooks, null, 2),
        },
      ],
    };
  }

  async getBooksByLanguage(language) {
    logDebug(`Getting books by language: ${language}`);
    const books = await this.fetchBooks();
    
    const languageBooks = books.filter(book => book.lang === language);

    if (languageBooks.length === 0) {
      logInfo(`No books found for language: ${language}`);
      throw new Error(`No books found for language: ${language}`);
    }

    logInfo(`Found ${languageBooks.length} books in language: ${language}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(languageBooks, null, 2),
        },
      ],
    };
  }

  async getBookStatistics() {
    logDebug("Calculating book statistics");
    const books = await this.fetchBooks();

    const stats = {
      total_books: books.length,
      languages: {},
      levels: {},
      authors: {},
      publishers: {},
      years: {},
      locations: {}
    };

    // Count by language
    books.forEach(book => {
      if (book.lang) {
        stats.languages[book.lang] = (stats.languages[book.lang] || 0) + 1;
      }
    });

    // Count by level
    books.forEach(book => {
      if (book.level) {
        stats.levels[book.level] = (stats.levels[book.level] || 0) + 1;
      }
    });

    // Count by author
    books.forEach(book => {
      if (book.author) {
        stats.authors[book.author] = (stats.authors[book.author] || 0) + 1;
      }
    });

    // Count by publisher
    books.forEach(book => {
      if (book.publisher) {
        stats.publishers[book.publisher] = (stats.publishers[book.publisher] || 0) + 1;
      }
    });

    // Count by year
    books.forEach(book => {
      if (book.year) {
        stats.years[book.year] = (stats.years[book.year] || 0) + 1;
      }
    });

    // Count by location
    books.forEach(book => {
      if (book.location) {
        stats.locations[book.location] = (stats.locations[book.location] || 0) + 1;
      }
    });

    // Sort statistics by count (descending)
    Object.keys(stats).forEach(key => {
      if (typeof stats[key] === "object" && stats[key] !== null) {
        stats[key] = Object.fromEntries(
          Object.entries(stats[key]).sort(([,a], [,b]) => b - a)
        );
      }
    });

    logInfo("Book statistics calculated successfully");
    logDebug("Statistics:", {
      total: stats.total_books,
      languages: Object.keys(stats.languages).length,
      authors: Object.keys(stats.authors).length,
      publishers: Object.keys(stats.publishers).length
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  }

  async run() {
    logInfo("Starting Thai Book Info Server");
    const transport = new StdioServerTransport();
    
    try {
      await this.server.connect(transport);
      logInfo("Server connected and ready to handle requests");
    } catch (error) {
      logError("Failed to start server:", error.message);
      process.exit(1);
    }
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

// Create and run the server
const server = new ThaiBookInfoServer();
server.run().catch((error) => {
  logError("Fatal error:", error);
  process.exit(1);
});