#!/usr/bin/env node

/**
 * Post-install setup script
 * Runs after npm install to ensure proper configuration
 */

import { existsSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Simple setup without console issues
const logMessage = message => {
  process.stdout.write(message + '\n');
};

// Ensure .env.example exists
const envExamplePath = join(projectRoot, '.env.example');
if (!existsSync(envExamplePath)) {
  const envExample = `# Advanced Agent System Environment Variables
NODE_ENV=development
VITE_DEV_MODE=true
VITE_AGENT_DEBUG=false
VITE_MAX_AGENTS=100
VITE_WORKER_POOL_SIZE=8
`;
  writeFileSync(envExamplePath, envExample);
  logMessage('✅ Created .env.example');
}

logMessage('🚀 Advanced Agent System - Ready for development!');
logMessage('Run: npm run setup:dev for full environment setup');
