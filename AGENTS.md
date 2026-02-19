# Repository Guidelines

## Project Structure & Module Organization

This repository provides Thai-food MCP servers in two modes:

- Stdio servers at the repo root: `dictionary-server.js`, `library-server.js`, `encyclopedia-server.js`
- HTTP MCP server in `src/index.js` (Streamable HTTP transport)

Shared business logic lives in `src/lib/` (`dictionary-logic.js`, `library-logic.js`, `encyclopedia-logic.js`, plus `cache.js` and `logger.js`).
Build output is generated into `dist/`. Claude Desktop bundle assets live in `mcpb/` (`manifest.json`, icon, packed `.mcpb`).

## Build, Test, and Development Commands

- `npm install`: install dependencies (Node `>=18`, see `.nvmrc`).
- `npm run stdio:dictionary:start` (or `:library:start`, `:encyclopedia:start`): run local stdio MCP servers.
- `npm run stdio:dictionary:inspect` (and equivalents): open MCP Inspector against a stdio server.
- `npm run http-mcp:start`: run HTTP MCP server on port 3000.
- `npm run http-mcp:dev`: run HTTP MCP server with watch mode.
- `npm run http-mcp:build`: bundle `src/index.js` to `dist/index.js` and generate `dist/package.json`.
- `npm run http-mcp:bundle:pack`: create `mcpb/ahaan-thai.mcpb`.

## Coding Style & Naming Conventions

Use ES modules (`"type": "module"`), semicolons, and 2-space indentation. Match the existing quote style in touched files (root servers often use double quotes; `src/lib/*` often uses single quotes).
Use descriptive camelCase for functions/variables and kebab-case for filenames (for example `dictionary-logic.js`). Keep shared domain logic in `src/lib/` and keep server entrypoints thin.

## Testing Guidelines

There is currently no automated unit test suite. Validate changes with focused smoke tests:

1. Start the affected server (`npm run stdio:*:start` or `npm run http-mcp:start`).
2. Run MCP Inspector (`npm run stdio:*:inspect` or `npm run http-mcp:inspect`).
3. Exercise changed tools and error paths; verify API fetch and response shape.

Before submitting, run `npm run http-mcp:build` to catch bundling/runtime issues.

## Commit & Pull Request Guidelines

Recent history mostly follows Conventional Commit prefixes (`feat:`, `fix:`, `refactor:`, `chore:`, `style:`). Continue this format when possible (for example `fix: handle empty encyclopedia region map`).

PRs should include:

- Clear summary of behavior changes
- Affected server(s) and files
- Manual verification steps (commands + tools exercised)
- Linked issue (if available)
- Screenshots/log snippets only when UI/inspector output clarifies behavior
