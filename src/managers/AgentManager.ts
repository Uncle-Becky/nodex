import { CanvasMetaAgent } from '../agents/CanvasMetaAgent';
import type { AgentId } from '../types/agents';
import type { BusEvent } from '../types/bus';
import { eventBus } from '../utils/eventBus';

export type AgentType = 'reasoning' | 'swarm' | 'canvas' | 'worker';

export interface AgentInfo {
  id: AgentId;
  type: AgentType;
  status: 'initializing' | 'active' | 'paused' | 'error' | 'terminated';
  createdAt: number;
  lastActivity: number;
  messageCount: number;
  errorCount: number;
  position?: { x: number; y: number };
  state?: Record<string, unknown>;
}

export interface NetworkMetrics {
  totalAgents: number;
  activeConnections: number;
  messageFlow: number;
  averageLatency: number;
  topologyDensity: number;
}

export interface SwarmMetrics {
  swarmSize: number;
  convergenceRate: number;
  diversityIndex: number;
  consensusCount: number;
  averageFitness: number;
}

export class AgentManager {
  private agents: Map<AgentId, AgentInfo> = new Map();
  private canvasAgent: CanvasMetaAgent;
  private messageHistory: BusEvent[] = [];

  constructor() {
    this.canvasAgent = new CanvasMetaAgent();
    this.initialize();
  }

  private initialize(): void {
    eventBus.subscribe(
      [
        'AGENT_INIT',
        'AGENT_MESSAGE',
        'AGENT_STATE_UPDATE',
        'AGENT_ERROR',
        'SYSTEM_METRICS',
      ],
      event => {
        this.handleEvent(event);
      }
    );
  }

  public async createAgent(type: AgentType, id?: AgentId): Promise<string> {
    const agentId: string =
      id ?? `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const agentInfo: AgentInfo = {
      id: agentId,
      type,
      status: 'initializing',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      errorCount: 0,
    };

    this.agents.set(agentId, agentInfo);
    agentInfo.status = 'active';

    // Ensure we always return a string
    if (!agentId) {
      throw new Error('Failed to create agent ID');
    }

    return agentId;
  }

  private handleEvent(event: BusEvent): void {
    this.messageHistory.push(event);

    if (this.messageHistory.length > 10000) {
      this.messageHistory = this.messageHistory.slice(-5000);
    }
  }

  public getAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  public clearAll(): void {
    this.agents.clear();
    this.messageHistory = [];
  }

  public sendCanvasCommand(
    agentId: AgentId,
    command: string,
    args?: unknown[]
  ): void {
    eventBus.publish({
      id: `canvas-command-${Date.now()}`,
      type: 'CANVAS_COMMAND',
      timestamp: Date.now(),
      source: 'agent-manager',
      target: agentId,
      payload: {
        command,
        args,
      },
    });
  }

  public getNetworkMetrics(): NetworkMetrics {
    const activeAgents = Array.from(this.agents.values()).filter(
      agent => agent.status === 'active'
    );

    return {
      totalAgents: this.agents.size,
      activeConnections: activeAgents.length,
      messageFlow: this.messageHistory.length,
      averageLatency: 0, // Would need to calculate from event timing
      topologyDensity: activeAgents.length / Math.max(1, this.agents.size),
    };
  }

  public getSwarmMetrics(): SwarmMetrics {
    const swarmAgents = Array.from(this.agents.values()).filter(
      agent => agent.type === 'swarm'
    );

    return {
      swarmSize: swarmAgents.length,
      convergenceRate: 0, // Would need to calculate from agent states
      diversityIndex: 0, // Would need to calculate from agent behaviors
      consensusCount: 0, // Would need to track consensus events
      averageFitness: 0, // Would need to calculate from optimization results
    };
  }
}
