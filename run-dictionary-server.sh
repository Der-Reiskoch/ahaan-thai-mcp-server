#!/bin/bash

# Das Verzeichnis des Scripts ermitteln und dorthin wechseln
cd "$(dirname "${BASH_SOURCE[0]}")"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 18.17.0
node ./dictionary-server.js