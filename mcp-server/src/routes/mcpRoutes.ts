import express, { Router, Request, Response } from 'express';
import fsPromises from 'fs/promises'; // Added for backup
import path from 'path'; // Added for path joining
import { contextService, MCPContext } from '../services/contextStore';
import { serverLlmService, ServerLLMRequest } from '../services/serverLlmService';
import {
    getConfig,
    getRawConfigAsString,
    saveConfig,
    reloadConfig,
    LogLevel,
    ServerConfig,
    CONFIG_PATH // Import CONFIG_PATH
} from '../config/serverConfig';

const router: Router = express.Router();

router.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'MCP API is alive!',
    timestamp: new Date().toISOString(),
  });
});

// Context Routes
router.post('/context', async (req: Request, res: Response) => {
  try {
    const { ownerId, type, initialData, metadata } = req.body;
    if (!ownerId || !type) {
      return res.status(400).json({ error: 'ownerId and type are required' });
    }
    const newContext = await contextService.createContext(ownerId, type, initialData, metadata);
    res.status(201).json(newContext);
  } catch (error: any) {
    console.error('[Route /context POST] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create context' });
  }
});

router.get('/context/:contextId', async (req: Request, res: Response) => {
  try {
    const context = await contextService.getContext(req.params.contextId);
    if (!context) {
      return res.status(404).json({ error: 'Context not found' });
    }
    res.status(200).json(context);
  } catch (error: any) {
    console.error(`[Route /context GET ${req.params.contextId}] Error:`, error);
    res.status(500).json({ error: error.message || 'Failed to retrieve context' });
  }
});

router.put('/context/:contextId', async (req: Request, res: Response) => {
  try {
    const { data, metadata } = req.body;
    // Ensure data is provided, even if it's an empty object, to avoid accidentally clearing it
    if (data === undefined) {
        return res.status(400).json({ error: 'data field is required for update, even if empty {}' });
    }
    const updatedContext = await contextService.updateContext(req.params.contextId, data, metadata);
    if (!updatedContext) {
      return res.status(404).json({ error: 'Context not found' });
    }
    res.status(200).json(updatedContext);
  } catch (error: any) {
    console.error(`[Route /context PUT ${req.params.contextId}] Error:`, error);
    res.status(500).json({ error: error.message || 'Failed to update context' });
  }
});

router.post('/context/:contextId/append', async (req: Request, res: Response) => {
  try {
    const { listKey, item } = req.body;
    if (!listKey || item === undefined) {
      return res.status(400).json({ error: 'listKey and item are required' });
    }
    const updatedContext = await contextService.appendToListInContext(req.params.contextId, listKey, item);
    if (!updatedContext) {
      // This could also mean the context was found but listKey was not an array,
      // though current contextService creates it if not found.
      return res.status(404).json({ error: 'Context not found' });
    }
    res.status(200).json(updatedContext);
  } catch (error: any) {
    console.error(`[Route /context POST ${req.params.contextId}/append] Error:`, error);
    res.status(500).json({ error: error.message || 'Failed to append to context list' });
  }
});

router.delete('/context/:contextId', async (req: Request, res: Response) => {
  try {
    const deleted = await contextService.deleteContext(req.params.contextId);
    if (!deleted) {
      return res.status(404).json({ error: 'Context not found' });
    }
    res.status(204).send(); // No content
  } catch (error: any) {
    console.error(`[Route /context DELETE ${req.params.contextId}] Error:`, error);
    res.status(500).json({ error: error.message || 'Failed to delete context' });
  }
});

// LLM Route
router.post('/llm/request', async (req: Request, res: Response) => {
  try {
    const { provider, request, contextIds } = req.body; // contextIds is for future use
    if (!provider || !request) {
      return res.status(400).json({ error: 'provider and request payload are required' });
    }

    // TODO: In future, use contextIds to fetch relevant context from contextService
    // and augment the 'request.messages' before sending to LLM.
    // For example, if contextIds are provided, fetch each one, find a 'chat_history' listKey,
    // and prepend those messages to request.messages.
    // This is a placeholder for that logic.
    if (contextIds && Array.isArray(contextIds) && contextIds.length > 0) {
        console.log(`[LLM Route] Received request with contextIds: ${contextIds.join(', ')}. Augmentation logic TBD.`);
    }

    const llmResponse = await serverLlmService.makeRequest(provider, request as ServerLLMRequest);

    if (llmResponse.error) {
      console.error(`[LLM Route] Error from ${provider}:`, llmResponse.error);
      return res.status(502).json({
          message: `Error from LLM provider ${provider}.`,
          provider_error: llmResponse.error
      });
    }
    res.status(200).json(llmResponse);
  } catch (error: any) {
    console.error('[LLM Route] Internal server error:', error);
    res.status(500).json({ error: error.message || 'Internal server error processing LLM request' });
  }
});

// Admin Routes
// Example of a simple admin check - replace with proper auth in a real app
const isAdmin = (req: Request): boolean => {
    return req.headers['x-admin-secret'] === 'supersecret';
};

router.post('/admin/evolve-config', async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: 'Forbidden: Admin access required.' });
  }

  const { target, request: naturalLanguageRequest } = req.body;

  if (target !== 'logging.level') { // For PoC, only allow changing logging.level
    return res.status(400).json({ error: 'Invalid configuration target. Only "logging.level" is supported for evolution in this PoC.' });
  }
  if (!naturalLanguageRequest || typeof naturalLanguageRequest !== 'string') {
    return res.status(400).json({ error: 'Natural language request string is required.' });
  }

  try {
    const currentLoggingConfig = JSON.stringify(getConfig().logging, null, 2);

    const systemPrompt = `You are an intelligent server configuration assistant. Your task is to modify a server's JSON configuration file based on user requests.
The server configuration is stored in a JSON file. We are focusing on the "logging" section.
The current "logging" section of the config is:
${currentLoggingConfig}

The allowed log levels are: "debug", "info", "warn", "error".
Based on the user's request, determine the new log level.
Output *only* the new string value for the 'logging.level' property (e.g., "debug").
If the request is unclear or asks for an invalid level, output a JSON object like: {"error": "Invalid log level requested or request unclear."}.`;

    const userPrompt = `User request: "${naturalLanguageRequest}"
What is the new string value for "logging.level"?`;

    const llmResponse = await serverLlmService.makeRequest('openai', { // Or another configured provider
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2, // Low temperature for more deterministic config changes
      max_tokens: 50,    // Small, as we expect a single word or short JSON
    });

    if (llmResponse.error || !llmResponse.choices || llmResponse.choices.length === 0) {
      console.error('[Evolve Config] LLM service error:', llmResponse.error);
      return res.status(502).json({ error: 'LLM service failed to process the request.', details: llmResponse.error });
    }

    const proposedChange = llmResponse.choices[0].message?.content?.trim();

    if (!proposedChange) {
      return res.status(500).json({ error: 'LLM returned an empty proposal.' });
    }

    let finalProposal = proposedChange;
    // If LLM returns JSON like {"level": "debug"} or {"error": "..."}, extract the value.
    try {
        const parsedProposal = JSON.parse(proposedChange);
        if (parsedProposal && typeof parsedProposal.error === 'string') {
            // LLM itself indicated an error
             return res.status(400).json({
                error: 'LLM indicated an error with the request.',
                llmError: parsedProposal.error,
                naturalLanguageRequest,
                currentLoggingConfig: JSON.stringify(getConfig().logging, null, 2)
            });
        }
        if (parsedProposal && typeof parsedProposal.level === 'string') { // Check for our specific target
            finalProposal = parsedProposal.level.trim();
        }
        // If it's some other JSON structure but not an error or the expected structure,
        // it will likely fail the validation below, which is fine.
    } catch (e) {
        // Not a JSON object, assume it's a direct string value (as intended by the prompt)
    }

    const allowedLogLevels: LogLevel[] = ["debug", "info", "warn", "error"];
    if (!allowedLogLevels.includes(finalProposal as LogLevel)) {
      return res.status(400).json({
        error: 'Invalid log level proposed by LLM or request too vague.',
        llmProposal: finalProposal, // show what LLM actually proposed
        allowedLevels: allowedLogLevels,
        naturalLanguageRequest,
        currentLoggingConfig: JSON.stringify(getConfig().logging, null, 2),
      });
    }

    // Validation successful, proceed to apply
    const validatedNewLogLevel = finalProposal as LogLevel;

    // try/catch for the application part
    try {
      const currentFullConfig = getConfig(); // Get current config
      const previousLogLevel = currentFullConfig.logging.level;

      // Backup current config file
      // CONFIG_PATH is imported from serverConfig.ts
      const backupPath = path.join(path.dirname(CONFIG_PATH), `mcp_config.backup.${Date.now()}.json`);
      await fsPromises.copyFile(CONFIG_PATH, backupPath);
      console.log(`[Evolve Config] Configuration backed up to ${backupPath}`);

      // Update the config object
      // Important: Create a new object to avoid modifying the cached currentConfig directly
      // if getConfig() returns a direct reference. serverConfig.saveConfig handles updating the
      // actual currentConfig instance in serverConfig.ts.
      const updatedConfig: ServerConfig = {
        ...currentFullConfig,
        logging: {
          ...currentFullConfig.logging,
          level: validatedNewLogLevel,
        },
      };

      // Save the updated config object to file and update in-memory currentConfig
      await saveConfig(updatedConfig);

      // reloadConfig() in serverConfig.ts re-reads from file and updates its internal 'currentConfig'.
      // Since saveConfig already updated it, this is somewhat redundant but ensures any
      // potential event emission or complex reload logic in reloadConfig would be triggered.
      reloadConfig();

      res.status(200).json({
        message: 'Configuration successfully evolved and applied.',
        previousLogLevel: previousLogLevel,
        newLogLevel: validatedNewLogLevel,
        backupPath,
        naturalLanguageRequest,
      });

    } catch (applyError: any) {
      console.error('[Evolve Config] Error applying configuration change:', applyError);
      return res.status(500).json({
        error: 'Failed to apply configuration change.',
        details: applyError.message,
        llmProposal: finalProposal,
        naturalLanguageRequest,
      });
    }

  } catch (error: any) {
    console.error('[Evolve Config] Error in /admin/evolve-config (outer try):', error);
    res.status(500).json({ error: 'Internal server error during config evolution.', details: error.message });
  }
});


export default router;
