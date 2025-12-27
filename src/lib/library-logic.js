/**
 * Thai Cookbook Library Business Logic
 * Shared logic for both MCP and REST API
 *
 * Handles BOTH book info and recipes from combined API:
 * - Book info (bilingual: de/en)
 * - Recipes (all cookbook recipes)
 */

import { Cache } from './cache.js';

const API_URL = 'https://www.ahaan-thai.de/api/thai-cook-book-library.json';
const URL_PREFIX_DE_EN = 'https://www.ahaan-thai.de';
const IMAGE_URL_PREFIX = 'https://bilder.koch-reis.de/';
const AMAZON_URL_PREFIX = 'https://amzn.to/';
const cache = new Cache(5 * 60 * 1000); // 5 minutes

/**
 * Process book info (de or en) to handle Amazon URL transformation
 */
function processBookInfo(bookInfo) {
  if (!bookInfo || Object.keys(bookInfo).length === 0) {
    return bookInfo; // Return empty object as-is
  }

  const processed = { ...bookInfo };

  // Handle Amazon URL transformation
  if (bookInfo.shop === 'amazon' && bookInfo.target && bookInfo.target.trim() !== '') {
    processed.url = AMAZON_URL_PREFIX + bookInfo.target;
    delete processed.target;
  }

  return processed;
}

function processRecipeUrls(recipe) {
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
}

function processRecipesUrls(recipes) {
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
}

export async function fetchLibrary() {
  const cached = cache.get();
  if (cached) {
    return cached;
  }

  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const responseJson = await response.json();

  if (!responseJson || typeof responseJson !== 'object') {
    throw new Error('Invalid data structure received from API');
  }

  // Process the new combined structure: {cookbook_name: {info: {de, en}, recipes: {...}}}
  const processedData = {};
  for (const [cookbookName, cookbook] of Object.entries(responseJson)) {
    processedData[cookbookName] = {
      info: {
        de: processBookInfo(cookbook.info?.de || {}),
        en: processBookInfo(cookbook.info?.en || {})
      },
      recipes: processRecipesUrls(cookbook.recipes || {})
    };
  }

  cache.set(processedData);
  return processedData;
}

export async function listCookbooks() {
  const data = await fetchLibrary();

  const cookbooks = Object.keys(data).map(name => ({
    name,
    recipe_count: Object.keys(data[name].recipes).length,
    display_name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    has_german_edition: Object.keys(data[name].info.de).length > 0,
    has_english_edition: Object.keys(data[name].info.en).length > 0
  }));

  return cookbooks;
}

export async function getCookbookRecipes(cookbookName) {
  const data = await fetchLibrary();
  const cookbook = data[cookbookName];

  if (!cookbook) {
    const available = Object.keys(data);
    throw new Error(`Cookbook "${cookbookName}" not found. Available: ${available.join(', ')}`);
  }

  return cookbook.recipes;
}

export async function searchRecipes(params = {}) {
  const data = await fetchLibrary();
  const { query, region, cookbook } = params;

  const results = [];

  for (const [cookbookName, cookbookData] of Object.entries(data)) {
    // Filter by cookbook if specified
    if (cookbook && cookbookName !== cookbook) continue;

    // Access recipes from the new structure
    for (const [recipeKey, recipe] of Object.entries(cookbookData.recipes)) {
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

  return {
    total_results: results.length,
    recipes: results
  };
}

export async function getRecipeByKey(cookbookName, recipeKey) {
  const data = await fetchLibrary();
  const cookbook = data[cookbookName];

  if (!cookbook) {
    throw new Error(`Cookbook "${cookbookName}" not found`);
  }

  const recipe = cookbook.recipes[recipeKey];
  if (!recipe) {
    throw new Error(`Recipe "${recipeKey}" not found in cookbook "${cookbookName}"`);
  }

  return {
    ...recipe,
    cookbook: cookbookName,
    recipe_key: recipeKey
  };
}

export async function getRecipesByRegion(region) {
  const data = await fetchLibrary();
  const results = [];

  for (const [cookbookName, cookbookData] of Object.entries(data)) {
    for (const [recipeKey, recipe] of Object.entries(cookbookData.recipes)) {
      if (recipe.region === region) {
        results.push({
          ...recipe,
          cookbook: cookbookName,
          recipe_key: recipeKey
        });
      }
    }
  }

  return {
    region,
    total_recipes: results.length,
    recipes: results
  };
}

export async function getCookbookStats() {
  const data = await fetchLibrary();

  const stats = {
    total_cookbooks: Object.keys(data).length,
    total_recipes: 0,
    recipes_by_cookbook: {},
    recipes_by_region: {},
    regions: new Set(),
    cookbooks: Object.keys(data)
  };

  for (const [cookbookName, cookbookData] of Object.entries(data)) {
    const recipeCount = Object.keys(cookbookData.recipes).length;
    stats.total_recipes += recipeCount;
    stats.recipes_by_cookbook[cookbookName] = recipeCount;

    for (const recipe of Object.values(cookbookData.recipes)) {
      if (recipe.region) {
        stats.regions.add(recipe.region);
        stats.recipes_by_region[recipe.region] = (stats.recipes_by_region[recipe.region] || 0) + 1;
      }
    }
  }

  return {
    ...stats,
    regions: Array.from(stats.regions)
  };
}

// ========================================
// Book Info Functions (merged from book-info-logic.js)
// ========================================

/**
 * List all available book editions (bilingual)
 */
export async function listBooks() {
  const data = await fetchLibrary();
  const books = [];

  for (const [cookbookName, cookbookData] of Object.entries(data)) {
    // Add German edition if available
    if (Object.keys(cookbookData.info.de).length > 0) {
      books.push({
        cookbook_name: cookbookName,
        language: 'de',
        ...cookbookData.info.de,
        description: cookbookData.info.de.description || 'No description available'
      });
    }

    // Add English edition if available
    if (Object.keys(cookbookData.info.en).length > 0) {
      books.push({
        cookbook_name: cookbookName,
        language: 'en',
        ...cookbookData.info.en,
        description: cookbookData.info.en.description || 'No description available'
      });
    }
  }

  return books;
}

/**
 * Get book info for a specific cookbook (returns both de and en if available)
 */
export async function getBookInfo(cookbookName) {
  const data = await fetchLibrary();
  const cookbook = data[cookbookName];

  if (!cookbook) {
    const available = Object.keys(data);
    throw new Error(`Cookbook "${cookbookName}" not found. Available: ${available.join(', ')}`);
  }

  return {
    cookbook_name: cookbookName,
    de: cookbook.info.de,
    en: cookbook.info.en,
    has_german_edition: Object.keys(cookbook.info.de).length > 0,
    has_english_edition: Object.keys(cookbook.info.en).length > 0
  };
}

/**
 * Search books with filters
 */
export async function searchBooks(filters = {}) {
  const books = await listBooks();
  let filteredBooks = [...books];

  // Text search in title, author, and description
  if (filters.query) {
    const query = filters.query.toLowerCase();
    filteredBooks = filteredBooks.filter(book =>
      (book.title && book.title.toLowerCase().includes(query)) ||
      (book.author && book.author.toLowerCase().includes(query)) ||
      (book.description && book.description.toLowerCase().includes(query)) ||
      (book.text && book.text.toLowerCase().includes(query))
    );
  }

  // Language filter
  if (filters.language) {
    filteredBooks = filteredBooks.filter(book => book.language === filters.language);
  }

  // Level filter
  if (filters.level) {
    filteredBooks = filteredBooks.filter(book => book.level?.toString() === filters.level);
  }

  // Author filter
  if (filters.author) {
    const author = filters.author.toLowerCase();
    filteredBooks = filteredBooks.filter(book =>
      book.author && book.author.toLowerCase().includes(author)
    );
  }

  // Year filter
  if (filters.year) {
    filteredBooks = filteredBooks.filter(book =>
      book.year?.toString() === filters.year
    );
  }

  // Publisher filter
  if (filters.publisher) {
    const publisher = filters.publisher.toLowerCase();
    filteredBooks = filteredBooks.filter(book =>
      book.publisher && book.publisher.toLowerCase().includes(publisher)
    );
  }

  return filteredBooks;
}

/**
 * Get book by ISBN
 */
export async function getBookByIsbn(isbn) {
  const books = await listBooks();
  const book = books.find(b => b.isbn === isbn);

  if (!book) {
    throw new Error(`No book found with ISBN: ${isbn}`);
  }

  return book;
}

/**
 * Get books by author
 */
export async function getBooksByAuthor(authorName) {
  const books = await listBooks();

  const authorBooks = books.filter(book =>
    book.author && book.author.toLowerCase().includes(authorName.toLowerCase())
  );

  if (authorBooks.length === 0) {
    throw new Error(`No books found for author: ${authorName}`);
  }

  return authorBooks;
}

/**
 * Get books by language
 */
export async function getBooksByLanguage(language) {
  const books = await listBooks();

  const languageBooks = books.filter(book => book.language === language);

  if (languageBooks.length === 0) {
    throw new Error(`No books found for language: ${language}`);
  }

  return languageBooks;
}

/**
 * Get book statistics
 */
export async function getBookStatistics() {
  const books = await listBooks();

  const stats = {
    total_books: books.length,
    languages: {},
    levels: {},
    authors: {},
    publishers: {},
    years: {},
    locations: {}
  };

  // Count by various attributes
  books.forEach(book => {
    if (book.language) {
      stats.languages[book.language] = (stats.languages[book.language] || 0) + 1;
    }
    if (book.level) {
      stats.levels[book.level] = (stats.levels[book.level] || 0) + 1;
    }
    if (book.author) {
      stats.authors[book.author] = (stats.authors[book.author] || 0) + 1;
    }
    if (book.publisher) {
      stats.publishers[book.publisher] = (stats.publishers[book.publisher] || 0) + 1;
    }
    if (book.year) {
      stats.years[book.year] = (stats.years[book.year] || 0) + 1;
    }
    if (book.location) {
      stats.locations[book.location] = (stats.locations[book.location] || 0) + 1;
    }
  });

  // Sort statistics by count (descending)
  Object.keys(stats).forEach(key => {
    if (typeof stats[key] === 'object' && stats[key] !== null) {
      stats[key] = Object.fromEntries(
        Object.entries(stats[key]).sort(([,a], [,b]) => b - a)
      );
    }
  });

  return stats;
}
