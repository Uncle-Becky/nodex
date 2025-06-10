import type { BusEvent } from '../types/bus';
import { createEvent, eventBus } from '../utils/eventBus';

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

export class ExecutionHistoryService {
  private static instance: ExecutionHistoryService;
  private eventHistory: BusEvent[] = [];
  private readonly MAX_HISTORY_SIZE = 10000;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): ExecutionHistoryService {
    if (!ExecutionHistoryService.instance) {
      ExecutionHistoryService.instance = new ExecutionHistoryService();
    }
    return ExecutionHistoryService.instance;
  }

  private initialize(): void {
    // Subscribe to all relevant event types
    eventBus.subscribe(
      [
        'AGENT_INIT',
        'AGENT_EXECUTE',
        'AGENT_PAUSE',
        'AGENT_STOP',
        'AGENT_MESSAGE',
        'AGENT_STATE_UPDATE',
        'AGENT_ERROR',
        'NODE_CREATE',
        'NODE_SELECT',
        'NODE_CONFIG_UPDATE',
        'EDGE_CREATE',
        'EDGE_UPDATE',
        'FLOW_VALIDATE',
        'FLOW_VALIDATION_RESULT',
        'FLOW_EXECUTE',
        'FLOW_PAUSE',
        'FLOW_STOP',
        'SYSTEM_METRICS',
      ],
      event => {
        this.storeEvent(event);
      }
    );
  }

  private storeEvent(event: BusEvent): void {
    this.eventHistory.push(event);

    // Trim history if it exceeds the maximum size
    if (this.eventHistory.length > this.MAX_HISTORY_SIZE) {
      this.eventHistory = this.eventHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  public getEvents(filter?: ExecutionFilter): BusEvent[] {
    let filteredEvents = this.eventHistory;

    if (filter) {
      const agentIds = filter.agentIds ?? [];
      if (agentIds.length > 0) {
        filteredEvents = filteredEvents.filter(event => {
          const sourceMatch = agentIds.includes(event.source);
          const targetMatch = event.target
            ? agentIds.includes(event.target)
            : false;
          return sourceMatch || targetMatch;
        });
      }

      const eventTypes = filter.eventTypes ?? [];
      if (eventTypes.length > 0) {
        filteredEvents = filteredEvents.filter(event =>
          eventTypes.includes(event.type)
        );
      }

      if (filter.timeRange) {
        filteredEvents = filteredEvents.filter(
          event =>
            event.timestamp >= (filter.timeRange?.start ?? 0) &&
            event.timestamp <= (filter.timeRange?.end ?? Infinity)
        );
      }

      if (filter.limit) {
        filteredEvents = filteredEvents.slice(-filter.limit);
      }
    }

    return filteredEvents;
  }

  public clearHistory(): void {
    this.eventHistory = [];

    // Publish history cleared event
    eventBus.publish(
      createEvent('EXECUTION_HISTORY_CLEARED', 'execution-history-service', {
        timestamp: Date.now(),
      })
    );
  }

  public analyzeExecution(filter?: ExecutionFilter): ExecutionAnalytics {
    const events = this.getEvents(filter);

    // Count events by type
    const eventsByType: Record<string, number> = {};
    events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] ?? 0) + 1;
    });

    // Count events by agent
    const eventsByAgent: Record<string, number> = {};
    events.forEach(event => {
      if (event.source !== 'system' && event.source !== 'ui') {
        eventsByAgent[event.source] = (eventsByAgent[event.source] ?? 0) + 1;
      }
      if (event.target && event.target !== 'system' && event.target !== 'ui') {
        eventsByAgent[event.target] = (eventsByAgent[event.target] ?? 0) + 1;
      }
    });

    // Calculate message latency
    let totalLatency = 0;
    let messageCount = 0;

    const messageEvents = events.filter(
      event => event.type === 'AGENT_MESSAGE'
    );
    for (let i = 1; i < messageEvents.length; i++) {
      const currentEvent = messageEvents[i];
      const previousEvent = messageEvents[i - 1];

      if (
        currentEvent?.source === previousEvent?.target &&
        currentEvent?.target === previousEvent?.source
      ) {
        const latency =
          (currentEvent?.timestamp ?? 0) - (previousEvent?.timestamp ?? 0);
        totalLatency += latency;
        messageCount++;
      }
    }

    const averageMessageLatency =
      messageCount > 0 ? totalLatency / messageCount : 0;

    // Calculate error rate
    const errorEvents = events.filter(event => event.type === 'AGENT_ERROR');
    const errorRate =
      events.length > 0 ? errorEvents.length / events.length : 0;

    // Create event timeline
    const timeMap = new Map<number, number>();
    events.forEach(event => {
      const timeKey = Math.floor(event.timestamp / 60000) * 60000; // Group by minute
      timeMap.set(timeKey, (timeMap.get(timeKey) ?? 0) + 1);
    });

    const eventTimeline = Array.from(timeMap.entries())
      .map(([timestamp, count]) => ({ timestamp, count }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      totalEvents: events.length,
      eventsByType,
      eventsByAgent,
      averageMessageLatency,
      errorRate,
      eventTimeline,
    };
  }

  public generateReport(filter?: ExecutionFilter): ExecutionReport {
    const events = this.getEvents(filter);
    const analytics = this.analyzeExecution(filter);

    // Identify top agents
    const agentEventMap = new Map<
      string,
      { eventCount: number; errorCount: number }
    >();

    events.forEach(event => {
      if (event.source !== 'system' && event.source !== 'ui') {
        const agentStats = agentEventMap.get(event.source) ?? {
          eventCount: 0,
          errorCount: 0,
        };
        agentStats.eventCount++;

        if (event.type === 'AGENT_ERROR') {
          agentStats.errorCount++;
        }
        agentEventMap.set(event.source, agentStats);
      }
    });

    const topAgents = Array.from(agentEventMap.entries())
      .map(([id, stats]) => ({
        id,
        eventCount: stats.eventCount,
        errorCount: stats.errorCount,
      }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 5);

    // Identify issues
    const issues = [];

    // High error rate agents
    const highErrorAgents = topAgents.filter(
      agent => agent.errorCount > 0 && agent.errorCount / agent.eventCount > 0.1
    );

    if (highErrorAgents.length > 0) {
      const errorEvents = events.filter(
        event =>
          event.type === 'AGENT_ERROR' &&
          highErrorAgents.some(agent => agent.id === event.source)
      );

      issues.push({
        type: 'high_error_rate',
        count: highErrorAgents.length,
        examples: errorEvents.slice(0, 3),
      });
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (highErrorAgents.length > 0) {
      recommendations.push(
        `Investigate high error rates in agents: ${highErrorAgents
          .map(agent => agent.id)
          .join(', ')}`
      );
    }

    if (analytics.errorRate > 0.1) {
      recommendations.push(
        'Overall error rate is high. Consider reviewing agent configurations and error handling.'
      );
    }

    if (analytics.averageMessageLatency > 1000) {
      recommendations.push(
        'Message latency is high. Consider optimizing agent communication patterns.'
      );
    }

    return {
      summary: `Execution report for ${events.length} events`,
      analytics,
      topAgents,
      issues,
      recommendations,
    };
  }

  public async replayExecution(events: BusEvent[]): Promise<void> {
    const replayStartEvent = createEvent(
      'EXECUTION_REPLAY_START',
      'execution-history-service',
      {
        timestamp: Date.now(),
        eventCount: events.length,
      }
    );

    eventBus.publish(replayStartEvent);

    const errors: Error[] = [];
    for (const event of events) {
      try {
        await eventBus.publish(event);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between events
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    const replayEndEvent = createEvent(
      'EXECUTION_REPLAY_END',
      'execution-history-service',
      {
        timestamp: Date.now(),
        eventCount: events.length,
        success: errors.length === 0,
        errors: errors.map(e => e.message),
      }
    );

    eventBus.publish(replayEndEvent);

    if (errors.length > 0) {
      // Publish error event instead of using console.error
      eventBus.publish(
        createEvent('SYSTEM_ALERT', 'execution-history-service', {
          level: 'error',
          message: 'Errors occurred during execution replay',
          details: {
            errorCount: errors.length,
            errors: errors.map(e => e.message),
          },
          source: 'execution-history-service',
          actionRequired: true,
        })
      );
    }
  }
}
