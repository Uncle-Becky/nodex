export type AgentId = string;
export type CanvasId = 'canvas';
export type BusEventType =
  | 'AGENT_INIT'
  | 'AGENT_MESSAGE'
  | 'AGENT_STATE_UPDATE'
  | 'AGENT_ERROR'
  | 'EDGE_UPDATE'
  | 'SYSTEM_EVENT'
  | 'CANVAS_COMMAND'
  | 'EDGE_CREATE'
  | 'NODE_CREATE'
  | 'SYSTEM_ALERT'
  | 'AGENT_QUERY'
  | 'SYSTEM_METRICS'
  // Node Configuration Events
  | 'NODE_SELECT'
  | 'NODE_CONFIG_UPDATE'
  // Agent Execution Events
  | 'AGENT_SELECT'
  | 'AGENT_EXECUTE'
  | 'AGENT_PAUSE'
  | 'AGENT_STOP'
  // Component Visibility Events
  | 'COMPONENT_VISIBILITY'
  // Component State Events
  | 'COMPONENT_STATE_UPDATE'
  | 'COMPONENT_STATE_RESET'
  | 'COMPONENT_STATE_CHANGED'
  // Flow Validation Events
  | 'FLOW_VALIDATE'
  | 'FLOW_VALIDATION_RESULT'
  // Flow Execution Events
  | 'FLOW_EXECUTE'
  | 'FLOW_PAUSE'
  | 'FLOW_STOP'
  // Execution History Events
  | 'EXECUTION_HISTORY_CLEARED'
  | 'EXECUTION_REPLAY_START'
  | 'EXECUTION_REPLAY_END'
  // Edge Data Events
  | 'REQUEST_EDGE_DATA'
  | 'EDGE_DATA_RESPONSE'
  // Agent Goal Events
  | 'AGENT_GOAL_ACHIEVED'
  | 'AGENT_GOALS_UPDATE';

export type EventPriority = 'low' | 'normal' | 'high';

export interface BusEvent<T = unknown> {
  id: string;
  type: BusEventType;
  timestamp: number;
  source: string;
  target?: string;
  payload: T;
  priority?: EventPriority;
  ttl?: number;
  meta?: {
    tags?: string[];
    [key: string]: unknown;
  };
}

export interface AgentStateUpdatePayload {
  agentId: AgentId;
  state: Record<string, unknown>;
  metrics?: Record<string, unknown>;
}

export interface EventLogEntry extends BusEvent {
  processed: boolean;
  processingTime: number;
  errors: string[];
  retryCount: number;
}

export interface EventFilter {
  type?: BusEventType;
  source?: string;
  target?: string;
  startTime?: number;
  endTime?: number;
  hasErrors?: boolean;
  tags?: string[];
}

export interface EventHandler<T = unknown> {
  handler: (event: BusEvent<T>) => void | Promise<void>;
  priority?: number;
  filter?: (event: BusEvent<T>) => boolean;
  once?: boolean;
}

export interface EventMiddleware {
  process: (event: BusEvent, next: () => void) => void;
  priority: number;
}

export interface EventValidator {
  validate: (event: BusEvent) => boolean | string;
  eventTypes?: BusEventType[];
}

export interface EventAnalysis {
  totalEvents: number;
  eventsByType: Record<BusEventType, number>;
  eventsBySource: Record<string, number>;
  averageProcessingTime: number;
  errorRate: number;
  timelineAnalysis: Record<string, number>;
}

export interface BusMetrics {
  totalEvents: number;
  activeSubscribers: number;
  averageLatency: number;
  memoryUsage: number;
  errorCount: number;
  uptime: number;
}

export interface EventBus {
  publish<T>(event: BusEvent<T>): Promise<void>;
  subscribe<T = unknown>(
    type: BusEventType | BusEventType[],
    handler: EventHandler<T> | ((event: BusEvent<T>) => void | Promise<void>)
  ): () => void;
  unsubscribe<T = unknown>(
    type: BusEventType[],
    handler: EventHandler<T> | ((event: BusEvent<T>) => void | Promise<void>)
  ): void;
  query(filter: EventFilter): EventLogEntry[];
  getLog(filter?: EventFilter): EventLogEntry[];
  replay(log: EventLogEntry[]): Promise<void>;
  analyze(filter?: EventFilter): EventAnalysis;
  getMetrics(): BusMetrics;
  clearLog(olderThan?: number): void;
  pause(): void;
  resume(): void;
  addValidator(validator: EventValidator): void;
  addMiddleware(middleware: EventMiddleware): void;
}
