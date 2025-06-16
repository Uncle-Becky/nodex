// Assuming MCPContext, ServerLLMRequest, ServerLLMResponse types are accessible
// or defined/imported here. For PoC, we can redefine simplified versions if needed.

export interface McpContextResponse {
  // Simplified for client, matches server's MCPContext
  id: string;
  ownerId: string;
  type: string;
  createdAt: string; // Dates will be strings over HTTP
  updatedAt: string;
  data: unknown;
  metadata?: Record<string, unknown>;
}

export interface ClientLLMRequest {
  // Simplified from ServerLLMRequest for client
  messages: Array<{ role: string; content: string }>;
  model?: string;
  max_tokens?: number; // Matched to serverLlmService which uses max_tokens for OpenAI
  temperature?: number;
}

export interface ClientLLMResponse {
  // Simplified from ServerLLMResponse
  choices: Array<{
    message?: { role: string; content: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens: number;
  }; // Ensure total_tokens is expected
  error?: unknown;
}

const MCP_SERVER_BASE_URL =
  process.env.REACT_APP_MCP_SERVER_URL ?? 'http://localhost:3001/api/mcp';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: { message?: string; error?: { message?: string } };
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    console.error('MCP API Error:', errorData);
    throw new Error(
      `HTTP error ${response.status}: ${errorData?.error?.message ?? errorData?.message ?? response.statusText}`
    );
  }
  // For 204 No Content, response.json() will fail. Handle it before.
  if (response.status === 204) {
    return undefined as T; // Or an appropriate empty response
  }
  return response.json() as Promise<T>;
}

export const mcpApiService = {
  createContext: async (
    ownerId: string,
    type: string,
    initialData?: unknown,
    metadata?: Record<string, unknown>
  ): Promise<McpContextResponse> => {
    console.log(
      `[McpApiService] Creating context: ownerId=${ownerId}, type=${type}`
    );
    const response = await fetch(`${MCP_SERVER_BASE_URL}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId, type, initialData, metadata }),
    });
    return handleResponse<McpContextResponse>(response);
  },

  getContext: async (contextId: string): Promise<McpContextResponse | null> => {
    console.log(`[McpApiService] Getting context: contextId=${contextId}`);
    try {
      const response = await fetch(
        `${MCP_SERVER_BASE_URL}/context/${contextId}`
      );
      if (response.status === 404) {
        console.log(`[McpApiService] Context not found: ${contextId}`);
        return null;
      }
      return handleResponse<McpContextResponse>(response);
    } catch (error) {
      console.error(
        `[McpApiService] Error fetching context ${contextId}:`,
        error
      );
      throw error;
    }
  },

  updateContext: async (
    contextId: string,
    data: unknown,
    metadata?: Record<string, unknown>
  ): Promise<McpContextResponse> => {
    console.log(`[McpApiService] Updating context: contextId=${contextId}`);
    const response = await fetch(
      `${MCP_SERVER_BASE_URL}/context/${contextId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, metadata }),
      }
    );
    return handleResponse<McpContextResponse>(response);
  },

  appendToListInContext: async (
    contextId: string,
    listKey: string,
    item: unknown
  ): Promise<McpContextResponse> => {
    console.log(
      `[McpApiService] Appending to list '${listKey}' in context: ${contextId}`
    );
    const response = await fetch(
      `${MCP_SERVER_BASE_URL}/context/${contextId}/append`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listKey, item }),
      }
    );
    return handleResponse<McpContextResponse>(response);
  },

  deleteContext: async (contextId: string): Promise<void> => {
    console.log(`[McpApiService] Deleting context: contextId=${contextId}`);
    const response = await fetch(
      `${MCP_SERVER_BASE_URL}/context/${contextId}`,
      {
        method: 'DELETE',
      }
    );
    if (!response.ok && response.status !== 204) {
      const errorData = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      console.error('[McpApiService] Error deleting context:', errorData);
      throw new Error(
        `HTTP error ${response.status}: ${errorData.message ?? response.statusText}`
      );
    }
    // No JSON body expected for 204, handleResponse would fail if not for earlier check
  },

  makeLlmRequest: async (
    provider: string,
    request: ClientLLMRequest,
    contextIds?: string[]
  ): Promise<ClientLLMResponse> => {
    console.log(
      `[McpApiService] Making LLM request: provider=${provider}, model=${request.model}`
    );
    const response = await fetch(`${MCP_SERVER_BASE_URL}/llm/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Ensure request matches ServerLLMRequest on the server side
      // ClientLLMRequest has maxTokens, serverLlmService expects max_tokens
      body: JSON.stringify({
        provider,
        request: {
          // This inner 'request' object is what serverLlmService expects
          messages: request.messages,
          model: request.model,
          max_tokens: request.maxTokens, // Ensure field name matches server
          temperature: request.temperature,
        },
        contextIds,
      }),
    });
    return handleResponse<ClientLLMResponse>(response);
  },
};

// Define or import Memory interface from ReasoningAgent.ts if not already globally available
// For this subtask, assume ReasoningAgent.Memory is defined elsewhere and accessible.
// Or, if it's simple enough, redefine it here for clarity for McpApiService.
export interface Memory {
  // Copied from ReasoningAgent for clarity if not shared
  id: string;
  content: unknown;
  timestamp: number; // Will be new Date(timestamp).getTime() on client after loading
  importance: number;
  tags: string[];
  embedding?: number[];
}
