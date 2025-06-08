// Basic structure, adapt from client-side LLMService.ts
// This version will read API keys from environment variables.
// For simplicity, it will only implement OpenAI initially.

import fetch from 'node-fetch'; // Ensure node-fetch is added to package.json dependencies

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// Add other provider keys as needed:
// const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
// const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // For Gemini, this might be part of the URL or specific SDK
// const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;


interface LLMRequestMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string; // For function role
}

export interface ServerLLMRequest {
  messages: LLMRequestMessage[];
  model?: string; // Optional, provider might have a default
  max_tokens?: number; // Changed from maxTokens to match OpenAI API
  temperature?: number;
  // Add other relevant parameters from client-side LLMRequest
}

export interface ServerLLMResponse {
  choices: Array<{
    message?: {
      role: string;
      content: string;
    };
    finish_reason?: string;
    index?: number; // OpenAI includes index
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  id?: string; // OpenAI includes an ID for the response
  object?: string; // OpenAI includes object type e.g. "chat.completion"
  created?: number; // OpenAI includes timestamp
  model?: string; // OpenAI includes model used for the completion
  error?: {
      message: string;
      type?: string;
      param?: string | null;
      code?: string | null;
  };
}

export const serverLlmService = {
  makeRequest: async (provider: string, request: ServerLLMRequest): Promise<ServerLLMResponse> => {
    if (provider.toLowerCase() === 'openai') {
      if (!OPENAI_API_KEY) {
        console.error('[ServerLLMService] OpenAI API key not configured.');
        return { choices: [], error: { message: 'OpenAI API key not configured on server.' } };
      }
      try {
        const body = {
            model: request.model || 'gpt-3.5-turbo', // Default model
            messages: request.messages,
            max_tokens: request.max_tokens, // Ensure this is what OpenAI expects (it is)
            temperature: request.temperature,
          };

        // console.log('[ServerLLMService] Sending request to OpenAI:', JSON.stringify(body, null, 2));

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify(body),
        });

        const data = await response.json() as any; // Type assertion for simplicity

        // console.log('[ServerLLMService] Received response from OpenAI:', JSON.stringify(data, null, 2));

        if (!response.ok) {
          console.error('[ServerLLMService] OpenAI API Error:', data.error || data);
          return {
            choices: [],
            error: data.error || { message: `OpenAI API request failed with status ${response.status}` }
          };
        }
        return data as ServerLLMResponse;
      } catch (error: any) {
        console.error('[ServerLLMService] Network error calling OpenAI:', error);
        return { choices: [], error: { message: error.message || 'Network error calling OpenAI' } };
      }
    }
    // Add other providers (Claude, Gemini, Perplexity) here, adapting their API call structure
    // For example, for Perplexity:
    // else if (provider.toLowerCase() === 'perplexity') {
    //   if (!PERPLEXITY_API_KEY) {
    //      console.error('[ServerLLMService] Perplexity API key not configured.');
    //      return { choices:[], error: { message: 'Perplexity API key not configured.'}};
    //   }
    //   // ... fetch call to Perplexity API ...
    // }
    else {
      console.warn(`[ServerLLMService] Provider ${provider} not supported or configured.`);
      return { choices: [], error: { message: `Provider ${provider} not supported or configured.` } };
    }
  },
};
