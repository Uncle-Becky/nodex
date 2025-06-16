export type AgentId = string;
export type CanvasId = 'canvas';

export interface AgentMetrics {
  messagesProcessed: number;
  messagesSent?: number;
  messagesReceived?: number;
  averageResponseTime: number;
  averageProcessingTime?: number;
  errorCount: number;
  errorsCount?: number; // Alternative name for errorCount
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastActivity: number;
}

export interface AgentState {
  id: AgentId;
  type: AgentType;
  status: AgentStatus;
  position?: { x: number; y: number };
  connections: AgentId[];
  metrics: AgentMetrics;
  beliefs: { [key: string]: unknown };
  memory: { [key: string]: unknown };
  lastUpdate: number;
}

export type AgentType = 'reasoning' | 'swarm' | 'canvas' | 'worker';
export type AgentStatus = 'idle' | 'active' | 'busy' | 'error' | 'offline';

export interface CanvasAgentState extends AgentState {
  type: 'canvas';
  observedEvents: number;
  observedAgents: AgentId[];
  orchestrationCount: number;
  totalCommands?: number;
}

export interface ReasoningAgentState extends AgentState {
  type: 'reasoning';
  memoryCount: number;
  reasoningCount: number;
  totalReasonings?: number;
  confidenceLevel: number;
  lastReasoning?: {
    method: string;
    confidence: number;
  };
  currentThought?: string;
}

export interface SwarmAgentState extends AgentState {
  type: 'swarm';
  swarmSize: number;
  consensusLevel: number;
  optimizationScore: number;
  fitness?: number;
  behavior?: string;
  neighbors?: AgentId[];
}

export interface WorkerAgentState extends AgentState {
  type: 'worker';
  taskQueue: number;
  queueSize?: number;
  completedTasks: number;
  workerPool: number;
  capabilities?: string[];
  currentTask?: {
    type: string;
    id: string;
  };
}

export interface EdgeData {
  id: string;
  source: AgentId;
  target: AgentId;
  type: 'communication' | 'data' | 'control' | 'proximity';
  weight?: number;
  confidence?: number;
  lastActivity?: number;
  metadata?: Record<string, unknown>;
  label?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
  className?: string;
  data?: Record<string, unknown>;
}

export interface AgentBeliefs {
  [key: string]: unknown;
}

export interface Position {
  x: number;
  y: number;
}

export type Set<T> = T[];
