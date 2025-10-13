#!/usr/bin/env node
import { writeFileSync } from 'fs';

const distPackage = {
  name: 'ahaan-thai-mcp-server',
  version: '1.0.0',
  description: 'Ahaan Thai MCP Server for Netcup deployment',
  main: 'index.js',
  type: 'commonjs',
  scripts: {
    start: 'node index.js'
  },
  dependencies: {
    '@modelcontextprotocol/sdk': '^1.20.0',
    'express': '^4.18.2',
    'cors': '^2.8.5',
    'node-fetch': '^3.3.2',
    'zod': '^3.25.76'
  },
  engines: {
    'node': '>=18.0.0'
  },
  author: 'Der Reiskoch',
  license: 'MIT'
};

writeFileSync('dist/package.json', JSON.stringify(distPackage, null, 2) + '\n');
console.log('✓ Created dist/package.json');
