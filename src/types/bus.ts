export type AgentId = string;
export type CanvasId = 'canvas';
export type BusEventType =
  | 'AGENT_INIT'
  | 'AGENT_MESSAGE'
  | 'AGENT_STATE_UPDATE'
  | 'AGENT_ERROR'
  | 'SYSTEM_METRICS'
  | 'CANVAS_COMMAND'
  | 'NODE_SELECT'
  | 'FLOW_VALIDATION_RESULT';

export type EventPriority = 'low' | 'normal' | 'high' | 'critical';

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
    correlationId?: string;
    causationId?: string;
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
  type?: BusEventType | BusEventType[];
  source?: string | string[];
  target?: string | string[];
  startTime?: number;
  endTime?: number;
  tags?: string[];
  correlationId?: string;
  causationId?: string;
  custom?: (event: BusEvent) => boolean;
}

export interface EventHandler<T = unknown> {
  handler: (event: BusEvent<T>) => void | Promise<void>;
  priority?: EventPriority;
  filter?: (event: BusEvent<T>) => boolean;
}

export interface EventMiddleware {
  process: (event: BusEvent, next: () => void) => void | Promise<void>;
  priority: number;
}

export interface EventValidator {
  validate: (event: BusEvent) => boolean | string;
  priority?: EventPriority;
}

export interface EventAnalysis {
  totalEvents: number;
  eventsByType: Record<BusEventType, number>;
  eventsBySource: Record<string, number>;
  averageProcessingTime: number;
  errorRate: number;
  timeline: {
    timestamp: number;
    count: number;
    errors: number;
  }[];
}

export interface BusMetrics {
  totalEvents: number;
  activeSubscribers: number;
  averageLatency: number;
  memoryUsage: number;
  errorCount: number;
  uptime: number;
}

export interface EventSubscriptionOptions {
  filter?: (event: BusEvent) => boolean;
  once?: boolean;
  priority?: number;
}

export interface EventQueueStatus {
  queueLength: number;
  processing: boolean;
  oldestEvent: number;
  newestEvent: number;
  retryCount: number;
  errorCount: number;
}

export interface EventPersistenceConfig {
  enabled: boolean;
  maxEvents: number;
  storageKey: string;
  autoPersist: boolean;
  persistInterval: number;
}

export interface EventBusConfig {
  maxQueueSize: number;
  maxRetryAttempts: number;
  processingInterval: number;
  persistence: EventPersistenceConfig;
  defaultTtl?: number;
  defaultPriority: 'low' | 'normal' | 'high';
}

export const DEFAULT_EVENT_BUS_CONFIG: EventBusConfig = {
  maxQueueSize: 1000,
  maxRetryAttempts: 3,
  processingInterval: 100,
  persistence: {
    enabled: true,
    maxEvents: 100,
    storageKey: 'event_bus_queue',
    autoPersist: true,
    persistInterval: 10000,
  },
  defaultTtl: 3600000, // 1 hour
  defaultPriority: 'normal',
};

export interface EventBus {
  publish<T>(event: BusEvent<T>): Promise<void>;
  subscribe<T = unknown>(
    type: BusEventType | BusEventType[],
    handler: EventHandler<T> | ((event: BusEvent<T>) => void | Promise<void>),
    options?: {
      filter?: (event: BusEvent<T>) => boolean;
      once?: boolean;
    }
  ): () => void;
  unsubscribe<T = unknown>(
    types: BusEventType[],
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
