import fs from 'fs';
import fsPromises from 'fs/promises'; // Added import
import path from 'path';

// Determine the base directory correctly.
// When running from 'dist/config/serverConfig.js', __dirname is 'mcp-server/dist/config'
// So, path.join(__dirname, '..', '..') gives 'mcp-server/'
// When running from 'src/config/serverConfig.ts' (e.g. with ts-node for dev), __dirname is 'mcp-server/src/config'
// So, path.join(__dirname, '..', '..') also gives 'mcp-server/'
const PROJ_ROOT = path.join(__dirname, '..', '..');
export const CONFIG_PATH = path.join(PROJ_ROOT, 'mcp_config.json'); // Exported CONFIG_PATH


export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggingConfig {
  level: LogLevel;
}
export interface FeatureFlagsConfig {
  [key: string]: boolean;
}

export interface ServerConfig {
  logging: LoggingConfig;
  featureFlags: FeatureFlagsConfig;
  // other configs can be added here
}

let currentConfig: ServerConfig;

function getDefaultConfig(): ServerConfig {
  return {
    logging: { level: "info" },
    featureFlags: { newFeatureX: false }
  };
}

export function loadConfig(): ServerConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const rawData = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const parsedConfig = JSON.parse(rawData);

      // Basic validation and merging with defaults to ensure all parts are present
      const defaultConfig = getDefaultConfig();

      if (!parsedConfig.logging || !['debug', 'info', 'warn', 'error'].includes(parsedConfig.logging.level)) {
        console.warn(`[Config] Invalid or missing logging configuration in ${CONFIG_PATH}, using default.`);
        parsedConfig.logging = defaultConfig.logging;
      }
      if (typeof parsedConfig.featureFlags !== 'object' || parsedConfig.featureFlags === null) {
        console.warn(`[Config] Invalid or missing featureFlags configuration in ${CONFIG_PATH}, using default.`);
        parsedConfig.featureFlags = defaultConfig.featureFlags;
      } else {
        // Ensure all default feature flags are present if some are missing
        parsedConfig.featureFlags = { ...defaultConfig.featureFlags, ...parsedConfig.featureFlags };
      }

      currentConfig = {
        ...defaultConfig, // Start with defaults
        ...parsedConfig, // Override with parsed values
        logging: parsedConfig.logging, // Ensure nested objects are correctly assigned
        featureFlags: parsedConfig.featureFlags,
      };

      console.log(`[Config] Configuration loaded from ${CONFIG_PATH}. Log level: ${currentConfig.logging.level}`);
      return currentConfig;
    } else {
      console.warn(`[Config] ${CONFIG_PATH} not found, creating with default values.`);
      currentConfig = getDefaultConfig();
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2), 'utf-8');
      return currentConfig;
    }
  } catch (error) {
    console.error(`[Config] Error loading or creating ${CONFIG_PATH}, using default in-memory config:`, error);
    currentConfig = getDefaultConfig(); // Use default if file is corrupt
    return currentConfig;
  }
}

// Load config at module initialization
currentConfig = loadConfig();

export function getConfig(): ServerConfig {
  // In case currentConfig was not initialized due to an error during initial load, try loading again.
  if (!currentConfig) {
    console.warn('[Config] currentConfig is undefined, attempting to load again.');
    loadConfig();
  }
  return currentConfig;
}

export function getRawConfigAsString(): string {
    try {
        return fs.readFileSync(CONFIG_PATH, 'utf-8');
    } catch (e) {
        console.warn(`[Config] Failed to read ${CONFIG_PATH} for getRawConfigAsString, returning current in-memory config. Error:`, e);
        return JSON.stringify(getConfig(), null, 2); // return current in-memory if file read fails
    }
}

// For this PoC, reloadConfig will just re-read from file.
// More advanced scenarios might involve event emitters to notify modules.
export function reloadConfig(): ServerConfig {
  console.log(`[Config] Attempting to reload server configuration from ${CONFIG_PATH}...`);
  currentConfig = loadConfig(); // This will re-read the file
  console.log("[Config] Server configuration reloaded. New log level:", currentConfig.logging.level);
  return currentConfig;
}

// Export the initially loaded config directly for convenience for some modules if needed
// However, getConfig() is preferred to ensure consistency if dynamic reloading is improved.
export default currentConfig;

export async function saveConfig(configToSave: ServerConfig): Promise<void> {
  try {
    // Basic validation before saving (optional, but good practice)
    if (!configToSave.logging || !['debug', 'info', 'warn', 'error'].includes(configToSave.logging.level)) {
        throw new Error('Attempted to save invalid logging configuration.');
    }
    // Add more validation for other config parts as needed, e.g., featureFlags structure
    if (typeof configToSave.featureFlags !== 'object' || configToSave.featureFlags === null) {
        throw new Error('Attempted to save invalid featureFlags configuration.');
    }


    const configString = JSON.stringify(configToSave, null, 2);
    await fsPromises.writeFile(CONFIG_PATH, configString, 'utf-8');
    console.log('[Config] Server configuration saved to mcp_config.json');
    currentConfig = configToSave; // Update the in-memory currentConfig as well
  } catch (error) {
    console.error('[Config] Error saving server configuration to mcp_config.json:', error);
    throw error; // Re-throw to be handled by the caller
  }
}
