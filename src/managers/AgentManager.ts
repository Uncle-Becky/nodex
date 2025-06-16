import { CanvasMetaAgent } from '../agents/CanvasMetaAgent';
import type { AgentId, AgentState, AgentType } from '../types/agents';
import type { BusEvent } from '../types/bus';
import { eventBus } from '../utils/eventBus';

export interface AgentInfo extends Pick<AgentState, 'id' | 'type' | 'status'> {
  createdAt: number;
  lastActivity: number;
  messageCount: number;
  errorCount: number;
  position?: { x: number; y: number };
  state?: Partial<AgentState>;
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
  private messageHistory: BusEvent<unknown>[] = [];

  constructor() {
    this.canvasAgent = new CanvasMetaAgent();
    this.initialize();
  }

  private initialize(): void {
    const eventTypes = [
      'AGENT_INIT',
      'AGENT_MESSAGE',
      'AGENT_STATE_UPDATE',
      'AGENT_ERROR',
      'SYSTEM_METRICS',
    ] as const;

    eventBus.subscribe(eventTypes, (event: BusEvent<unknown>) => {
      this.handleEvent(event);
    });
  }

  public async createAgent(type: AgentType, id?: AgentId): Promise<AgentId> {
    const agentId =
      id ?? `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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

    // Update status after initialization
    const updatedInfo = { ...agentInfo, status: 'active' as const };
    this.agents.set(agentId, updatedInfo);

    return agentId;
  }

  private handleEvent(event: BusEvent<unknown>): void {
    this.messageHistory.push(event);

    // Keep message history at a reasonable size
    if (this.messageHistory.length > 10000) {
      this.messageHistory = this.messageHistory.slice(-5000);
    }

    // Update agent state based on event
    if (event.target && this.agents.has(event.target)) {
      const agent = this.agents.get(event.target)!;
      agent.lastActivity = event.timestamp;
      agent.messageCount++;

      if (event.type === 'AGENT_ERROR') {
        agent.errorCount++;
      }

      this.agents.set(event.target, agent);
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
    args: unknown[] = []
  ): void {
    const event: BusEvent<{ command: string; args: unknown[] }> = {
      id: `canvas-command-${Date.now()}`,
      type: 'CANVAS_COMMAND',
      timestamp: Date.now(),
      source: 'agent-manager',
      target: agentId,
      payload: {
        command,
        args,
      },
    };

    eventBus.publish(event);
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
