import { ReasoningAgent } from '../agents/ReasoningAgent';
import type { BusEvent } from '../types/bus';

let agent: ReasoningAgent | null = null;

// Message handler for the worker
self.onmessage = (event: MessageEvent) => {
  const startTime = Date.now();

  try {
    const { type, agentId, payload } = event.data;

    switch (type) {
      case 'WORKER_INIT':
        // Worker pool initialization
        break;

      case 'INIT_REASONING_AGENT':
        if (!agent) {
          agent = new ReasoningAgent(agentId);

          // Send initialization complete
          self.postMessage({
            busEvent: {
              id: `${agentId}-initialized-${Date.now()}`,
              type: 'AGENT_INIT',
              timestamp: Date.now(),
              source: agentId,
              payload: { agentType: 'reasoning', status: 'initialized' },
            },
            queueId: event.data.queueId,
            processingTime: Date.now() - startTime,
          });
        }
        break;

      case 'AGENT_MESSAGE':
        if (agent && payload) {
          // Create a proper BusEvent for the agent to process
          const busEvent: BusEvent = {
            id: `worker-msg-${Date.now()}`,
            type: 'AGENT_MESSAGE',
            timestamp: Date.now(),
            source: 'worker',
            target: agentId,
            payload,
          };

          // Process message through the agent
          agent.processMessage(busEvent);
        }
        break;

      case 'CANVAS_COMMAND':
        if (agent && payload) {
          const busEvent: BusEvent = {
            id: `worker-command-${Date.now()}`,
            type: 'CANVAS_COMMAND',
            timestamp: Date.now(),
            source: 'canvas',
            target: agentId,
            payload,
          };

          // Process command through the agent
          agent.processCommand(busEvent);
        }
        break;

      default:
        console.warn(`Unknown message type in reasoning worker: ${type}`);
    }

    // Send processing confirmation
    self.postMessage({
      queueId: event.data.queueId,
      processingTime: Date.now() - startTime,
      status: 'processed',
    });
  } catch (error) {
    console.error('Error in reasoning worker:', error);

    self.postMessage({
      busEvent: {
        id: `worker-error-${Date.now()}`,
        type: 'AGENT_ERROR',
        timestamp: Date.now(),
        source: agent?.id ?? 'unknown',
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error',
          workerType: 'reasoning',
        },
      },
      queueId: event.data.queueId,
      processingTime: Date.now() - startTime,
    });
  }
};
