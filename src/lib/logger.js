/**
 * Shared logging utilities for MCP servers
 * Provides consistent timestamped logging across all servers
 */

function logDebug(message, ...args) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [DEBUG] ${message}`, ...args);
}

function logError(message, ...args) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] ${message}`, ...args);
}

function logInfo(message, ...args) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [INFO] ${message}`, ...args);
}

export { logDebug, logError, logInfo };