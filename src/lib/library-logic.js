/**
 * Thai Cookbook Library Business Logic
 * Shared logic for both MCP and REST API
 */

import { Cache } from './cache.js';

const API_URL = 'https://www.ahaan-thai.de/api/thai-cook-book-library.json';
const URL_PREFIX_DE_EN = 'https://www.ahaan-thai.de';
const IMAGE_URL_PREFIX = 'https://bilder.koch-reis.de/';
const cache = new Cache(5 * 60 * 1000); // 5 minutes

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

  // Process URLs for all recipes in all cookbooks
  const processedData = {};
  for (const [cookbookName, cookbook] of Object.entries(responseJson)) {
    processedData[cookbookName] = processRecipesUrls(cookbook);
  }

  cache.set(processedData);
  return processedData;
}

export async function listCookbooks() {
  const data = await fetchLibrary();

  const cookbooks = Object.keys(data).map(name => ({
    name,
    recipe_count: Object.keys(data[name]).length,
    display_name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
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

  return cookbook;
}

export async function searchRecipes(params = {}) {
  const data = await fetchLibrary();
  const { query, region, cookbook } = params;

  const results = [];

  for (const [cookbookName, cookbookData] of Object.entries(data)) {
    // Filter by cookbook if specified
    if (cookbook && cookbookName !== cookbook) continue;

    for (const [recipeKey, recipe] of Object.entries(cookbookData)) {
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

  const recipe = cookbook[recipeKey];
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
    for (const [recipeKey, recipe] of Object.entries(cookbookData)) {
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
    const recipeCount = Object.keys(cookbookData).length;
    stats.total_recipes += recipeCount;
    stats.recipes_by_cookbook[cookbookName] = recipeCount;

    for (const recipe of Object.values(cookbookData)) {
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
