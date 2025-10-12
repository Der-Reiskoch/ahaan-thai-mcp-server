#!/usr/bin/env node

/**
 * REST API Wrapper for Thai Food MCP Servers
 * Exposes all MCP server functionality via HTTP REST API
 * For deployment to Netcup or other web hosts
 */

import express from 'express';
import cors from 'cors';
import * as dictionary from './lib/dictionary-logic.js';
import * as bookInfo from './lib/book-info-logic.js';
import * as library from './lib/library-logic.js';
import * as encyclopedia from './lib/encyclopedia-logic.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============================================================================
// DICTIONARY ENDPOINTS
// ============================================================================

// GET /api/dictionary/categories - List all categories
app.get('/api/dictionary/categories', asyncHandler(async (req, res) => {
  const categories = await dictionary.getCategoryList();
  res.json(categories);
}));

// GET /api/dictionary/search?q=...&category=... - Search dictionary
app.get('/api/dictionary/search', asyncHandler(async (req, res) => {
  const { q, category } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const results = await dictionary.searchDictionary(q, category || null);
  res.json({
    query: q,
    category: category || 'all',
    count: results.length,
    results
  });
}));

// GET /api/dictionary/category/:name - Get all items in a category
app.get('/api/dictionary/category/:name', asyncHandler(async (req, res) => {
  const { name } = req.params;
  const items = await dictionary.getCategory(name);
  res.json({
    category: name,
    count: items.length,
    items
  });
}));

// GET /api/dictionary/translate?word=... - Translate Thai word
app.get('/api/dictionary/translate', asyncHandler(async (req, res) => {
  const { word } = req.query;

  if (!word) {
    return res.status(400).json({ error: 'Query parameter "word" is required' });
  }

  const result = await dictionary.translateWord(word);

  if (!result) {
    return res.status(404).json({
      error: `Thai word "${word}" not found in dictionary`
    });
  }

  res.json(result);
}));

// ============================================================================
// BOOK INFO ENDPOINTS
// ============================================================================

// GET /api/books - List all books
app.get('/api/books', asyncHandler(async (req, res) => {
  const books = await bookInfo.listBooks();
  res.json({
    count: books.length,
    books
  });
}));

// GET /api/books/search?query=...&language=...&level=...&author=...&year=...&publisher=...
app.get('/api/books/search', asyncHandler(async (req, res) => {
  const filters = req.query;
  const books = await bookInfo.searchBooks(filters);
  res.json({
    filters,
    count: books.length,
    books
  });
}));

// GET /api/books/isbn/:isbn - Get book by ISBN
app.get('/api/books/isbn/:isbn', asyncHandler(async (req, res) => {
  const { isbn } = req.params;
  const book = await bookInfo.getBookByIsbn(isbn);
  res.json(book);
}));

// GET /api/books/author/:name - Get books by author
app.get('/api/books/author/:name', asyncHandler(async (req, res) => {
  const { name } = req.params;
  const books = await bookInfo.getBooksByAuthor(name);
  res.json({
    author: name,
    count: books.length,
    books
  });
}));

// GET /api/books/language/:lang - Get books by language
app.get('/api/books/language/:lang', asyncHandler(async (req, res) => {
  const { lang } = req.params;
  const books = await bookInfo.getBooksByLanguage(lang);
  res.json({
    language: lang,
    count: books.length,
    books
  });
}));

// GET /api/books/stats - Get book statistics
app.get('/api/books/stats', asyncHandler(async (req, res) => {
  const stats = await bookInfo.getBookStatistics();
  res.json(stats);
}));

// ============================================================================
// LIBRARY ENDPOINTS
// ============================================================================

// GET /api/library/cookbooks - List all cookbooks
app.get('/api/library/cookbooks', asyncHandler(async (req, res) => {
  const cookbooks = await library.listCookbooks();
  res.json({
    count: cookbooks.length,
    cookbooks
  });
}));

// GET /api/library/cookbook/:name - Get all recipes from a cookbook
app.get('/api/library/cookbook/:name', asyncHandler(async (req, res) => {
  const { name } = req.params;
  const recipes = await library.getCookbookRecipes(name);
  res.json({
    cookbook: name,
    count: Object.keys(recipes).length,
    recipes
  });
}));

// GET /api/library/search?query=...&region=...&cookbook=... - Search recipes
app.get('/api/library/search', asyncHandler(async (req, res) => {
  const params = req.query;
  const results = await library.searchRecipes(params);
  res.json(results);
}));

// GET /api/library/recipe/:cookbook/:key - Get specific recipe
app.get('/api/library/recipe/:cookbook/:key', asyncHandler(async (req, res) => {
  const { cookbook, key } = req.params;
  const recipe = await library.getRecipeByKey(cookbook, key);
  res.json(recipe);
}));

// GET /api/library/region/:region - Get recipes by region
app.get('/api/library/region/:region', asyncHandler(async (req, res) => {
  const { region } = req.params;
  const results = await library.getRecipesByRegion(region);
  res.json(results);
}));

// GET /api/library/stats - Get library statistics
app.get('/api/library/stats', asyncHandler(async (req, res) => {
  const stats = await library.getCookbookStats();
  res.json(stats);
}));

// ============================================================================
// ENCYCLOPEDIA ENDPOINTS
// ============================================================================

// GET /api/encyclopedia/search?q=...&limit=... - Search encyclopedia
app.get('/api/encyclopedia/search', asyncHandler(async (req, res) => {
  const { q, limit } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const results = await encyclopedia.searchEntries(q, limit ? parseInt(limit) : 20);
  res.json({
    query: q,
    count: results.length,
    results
  });
}));

// GET /api/encyclopedia/region/:region?limit=... - Get entries by region
app.get('/api/encyclopedia/region/:region', asyncHandler(async (req, res) => {
  const { region } = req.params;
  const { limit } = req.query;

  const results = await encyclopedia.getEntriesByRegion(region, limit ? parseInt(limit) : 20);
  res.json({
    region,
    count: results.length,
    results
  });
}));

// GET /api/encyclopedia/tag/:tag?limit=... - Get entries by tag
app.get('/api/encyclopedia/tag/:tag', asyncHandler(async (req, res) => {
  const { tag } = req.params;
  const { limit } = req.query;

  const results = await encyclopedia.getEntriesByTag(tag, limit ? parseInt(limit) : 20);
  res.json({
    tag,
    count: results.length,
    results
  });
}));

// GET /api/encyclopedia/entries?limit=... - Get all entries
app.get('/api/encyclopedia/entries', asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const results = await encyclopedia.getAllEntries(limit ? parseInt(limit) : 100);
  res.json({
    count: results.length,
    entries: results
  });
}));

// GET /api/encyclopedia/regions - Get all regions
app.get('/api/encyclopedia/regions', asyncHandler(async (req, res) => {
  const regions = await encyclopedia.getAllRegions();
  res.json(regions);
}));

// GET /api/encyclopedia/relationships - Get all relationship types
app.get('/api/encyclopedia/relationships', asyncHandler(async (req, res) => {
  const relationships = await encyclopedia.getRelationshipTypes();
  res.json(relationships);
}));

// ============================================================================
// ROOT & HEALTH CHECK
// ============================================================================

// GET / - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Ahaan Thai MCP Server',
    version: '1.0.0',
    description: 'REST API for Thai food dictionary, cookbooks, library, and encyclopedia',
    endpoints: {
      dictionary: {
        'GET /api/dictionary/categories': 'List all dictionary categories',
        'GET /api/dictionary/search?q=...&category=...': 'Search dictionary',
        'GET /api/dictionary/category/:name': 'Get items in a category',
        'GET /api/dictionary/translate?word=...': 'Translate Thai word'
      },
      books: {
        'GET /api/books': 'List all books',
        'GET /api/books/search?query=...&language=...&level=...': 'Search books',
        'GET /api/books/isbn/:isbn': 'Get book by ISBN',
        'GET /api/books/author/:name': 'Get books by author',
        'GET /api/books/language/:lang': 'Get books by language',
        'GET /api/books/stats': 'Get book statistics'
      },
      library: {
        'GET /api/library/cookbooks': 'List all cookbooks',
        'GET /api/library/cookbook/:name': 'Get recipes from cookbook',
        'GET /api/library/search?query=...&region=...&cookbook=...': 'Search recipes',
        'GET /api/library/recipe/:cookbook/:key': 'Get specific recipe',
        'GET /api/library/region/:region': 'Get recipes by region',
        'GET /api/library/stats': 'Get library statistics'
      },
      encyclopedia: {
        'GET /api/encyclopedia/search?q=...&limit=...': 'Search encyclopedia',
        'GET /api/encyclopedia/region/:region?limit=...': 'Get entries by region',
        'GET /api/encyclopedia/tag/:tag?limit=...': 'Get entries by tag',
        'GET /api/encyclopedia/entries?limit=...': 'Get all entries',
        'GET /api/encyclopedia/regions': 'Get all regions',
        'GET /api/encyclopedia/relationships': 'Get relationship types'
      }
    },
    documentation: 'https://github.com/yourusername/ahaan-thai-mcp-server'
  });
});

// GET /health - Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// START SERVER
// ============================================================================

// Start server (Passenger will manage the process)
app.listen(PORT, () => {
  console.log(`\n🚀 Ahaan Thai MCP Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health\n`);
});

// Export app for testing
export default app;
