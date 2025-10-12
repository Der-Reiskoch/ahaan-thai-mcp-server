# Thai Food REST API

REST API for Thai Food data from ahaan-thai.de. Provides remote HTTP access to Dictionary, Book Info, Library, and Encyclopedia APIs.

## Architecture

The REST API (`src/index.js`) uses the same shared business logic (`src/lib/*`) as the local MCP servers, ensuring consistency between local and remote access.

## Quick Start

### Development (Local)

```bash
# Install dependencies
npm install

# Start REST API (Port 3000)
npm run start:rest

# Start with auto-reload
npm run dev:rest

# Run tests
npm run test:rest
```

Server runs on `http://localhost:3000` by default

### Production (Build for Deployment)

```bash
# Build bundled version for deployment
npm run build:rest
```

This creates `dist/index.js` (28.8kb bundled) + `dist/package.json` - ready for upload to Netcup.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## API Endpoints

### Root & Health

```bash
# API Documentation
GET /

# Health Check
GET /health
```

### Dictionary Endpoints

```bash
# List all categories
GET /api/dictionary/categories

# Search dictionary
GET /api/dictionary/search?q=tom+yum&category=soups

# Get category items
GET /api/dictionary/category/soups

# Translate Thai word
GET /api/dictionary/translate?word=ต้มยำ
```

### Book Info Endpoints

```bash
# List all books
GET /api/books

# Search books
GET /api/books/search?query=thai&language=de&level=1

# Get book by ISBN
GET /api/books/isbn/978-3-8338-6829-8

# Get books by author
GET /api/books/author/vatcharin

# Get books by language
GET /api/books/language/de

# Get book statistics
GET /api/books/stats
```

### Library Endpoints

```bash
# List all cookbooks
GET /api/library/cookbooks

# Get recipes from cookbook
GET /api/library/cookbook/bangkok_original_streetfood

# Search recipes
GET /api/library/search?query=pad+thai&region=central

# Get specific recipe
GET /api/library/recipe/bangkok_original_streetfood/042%20Miang%20Kham

# Get recipes by region
GET /api/library/region/isaan

# Get library statistics
GET /api/library/stats
```

### Encyclopedia Endpoints

```bash
# Search encyclopedia
GET /api/encyclopedia/search?q=curry&limit=20

# Get entries by region
GET /api/encyclopedia/region/bangkok?limit=10

# Get entries by tag
GET /api/encyclopedia/tag/spicy?limit=15

# Get all entries
GET /api/encyclopedia/entries?limit=100

# Get all regions
GET /api/encyclopedia/regions

# Get all relationship types
GET /api/encyclopedia/relationships
```

## Deployment to Netcup

**Quick Summary:**

1. Build: `npm run build:rest`
2. Upload: `dist/index.js` + `dist/package.json` to server
3. Start: `node index.js`

## Configuration

### Environment Variables

```bash
# Port (default: 3000)
PORT=8080

# Node environment
NODE_ENV=production
```

### CORS Configuration

Edit `src/index.js` before building:

```javascript
// Allow all origins (default)
app.use(cors());

// Only specific origins
app.use(
  cors({
    origin: "https://your-domain.com",
  })
);
```

Then rebuild: `npm run build:rest`

## Development

### Testing

```bash
# Start server
npm run start:rest

# In another terminal:
curl http://localhost:3000/health
curl http://localhost:3000/api/dictionary/categories
```

### Cache

All data is cached for 5 minutes. Cache can be configured in `src/lib/cache.js`.

## API Response Format

### Success Response

```json
{
  "count": 10,
  "results": [...]
}
```

### Error Response

```json
{
  "error": "Error message",
  "path": "/api/..."
}
```

## Features

- ✅ **Dual-Mode**: Same business logic as local MCP servers
- ✅ **CORS enabled**: All origins (configurable)
- ✅ **JSON responses**: Consistent format
- ✅ **Error handling**: Proper HTTP status codes
- ✅ **Request logging**: All requests logged
- ✅ **Health check**: `/health` endpoint
- ✅ **API documentation**: Self-documenting at `/`
- ✅ **Caching**: 5-minute TTL for all data
- ✅ **Bundled**: Single 28.8kb file for deployment
- ✅ **Tested**: Comprehensive test suite included

## Related Documentation

- **Main README**: [README.md](./README.md) - Overview of entire project
- **Deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- **Development**: [CLAUDE.md](./CLAUDE.md) - Architecture and development guide
