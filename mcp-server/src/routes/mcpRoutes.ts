import express, { Router, Request, Response } from 'express';
import { contextService, MCPContext } from '../services/contextStore';
import { serverLlmService, ServerLLMRequest } from '../services/serverLlmService';

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
        // Example of how one might augment (very basic, assumes first context has a 'messages' list):
        // const firstContextId = contextIds[0];
        // const contextData = await contextService.getContext(firstContextId);
        // if (contextData && contextData.data && Array.isArray(contextData.data.messages)) {
        //   const historyMessages = contextData.data.messages.map((msg: any) => ({ role: msg.role, content: msg.content }));
        //   request.messages = [...historyMessages, ...request.messages];
        //   console.log(`[LLM Route] Augmented messages with history from context ${firstContextId}`);
        // }
    }

    const llmResponse = await serverLlmService.makeRequest(provider, request as ServerLLMRequest);

    if (llmResponse.error) {
      // Log the specific error from the LLM service for server-side debugging
      console.error(`[LLM Route] Error from ${provider}:`, llmResponse.error);
      // Consider more specific error codes based on llmResponse.error type if available
      // e.g. if llmResponse.error.code === 'insufficient_quota' return 429
      return res.status(502).json({ // Bad Gateway: server received an invalid response from upstream server
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

export default router;
