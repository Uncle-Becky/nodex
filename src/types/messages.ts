export interface AgentWorkerMessage {
  type: string;
  timestamp: number;
  queueId: string;
  payload?: unknown;
}

export interface WorkerMessage {
  type: string;
  timestamp: number;
  queueId: string;
  payload?: unknown;
}

export interface WorkerResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  timestamp: number;
}

export interface TaskMessage {
  id: string;
  type: 'reasoning' | 'swarm' | 'analysis';
  data: unknown;
  priority: 'low' | 'normal' | 'high';
  timeout?: number;
}

export interface TaskResult {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
  processingTime: number;
}

export interface UiMessage {
  type: string;
  payload: {
    beliefs?: unknown;
    result?: unknown;
    [key: string]: unknown;
  };
}

// Additional types that were missing
export interface AgentBeliefs {
  [key: string]: unknown;
  lastResponse?: unknown;
}

export interface AgentStatus {
  status: 'idle' | 'active' | 'busy' | 'error' | 'offline';
  lastActivity: number;
  [key: string]: unknown;
}

export interface AgentPercept {
  type: string;
  data: unknown;
  timestamp: number;
  source?: string;
}

export interface AgentResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  timestamp: number;
  processingTime?: number;
}
