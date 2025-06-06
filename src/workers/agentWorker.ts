import type {
  AgentBeliefs,
  AgentPercept,
  AgentResponse,
  AgentStatus,
  AgentWorkerMessage,
  UiMessage,
} from '../types/messages';

interface AgentState {
  status: AgentStatus;
  beliefs: AgentBeliefs;
}

let state: AgentState = {
  status: { status: 'idle', lastActivity: Date.now() },
  beliefs: { nodeId: '' },
};

function sendMessage(update: Partial<AgentWorkerMessage>) {
  const message: AgentWorkerMessage = {
    timestamp: Date.now(),
    queueId: `queue-${Date.now()}-${Math.random()}`,
    ...update,
  } as AgentWorkerMessage;
  postMessage(message);
}

function handleError(error: unknown) {
  const message =
    error instanceof Error ? error.message : 'Unknown error occurred';
  state.status = { status: 'error', lastActivity: Date.now() };
  state.beliefs['error'] = message;
  sendMessage({ type: 'ERROR', payload: { message } });
}

async function processQuery(query: string) {
  try {
    state.status = { status: 'busy', lastActivity: Date.now() };
    state.beliefs['lastQuery'] = query;
    // Example query processing - replace with actual logic
    const result: AgentResponse = {
      success: true,
      result: query,
      timestamp: Date.now(),
    };
    state.beliefs['lastResponse'] = result;
    sendMessage({ type: 'QUERY_RESPONSE', payload: { result } });
  } catch (error) {
    handleError(error);
  } finally {
    state.status = { status: 'idle', lastActivity: Date.now() };
  }
}

async function processPercept(percept: AgentPercept) {
  try {
    state.status = { status: 'active', lastActivity: Date.now() };
    state.beliefs['lastPercept'] = percept;
    // Example percept processing - replace with actual logic
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing
    sendMessage({ type: 'STATE_UPDATE', payload: state });
  } catch (error) {
    handleError(error);
  } finally {
    state.status = { status: 'idle', lastActivity: Date.now() };
  }
}

function resetState(nodeId: string) {
  state = {
    status: { status: 'idle', lastActivity: Date.now() },
    beliefs: { nodeId },
  };
  sendMessage({ type: 'STATE_UPDATE', payload: state });
}

self.onmessage = (e: MessageEvent<UiMessage>) => {
  const { type, payload } = e.data;
  try {
    switch (type) {
      case 'INIT':
        if (payload && typeof payload['nodeId'] === 'string') {
          resetState(payload['nodeId']);
        }
        break;
      case 'PROCESS':
        if (payload?.['percept']) {
          processPercept(payload['percept'] as AgentPercept);
        }
        break;
      case 'QUERY':
        if (payload && typeof payload['query'] === 'string') {
          processQuery(payload['query']);
        }
        break;
      case 'RESET':
        if (payload && typeof payload['nodeId'] === 'string') {
          resetState(payload['nodeId']);
        }
        break;
    }
  } catch (error) {
    handleError(error);
  }
};
