/**
 * Thai Book Info Business Logic
 * Shared logic for both MCP and REST API
 */

import { Cache } from './cache.js';

const API_URL = 'https://www.ahaan-thai.de/api/thai-cook-book-info.json';
const AMAZON_URL_PREFIX = 'https://amzn.to/';
const cache = new Cache(5 * 60 * 1000); // 5 minutes

function processBookData(book) {
  const processedBook = { ...book };

  // Handle Amazon URL transformation
  if (book.shop === 'amazon' && book.target && book.target.trim() !== '') {
    processedBook.url = AMAZON_URL_PREFIX + book.target;
    delete processedBook.target;
  }

  return processedBook;
}

export async function fetchBooks() {
  const cached = cache.get();
  if (cached) {
    return cached;
  }

  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const rawBooks = await response.json();
  const books = rawBooks.map(book => processBookData(book));

  cache.set(books);
  return books;
}

export async function listBooks() {
  const books = await fetchBooks();

  return books.map((book) => ({
    title: book.title,
    author: book.author,
    year: book.year,
    language: book.lang,
    isbn: book.isbn,
    level: book.level,
    publisher: book.publisher,
    description: book.description || 'No description available',
    ...(book.url && { url: book.url }),
  }));
}

export async function searchBooks(filters = {}) {
  const books = await fetchBooks();
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
    filteredBooks = filteredBooks.filter(book => book.lang === filters.language);
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

  return filteredBooks.map((book) => ({
    title: book.title,
    author: book.author,
    year: book.year,
    language: book.lang,
    isbn: book.isbn,
    level: book.level,
    publisher: book.publisher,
    description: book.description || 'No description available',
    location: book.location,
    image: book.image,
    ...(book.url && { url: book.url }),
  }));
}

export async function getBookByIsbn(isbn) {
  const books = await fetchBooks();
  const book = books.find(b => b.isbn === isbn);

  if (!book) {
    throw new Error(`No book found with ISBN: ${isbn}`);
  }

  return book;
}

export async function getBooksByAuthor(authorName) {
  const books = await fetchBooks();

  const authorBooks = books.filter(book =>
    book.author && book.author.toLowerCase().includes(authorName.toLowerCase())
  );

  if (authorBooks.length === 0) {
    throw new Error(`No books found for author: ${authorName}`);
  }

  return authorBooks;
}

export async function getBooksByLanguage(language) {
  const books = await fetchBooks();

  const languageBooks = books.filter(book => book.lang === language);

  if (languageBooks.length === 0) {
    throw new Error(`No books found for language: ${language}`);
  }

  return languageBooks;
}

export async function getBookStatistics() {
  const books = await fetchBooks();

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
    if (book.lang) {
      stats.languages[book.lang] = (stats.languages[book.lang] || 0) + 1;
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
