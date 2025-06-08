import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export interface MCPContext {
  id: string;
  ownerId: string; // User ID, agent ID, or session ID
  type: string;    // e.g., "generic_session", "reasoning_agent_memory", "chat_history"
  createdAt: Date;
  updatedAt: Date;
  data: any;
  metadata?: Record<string, any>;
}

// Resolve path relative to the project root, assuming 'dist' will be the output directory for compiled JS
// __dirname in CommonJS (after TSC compilation to dist/services) will be 'mcp-server/dist/services'
// So, going up two levels gets to 'mcp-server/'
const CONTEXT_FILE_PATH = path.join(__dirname, '..', '..', 'mcp_contexts.json');
let contexts: Map<string, MCPContext> = new Map();

async function loadContextsFromFile(): Promise<void> {
  try {
    const fileData = await fs.readFile(CONTEXT_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(fileData);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // Convert plain object back to Map and Dates
        const deserializedContexts = new Map<string, MCPContext>();
        for (const key in parsed) {
            if (Object.prototype.hasOwnProperty.call(parsed, key)) {
                const ctx = parsed[key] as any;
                deserializedContexts.set(key, {
                    ...ctx,
                    createdAt: new Date(ctx.createdAt),
                    updatedAt: new Date(ctx.updatedAt),
                });
            }
        }
        contexts = deserializedContexts;
    }
    console.log(`[ContextStore] Contexts loaded from file: ${CONTEXT_FILE_PATH}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`[ContextStore] No context file found at ${CONTEXT_FILE_PATH}, starting with empty contexts.`);
    } else {
      console.error(`[ContextStore] Failed to load contexts from file ${CONTEXT_FILE_PATH}:`, error);
    }
  }
}

async function saveContextsToFile(): Promise<void> {
  try {
    // Convert Map to plain object for JSON serialization
    const plainObjectContexts: Record<string, any> = {};
    contexts.forEach((value, key) => {
        plainObjectContexts[key] = value;
    });
    await fs.writeFile(CONTEXT_FILE_PATH, JSON.stringify(plainObjectContexts, null, 2), 'utf-8');
    // console.log('[ContextStore] Contexts saved to file.'); // Can be too verbose for interval saving
  } catch (error) {
    console.error(`[ContextStore] Failed to save contexts to file ${CONTEXT_FILE_PATH}:`, error);
  }
}

// Load contexts when the module initializes
loadContextsFromFile().then(() => {
    console.log('[ContextStore] Initial context load attempt complete.');
});

// Periodically save contexts (basic approach)
const SAVE_INTERVAL = 30000; // 30 seconds
setInterval(async () => {
    if (contexts.size > 0) { // Only save if there's something to save
        console.log(`[ContextStore] Auto-saving ${contexts.size} contexts...`);
        await saveContextsToFile();
    }
}, SAVE_INTERVAL);


export const contextService = {
  createContext: async (ownerId: string, type: string, initialData?: any, metadata?: Record<string, any>): Promise<MCPContext> => {
    const id = randomUUID();
    const now = new Date();
    const newContext: MCPContext = {
      id,
      ownerId,
      type,
      createdAt: now,
      updatedAt: now,
      data: initialData || {},
      metadata: metadata || {},
    };
    contexts.set(id, newContext);
    await saveContextsToFile(); // Save immediately on creation
    console.log(`[ContextStore] Context created: ${id}, type: ${type}, owner: ${ownerId}`);
    return newContext;
  },

  getContext: async (contextId: string): Promise<MCPContext | undefined> => {
    return contexts.get(contextId);
  },

  updateContext: async (contextId: string, data: any, metadata?: Record<string, any>): Promise<MCPContext | undefined> => {
    const context = contexts.get(contextId);
    if (!context) return undefined;
    context.data = data;
    if (metadata) context.metadata = { ...context.metadata, ...metadata }; // Merge metadata
    context.updatedAt = new Date();
    contexts.set(contextId, context);
    await saveContextsToFile(); // Save immediately on update
    console.log(`[ContextStore] Context updated: ${contextId}`);
    return context;
  },

  appendToListInContext: async (contextId: string, listKey: string, item: any): Promise<MCPContext | undefined> => {
    const context = contexts.get(contextId);
    if (!context) return undefined;
    if (!context.data[listKey] || !Array.isArray(context.data[listKey])) {
      context.data[listKey] = [];
    }
    context.data[listKey].push(item);
    context.updatedAt = new Date();
    contexts.set(contextId, context);
    await saveContextsToFile();
    console.log(`[ContextStore] Item appended to list '${listKey}' in context: ${contextId}`);
    return context;
  },

  deleteContext: async (contextId: string): Promise<boolean> => {
    const deleted = contexts.delete(contextId);
    if (deleted) {
        await saveContextsToFile(); // Save immediately on deletion
        console.log(`[ContextStore] Context deleted: ${contextId}`);
    }
    return deleted;
  },
};
