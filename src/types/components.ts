import type React from 'react';
import type { AgentType } from './agents';
import type { BusEvent } from './bus';

// Component Router Types
export interface ComponentRoute {
  id: string;
  path: string;
  component: React.ComponentType<Record<string, unknown>>;
  props?: Record<string, unknown>;
  isVisible: boolean;
}

// Component State Manager Types
export interface ComponentState {
  id: string;
  state: Record<string, unknown>;
  subscribers: Set<(state: Record<string, unknown>) => void>;
}

// Node Configuration UI Types
export interface NodeConfigUIState {
  selectedNodeId?: string;
  currentConfig?: Record<string, unknown>;
  validationErrors?: string[];
}

export interface NodeTypeConfig {
  agent: {
    label: string;
    agentType: AgentType;
    agentId: string;
  };
  advanced: {
    label: string;
    agentType: AgentType;
    agentId: string;
    state?: Record<string, unknown>;
  };
  llm_chat: {
    label: string;
    model: string;
    temperature: number;
    context: string[];
  };
  code_executor: {
    label: string;
    code: string;
    environment: string;
    dependencies: string[];
  };
}

// Agent Execution UI Types
export interface ExecutionEvent {
  id: string;
  timestamp: number;
  type: string;
  source: string;
  target: string;
  payload: Record<string, unknown>;
}

export interface AgentExecutionUIState {
  selectedAgentId?: string;
  agentStatus?: 'initializing' | 'active' | 'paused' | 'error' | 'terminated';
  isExecuting?: boolean;
  executionHistory?: ExecutionEvent[];
  executionMetrics?: {
    agent?: {
      eventCount?: number;
      lastActivity?: number;
      messagesSent?: number;
      messagesReceived?: number;
      errorCount?: number;
    };
    network?: {
      totalAgents?: number;
      activeConnections?: number;
      messageFlow?: number;
      averageLatency?: number;
      topologyDensity?: number;
    };
    swarm?: {
      swarmSize?: number;
      convergenceRate?: number;
      diversityIndex?: number;
      consensusCount?: number;
      averageFitness?: number;
    };
  };
}

// Flow Validation Types
export type ValidationSeverity = 'info' | 'warning' | 'error';

export interface ValidationIssue {
  id: string;
  type: 'node' | 'edge' | 'flow';
  targetId?: string;
  message: string;
  severity: ValidationSeverity;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface FlowValidationState {
  isValidating?: boolean;
  lastValidation?: ValidationResult;
  autoValidate?: boolean;
}

// Execution History Types
export interface ExecutionFilter {
  agentIds?: string[];
  eventTypes?: string[];
  timeRange?: {
    start: number;
    end: number;
  };
  limit?: number;
}

export interface ExecutionAnalytics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByAgent: Record<string, number>;
  averageMessageLatency: number;
  errorRate: number;
  eventTimeline: {
    timestamp: number;
    count: number;
  }[];
}

export interface ExecutionReport {
  summary: string;
  analytics: ExecutionAnalytics;
  topAgents: {
    id: string;
    eventCount: number;
    errorCount: number;
  }[];
  issues: {
    type: string;
    count: number;
    examples: BusEvent[];
  }[];
  recommendations: string[];
}

export interface ExecutionHistoryState {
  filter?: ExecutionFilter;
  isReplaying?: boolean;
  analytics?: ExecutionAnalytics;
  report?: ExecutionReport;
}

// App State Types for Component Integration
export interface ComponentsState {
  nodeConfig: NodeConfigUIState;
  agentExecution: AgentExecutionUIState;
  flowValidation: FlowValidationState;
  executionHistory: ExecutionHistoryState;
  visibleComponents: string[];
}

export interface ComponentStateManager {
  getState: (componentId: string) => Record<string, unknown>;
  setState: (componentId: string, state: Record<string, unknown>) => void;
  resetState: (componentId: string) => void;
  subscribe: (
    componentId: string,
    callback: (state: Record<string, unknown>) => void
  ) => void;
}
