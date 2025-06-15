# NodeX API Reference

## Overview

This document provides a comprehensive reference for the NodeX API, including core services, node types, and utility functions.

## Core Services

### 1. ApiKeyManager

Manages API keys for various LLM providers.

```typescript
class ApiKeyManager {
  // Store a new API key
  async storeKey(provider: LLMProvider, key: string): Promise<void>;
  
  // Retrieve an API key
  async getKey(provider: LLMProvider): Promise<string | null>;
  
  // Check if a provider has a valid key
  hasValidKey(provider: LLMProvider): boolean;
  
  // Get all configured providers
  getAllProviders(): LLMProvider[];
  
  // Check rate limits for a provider
  checkRateLimit(provider: LLMProvider): boolean;
}
```

### 2. ExecutionEngine

Manages node execution and flow control.

```typescript
class ExecutionEngine {
  // Execute a node
  async executeNode(node: NodeConfig): Promise<ExecutionResult>;
  
  // Get supported node types
  getSupportedNodeTypes(): NodeType[];
  
  // Validate a node configuration
  async validateNode(node: NodeConfig): Promise<ValidationResult>;
  
  // Register a node executor
  registerExecutor(type: NodeType, executor: NodeExecutor): void;
  
  // Get execution metrics
  getMetrics(): ExecutionMetrics;
}
```

### 3. LLMService

Handles LLM interactions and provider management.

```typescript
class LLMService {
  // Make an LLM request
  async makeRequest(
    provider: LLMProvider,
    request: LLMRequest,
    context?: Partial<LLMExecutionContext>
  ): Promise<LLMResponse>;
  
  // Get available providers
  getAvailableProviders(): LLMProvider[];
  
  // Get provider metrics
  getMetrics(provider?: LLMProvider): LLMMetrics | Map<LLMProvider, LLMMetrics>;
  
  // Register a provider adapter
  registerAdapter(provider: LLMProvider, adapter: ProviderAdapter): void;
}
```

### 4. ExecutionHistoryService

Tracks and manages execution history.

```typescript
class ExecutionHistoryService {
  // Get execution events
  getEvents(filter?: ExecutionFilter): BusEvent[];
  
  // Analyze execution
  analyzeExecution(filter?: ExecutionFilter): ExecutionAnalytics;
  
  // Replay execution
  async replayExecution(events: BusEvent[]): Promise<void>;
  
  // Clear history
  clearHistory(olderThan?: number): void;
}
```

## Node Types

### 1. LLM Nodes

#### LLMChatNode

```typescript
interface LLMChatNodeConfig {
  type: 'llm_chat';
  config: {
    provider: LLMProvider;
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    conversationHistory: boolean;
    streaming: boolean;
    functions?: LLMFunction[];
  };
}
```

#### LLMCompletionNode

```typescript
interface LLMCompletionNodeConfig {
  type: 'llm_completion';
  config: {
    provider: LLMProvider;
    model?: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
    streaming: boolean;
  };
}
```

### 2. Processing Nodes

#### CodeExecutorNode

```typescript
interface CodeExecutorNodeConfig {
  type: 'code_executor';
  config: {
    language: string;
    code: string;
    timeout: number;
    sandbox: boolean;
    environment: Record<string, string>;
    allowedModules?: string[];
  };
}
```

#### DataProcessorNode

```typescript
interface DataProcessorNodeConfig {
  type: 'data_processor';
  config: {
    operations: Array<{
      type: 'transform' | 'filter' | 'aggregate' | 'join';
      parameters: Record<string, unknown>;
    }>;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
  };
}
```

### 3. Integration Nodes

#### ApiConnectorNode

```typescript
interface ApiConnectorNodeConfig {
  type: 'api_connector';
  config: {
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    authentication?: {
      type: 'basic' | 'bearer' | 'apiKey';
      credentials: Record<string, string>;
    };
    rateLimit?: {
      requests: number;
      period: number;
    };
  };
}
```

## Event System

### 1. Event Bus

```typescript
interface EventBus {
  // Publish an event
  publish<T>(event: BusEvent<T>): Promise<void>;
  
  // Subscribe to events
  subscribe<T = unknown>(
    type: BusEventType | BusEventType[],
    handler: EventHandler<T>
  ): () => void;
  
  // Unsubscribe from events
  unsubscribe<T = unknown>(
    type: BusEventType[],
    handler: EventHandler<T>
  ): void;
  
  // Query events
  query(filter: EventFilter): EventLogEntry[];
  
  // Get event log
  getLog(filter?: EventFilter): EventLogEntry[];
}
```

### 2. Event Types

```typescript
type BusEventType =
  | 'NODE_CREATE'
  | 'NODE_UPDATE'
  | 'NODE_DELETE'
  | 'EDGE_CREATE'
  | 'EDGE_UPDATE'
  | 'EDGE_DELETE'
  | 'FLOW_EXECUTE'
  | 'FLOW_PAUSE'
  | 'FLOW_STOP'
  | 'AGENT_MESSAGE'
  | 'AGENT_STATE_UPDATE'
  | 'SYSTEM_METRICS'
  | 'SECURITY_EVENT';
```

## State Management

### 1. Graph Store

```typescript
interface GraphStore {
  // Get nodes
  getNodes(): Node[];
  
  // Get edges
  getEdges(): Edge[];
  
  // Add node
  addNode(node: Node): void;
  
  // Update node
  updateNode(node: Node): void;
  
  // Delete node
  deleteNode(nodeId: string): void;
  
  // Add edge
  addEdge(edge: Edge): void;
  
  // Update edge
  updateEdge(edge: Edge): void;
  
  // Delete edge
  deleteEdge(edgeId: string): void;
}
```

### 2. Component State

```typescript
interface ComponentState {
  // Get state
  getState<T>(key: string): T | null;
  
  // Set state
  setState<T>(key: string, value: T): void;
  
  // Subscribe to state changes
  subscribe<T>(
    key: string,
    callback: (value: T) => void
  ): () => void;
  
  // Clear state
  clearState(key?: string): void;
}
```

## Utility Functions

### 1. Security Utilities

```typescript
// Secure code execution
function secureCode(code: string): string;

// Validate API key
function validateApiKey(provider: string, key: string): boolean;

// Encrypt data
function encrypt(data: string): Promise<string>;

// Decrypt data
function decrypt(encrypted: string): Promise<string>;
```

### 2. Node Utilities

```typescript
// Validate node configuration
function validateNodeConfig(config: NodeConfig): ValidationResult;

// Create node
function createNode(type: NodeType, config: Partial<NodeConfig>): Node;

// Connect nodes
function connectNodes(source: Node, target: Node, edgeType: EdgeType): Edge;

// Execute node
function executeNode(node: Node): Promise<ExecutionResult>;
```

### 3. Event Utilities

```typescript
// Create event
function createEvent<T>(
  type: BusEventType,
  source: string,
  payload: T
): BusEvent<T>;

// Filter events
function filterEvents(
  events: BusEvent[],
  filter: EventFilter
): BusEvent[];

// Replay events
function replayEvents(events: BusEvent[]): Promise<void>;
```

## Type Definitions

### 1. Core Types

```typescript
type LLMProvider = 'openai' | 'claude' | 'gemini' | 'perplexity';

type NodeType =
  | 'llm_chat'
  | 'llm_completion'
  | 'code_executor'
  | 'data_processor'
  | 'api_connector'
  | 'web_scraper'
  | 'web_search';

type EdgeType = 'data' | 'control' | 'execution';
```

### 2. Configuration Types

```typescript
interface BaseNodeConfig {
  id: string;
  name: string;
  description?: string;
  position: Position;
  style?: NodeStyle;
  metadata?: Record<string, unknown>;
}

interface EdgeConfig {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  data?: EdgeData;
  style?: EdgeStyle;
}
```

## Error Handling

### 1. Error Types

```typescript
class NodeXError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  SECURITY_ERROR = 'SECURITY_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  LLM_ERROR = 'LLM_ERROR'
}
```

### 2. Error Handling

```typescript
// Handle error
async function handleError(error: NodeXError): Promise<void> {
  // Log error
  await logError(error);
  
  // Attempt recovery
  if (canRecover(error)) {
    await recover(error);
  }
  
  // Notify components
  await notifyComponents(error);
}
```

## Best Practices

### 1. API Usage

- Use type-safe interfaces
- Handle errors properly
- Implement proper cleanup
- Monitor resource usage
- Follow security guidelines

### 2. Node Development

- Keep nodes focused
- Implement proper validation
- Handle edge cases
- Document capabilities
- Test thoroughly

### 3. Event Handling

- Use appropriate event types
- Implement proper filtering
- Handle event errors
- Clean up subscriptions
- Monitor event flow

### 4. Security

- Validate all inputs
- Secure sensitive data
- Implement proper access control
- Monitor security events
- Follow security best practices
