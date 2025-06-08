import type { LLMProvider } from './llm';

export type NodeType =
  | 'llm_chat'
  | 'llm_completion'
  | 'llm_function'
  | 'code_executor'
  | 'data_processor'
  | 'web_scraper'
  | 'file_processor'
  | 'image_analyzer'
  | 'text_analyzer'
  | 'workflow_controller'
  | 'memory_bank'
  | 'api_connector'
  | 'data_transformer'
  | 'decision_tree'
  | 'loop_controller'
  | 'condition_checker'
  | 'aggregator'
  | 'splitter'
  | 'merger'
  | 'validator'
  | 'formatter'
  | 'scheduler'
  | 'monitor'
  | 'logger'
  | 'web_search'; // Added new node type

export interface BaseNodeConfig {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  position: { x: number; y: number };
  enabled: boolean;
  metadata: {
    createdAt: number;
    updatedAt: number;
    version: string;
    author?: string;
    tags: string[];
  };
}

export interface LLMChatNodeConfig extends BaseNodeConfig {
  type: 'llm_chat';
  config: {
    provider: LLMProvider;
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    conversationHistory: boolean;
    streaming: boolean;
    functions?: Array<{
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    }>;
  };
}

export interface LLMCompletionNodeConfig extends BaseNodeConfig {
  type: 'llm_completion';
  config: {
    provider: LLMProvider;
    model?: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    outputFormat: 'text' | 'json' | 'markdown' | 'code';
  };
}

export interface CodeExecutorNodeConfig extends BaseNodeConfig {
  type: 'code_executor';
  config: {
    language: 'javascript' | 'python' | 'typescript' | 'sql';
    code: string;
    timeout: number;
    allowNetworkAccess: boolean;
    allowFileAccess: boolean;
    environment: Record<string, unknown>;
    dependencies: string[];
  };
}

export interface DataProcessorNodeConfig extends BaseNodeConfig {
  type: 'data_processor';
  config: {
    operations: Array<{
      type: 'filter' | 'map' | 'reduce' | 'sort' | 'group' | 'aggregate';
      parameters: Record<string, unknown>;
    }>;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    validation: boolean;
  };
}

export interface WebScraperNodeConfig extends BaseNodeConfig {
  type: 'web_scraper';
  config: {
    url: string;
    selectors: Record<string, string>;
    waitFor?: string;
    timeout: number;
    headers?: Record<string, string>;
    followRedirects: boolean;
    respectRobots: boolean;
    rateLimit: number;
  };
}

export interface FileProcessorNodeConfig extends BaseNodeConfig {
  type: 'file_processor';
  config: {
    supportedTypes: string[];
    operations: Array<{
      type: 'read' | 'write' | 'parse' | 'convert' | 'validate';
      parameters: Record<string, unknown>;
    }>;
    maxFileSize: number;
    encoding?: string;
  };
}

export interface ImageAnalyzerNodeConfig extends BaseNodeConfig {
  type: 'image_analyzer';
  config: {
    analysisTypes: Array<
      'ocr' | 'object_detection' | 'face_recognition' | 'scene_analysis'
    >;
    provider: 'openai' | 'google' | 'aws' | 'azure';
    confidence: number;
    outputFormat: 'json' | 'text';
  };
}

export interface TextAnalyzerNodeConfig extends BaseNodeConfig {
  type: 'text_analyzer';
  config: {
    analysisTypes: Array<
      'sentiment' | 'entities' | 'keywords' | 'summary' | 'classification'
    >;
    language?: string;
    confidence: number;
    customModels?: string[];
  };
}

export interface WorkflowControllerNodeConfig extends BaseNodeConfig {
  type: 'workflow_controller';
  config: {
    controlType: 'sequential' | 'parallel' | 'conditional' | 'loop';
    conditions?: Array<{
      field: string;
      operator: 'equals' | 'contains' | 'greater' | 'less';
      value: unknown;
    }>;
    maxIterations?: number;
    errorHandling: 'stop' | 'continue' | 'retry';
    retryCount?: number;
  };
}

export interface MemoryBankNodeConfig extends BaseNodeConfig {
  type: 'memory_bank';
  config: {
    storageType: 'temporary' | 'persistent' | 'shared';
    maxSize: number;
    ttl?: number;
    encryption: boolean;
    indexing: boolean;
    searchable: boolean;
  };
}

export interface ApiConnectorNodeConfig extends BaseNodeConfig {
  type: 'api_connector';
  config: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers?: Record<string, string>;
    authentication?: {
      type: 'bearer' | 'basic' | 'api_key' | 'oauth';
      credentials: Record<string, string>;
    };
    timeout: number;
    retries: number;
    rateLimit: number;
  };
}

export type NodeConfig =
  | LLMChatNodeConfig
  | LLMCompletionNodeConfig
  | CodeExecutorNodeConfig
  | DataProcessorNodeConfig
  | WebScraperNodeConfig
  | FileProcessorNodeConfig
  | ImageAnalyzerNodeConfig
  | TextAnalyzerNodeConfig
  | WorkflowControllerNodeConfig
  | MemoryBankNodeConfig
  | ApiConnectorNodeConfig;
// Add WebSearchNodeConfig to this union if specific config fields are needed.
// For now, assuming web_search uses BaseNodeConfig or a generic config if no specific fields like maxResults are strictly typed yet.
// If WebSearchExecutor expects specific config fields (e.g., maxResults), a WebSearchNodeConfig interface should be defined
// and added to the NodeConfig union type. For this PoC, config.config?.maxResults was used, implying a loose structure.

export interface WebSearchNodeConfig extends BaseNodeConfig {
  type: 'web_search';
  config: {
    maxResults?: number; // Optional: maximum number of search results to return
    // Any other web_search specific configurations can be added here
  };
}


export type NodeConfig =
  | LLMChatNodeConfig
  | LLMCompletionNodeConfig
  | CodeExecutorNodeConfig
  | DataProcessorNodeConfig
  | WebScraperNodeConfig
  | FileProcessorNodeConfig
  | ImageAnalyzerNodeConfig
  | TextAnalyzerNodeConfig
  | WorkflowControllerNodeConfig
  | MemoryBankNodeConfig
  | ApiConnectorNodeConfig
  | WebSearchNodeConfig; // Added WebSearchNodeConfig

export interface NodeExecution {
  id: string;
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  input: unknown;
  output?: unknown;
  error?: string;
  metrics: {
    duration: number;
    memoryUsage: number;
    tokensUsed?: number;
    cost?: number;
  };
}

export interface NodeCapability {
  id: string;
  name: string;
  description: string;
  category: string;
  inputs: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  configuration: Record<
    string,
    {
      type: string;
      default?: unknown;
      required: boolean;
      description: string;
      options?: unknown[];
    }
  >;
}

export interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: NodeType;
  defaultConfig: Partial<NodeConfig>;
  capabilities: NodeCapability[];
  examples: Array<{
    name: string;
    description: string;
    config: Partial<NodeConfig>;
    sampleInput: unknown;
    expectedOutput: unknown;
  }>;
}
