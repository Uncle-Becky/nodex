export type LLMProvider = 'openai' | 'claude' | 'gemini' | 'perplexity';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface LLMFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required?: string[];
  };
}

export interface LLMRequest {
  messages: LLMMessage[];
  functions?: LLMFunction[];
  function_call?: 'auto' | 'none' | { name: string };
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  user?: string;
}

export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
    };
    finish_reason?: string;
  }>;
}

export interface LLMError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

export interface LLMCapability {
  id: string;
  name: string;
  description: string;
  category: 'reasoning' | 'analysis' | 'generation' | 'tool_use' | 'multimodal';
  provider: LLMProvider;
  model: string;
  functions?: LLMFunction[];
  systemPrompt?: string;
  examples?: Array<{
    input: string;
    output: string;
  }>;
}

export interface LLMExecutionContext {
  nodeId: string;
  sessionId: string;
  userId?: string;
  capabilities: string[];
  memory: Record<string, unknown>;
  tools: string[];
  constraints: {
    maxTokens: number;
    timeout: number;
    rateLimits: Record<string, number>;
  };
}

export interface LLMTask {
  id: string;
  type: 'completion' | 'function_call' | 'analysis' | 'generation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  input: LLMRequest;
  context: LLMExecutionContext;
  metadata: {
    createdAt: number;
    updatedAt: number;
    attempts: number;
    maxAttempts: number;
  };
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: LLMResponse;
  error?: LLMError;
}

export interface LLMMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  tokensUsed: number;
  costEstimate: number;
  rateLimitHits: number;
  lastActivity: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  tokensPerDay: { number: number; timestamp: number }[];
  tokensPerHour: { number: number; timestamp: number }[];
  tokensPerMinute: { number: number; timestamp: number }[];
  rateLimitHits: { number: number; timestamp: number }[];
  rateLimitHits24h: { number: number; timestamp: number }[];
  rateLimitHits7d: { number: number; timestamp: number }[];
  rateLimitHits30d: { number: number; timestamp: number }[];
  rateLimitHits90d: { number: number; timestamp: number }[];
}

export interface UsageTracker {
  requests: { timestamp: number; tokens: number }[];
}

export interface LLMProviderConfig {
  rateLimits: RateLimitConfig;
  usage: UsageTracker;
}

export interface LLMProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
}