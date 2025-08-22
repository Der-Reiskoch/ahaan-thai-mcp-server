#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 18.17.0
node ~/Projects/foodie/thai-food-dictionary-mcp-server/server.js