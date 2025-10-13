/**
 * Thai Food Dictionary Business Logic
 * Shared logic for both MCP and REST API
 */

import { Cache } from './cache.js';

const API_URL = 'https://www.ahaan-thai.de/api/thai-food-dictionary.json';
const cache = new Cache(5 * 60 * 1000); // 5 minutes

export async function fetchDictionary() {
  const cached = cache.get();
  if (cached) {
    return cached;
  }

  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  cache.set(data);
  return data;
}

export async function getCategories() {
  const data = await fetchDictionary();
  return Object.keys(data);
}

export async function searchInCategory(category, searchTerm) {
  const data = await fetchDictionary();

  if (!data[category]) {
    return [];
  }

  const results = [];
  const lowerSearchTerm = searchTerm.toLowerCase();

  for (const [thai, details] of Object.entries(data[category])) {
    const matches = [
      thai.includes(lowerSearchTerm),
      details.meaning_de.toLowerCase().includes(lowerSearchTerm),
      details.meaning_en.toLowerCase().includes(lowerSearchTerm),
      details.trans_de.toLowerCase().includes(lowerSearchTerm),
      details.trans_en.toLowerCase().includes(lowerSearchTerm),
    ];

    if (matches.some((match) => match)) {
      results.push({
        category,
        thai,
        ...details,
      });
    }
  }

  return results;
}

export async function searchAll(searchTerm) {
  const categories = await getCategories();
  const results = [];

  for (const category of categories) {
    const categoryResults = await searchInCategory(category, searchTerm);
    results.push(...categoryResults);
  }

  return results;
}

export async function searchDictionary(query, category = null) {
  if (category) {
    return await searchInCategory(category, query);
  }
  return await searchAll(query);
}

export async function getCategory(categoryName) {
  const data = await fetchDictionary();
  const categories = await getCategories();

  if (!categories.includes(categoryName)) {
    throw new Error(`Category "${categoryName}" not found. Available: ${categories.join(', ')}`);
  }

  const items = Object.entries(data[categoryName]).map(([thai, details]) => ({
    thai,
    ...details,
  }));

  return items;
}

export async function translateWord(thaiWord) {
  const data = await fetchDictionary();
  const categories = await getCategories();

  for (const category of categories) {
    if (data[category][thaiWord]) {
      return {
        category,
        thai: thaiWord,
        ...data[category][thaiWord],
      };
    }
  }

  return null;
}

export async function getCategoryList() {
  const data = await fetchDictionary();
  const categories = Object.keys(data).map((key) => ({
    key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    count: Object.keys(data[key]).length,
  }));

  return categories;
}
