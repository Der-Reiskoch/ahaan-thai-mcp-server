/**
 * Thai Food Encyclopedia Business Logic
 * Shared logic for both MCP and REST API
 */

import { Cache } from './cache.js';

const API_URL = 'https://www.ahaan-thai.de/api/thai-food-encyclopedia.json';
const BASE_URL = 'https://www.ahaan-thai.de';
const IMAGE_BASE_URL = 'https://bilder.koch-reis.de/media/';
const cache = new Cache(5 * 60 * 1000); // 5 minutes

// Transform recipe links to full URLs based on their type
function transformRecipeLink(link) {
  // External links with autotranslation: ?trans=TH-DE, &trans=TH-DE, ?trans=TH-EN, &trans=TH-EN
  if (
    (link.startsWith('http://') || link.startsWith('https://')) &&
    /trans=TH-(DE|EN)/.test(link)
  ) {
    const targetLang = link.includes('trans=TH-DE') ? 'de' : 'en';
    const transParam = `trans=TH-${targetLang.toUpperCase()}`;

    let cleanUrl = link.replace(new RegExp(`\\?${transParam}(&|$)`), '?');
    cleanUrl = cleanUrl.replace(new RegExp(`&${transParam}`), '');
    cleanUrl = cleanUrl.replace(/\?$/, '');

    return `https://translate.google.com/translate?sl=th&tl=${targetLang}&js=y&prev=_t&hl=${targetLang}&ie=UTF-8&u=${encodeURIComponent(
      cleanUrl
    )}`;
  }

  // Already a full URL
  if (link.startsWith('http://') || link.startsWith('https://')) {
    return link;
  }

  // Reiskoch links
  if (link.startsWith('/reiskoch/')) {
    return link.replace('/reiskoch/', 'https://www.der-reiskoch.de/');
  }

  // PDF links
  if (link.startsWith('/aa-pdf/')) {
    return BASE_URL + link.replace('/aa-pdf/', '/pdf/andreas-ayasse/');
  }

  // YouTube links
  if (link.startsWith('/youtube/')) {
    const videoId = link.replace('/youtube/', '');
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  // All other internal links
  return BASE_URL + link;
}

// Ensure relationship links end with /
function ensureTrailingSlash(url) {
  if (url.includes('#') || url.includes('?')) {
    return url;
  }
  return url.endsWith('/') ? url : url + '/';
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

// Process encyclopedia entry to transform all URLs
function processEntry(entry) {
  const processed = { ...entry };

  // Recipe fields (don't add trailing slash)
  const recipeFields = ['recipes'];

  // Relationship fields (add trailing slash)
  const relationshipFields = [
    'url',
    'usedBy',
    'uses',
    'fits',
    'fittedBy',
    'variations',
    'variationOf',
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
  if (processed.imageUrl && !processed.imageUrl.startsWith('http')) {
    processed.imageUrl = IMAGE_BASE_URL + processed.imageUrl;
  }

  return processed;
}

export async function fetchEncyclopedia() {
  const cached = cache.get();
  if (cached) {
    return cached;
  }

  const response = await fetch(API_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const rawData = await response.json();

  // Transform all entries to include full recipe URLs
  const encyclopediaData = rawData.map(processEntry);

  cache.set(encyclopediaData);
  return encyclopediaData;
}

export async function searchEntries(searchTerm, limit = 20) {
  const data = await fetchEncyclopedia();
  const results = [];
  const lowerSearchTerm = searchTerm.toLowerCase();

  for (const entry of data) {
    const matches = [
      entry.thaiName && entry.thaiName.toLowerCase().includes(lowerSearchTerm),
      entry.alternativeNames &&
        entry.alternativeNames.some((name) =>
          name.toLowerCase().includes(lowerSearchTerm)
        ),
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

  return results;
}

export async function getEntriesByRegion(region, limit = 20) {
  const data = await fetchEncyclopedia();

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

  return results;
}

export async function getEntriesByTag(tag, limit = 20) {
  const data = await fetchEncyclopedia();

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

  return results;
}

export async function getAllEntries(limit = 100) {
  const data = await fetchEncyclopedia();
  return data.slice(0, limit);
}

export async function getAllRegions() {
  // Define the 4 main Thai regions
  const regions = {
    central: {
      key_de: 'zentralthailand',
      key_en: 'central-thailand',
      thai: 'ภาคกลาง',
      trans_de: 'Phak Klang',
      trans_en: 'Phak Klang',
      title_de: 'Zentralthailand',
      title_en: 'Central Thailand',
    },
    north: {
      key_de: 'nordthailand',
      key_en: 'northern-thailand',
      thai: 'ภาคเหนือ',
      trans_de: 'Phak Nuea',
      trans_en: 'Phak Nuea',
      title_de: 'Nordthailand',
      title_en: 'Northern Thailand',
    },
    isaan: {
      key_de: 'nordostthailand',
      key_en: 'northeastern-thailand',
      thai: 'ภาคอีสาน',
      trans_de: 'Phak Isan',
      trans_en: 'Phak Isan',
      title_de: 'Nordostthailand (Isaan)',
      title_en: 'Northeastern Thailand (Isaan)',
    },
    south: {
      key_de: 'suedthailand',
      key_en: 'southern-thailand',
      thai: 'ปักษ์ใต้',
      trans_de: 'Pak Tai',
      trans_en: 'Pak Tai',
      title_de: 'Südthailand',
      title_en: 'Southern Thailand',
    },
  };

  return regions;
}

export async function getRelationshipTypes() {
  const relationships = {
    uses: {
      title_de: 'Verwendet',
      title_en: 'Uses',
    },
    usedBy: {
      title_de: 'Verwendung',
      title_en: 'Usages',
    },
    fits: {
      title_de: 'Passt gut zu',
      title_en: 'Fits',
    },
    fittedBy: {
      title_de: 'Dazu passt gut',
      title_en: 'Best accompanied by',
    },
    variations: {
      title_de: 'Variationen',
      title_en: 'Variations',
    },
    variationOf: {
      title_de: 'Eine Variation von',
      title_en: 'A Variation of',
    },
  };

  return relationships;
}
