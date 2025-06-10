import React, { useEffect, useState } from 'react';
import { AgentManager } from '../managers/AgentManager';
import { ComponentStateManager } from '../managers/ComponentStateManager';
import { useGraphStore } from '../store/useGraphStore';
import type {
  AgentExecutionUIState,
  ExecutionEvent,
} from '../types/components';
import { createEvent, eventBus } from '../utils/eventBus';

interface AgentExecutionUIProps {
  agentId?: string;
}

export const AgentExecutionUI: React.FC<AgentExecutionUIProps> = ({
  agentId,
}) => {
  const { nodes, edges } = useGraphStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(
    agentId
  );
  const [agentStatus, setAgentStatus] = useState<
    'initializing' | 'active' | 'paused' | 'error' | 'terminated'
  >('initializing');
  const [executionHistory, setExecutionHistory] = useState<ExecutionEvent[]>(
    []
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMetrics, setExecutionMetrics] = useState<Record<string, any>>(
    {}
  );

  const stateManager = ComponentStateManager.getInstance();
  const agentManager = new AgentManager();

  useEffect(() => {
    // Load initial agent if provided
    if (agentId) {
      setSelectedAgentId(agentId);
      loadAgentStatus(agentId);
    }

    // Subscribe to agent selection events
    const handleAgentSelection = (event: any) => {
      if (event.type === 'AGENT_SELECT') {
        setSelectedAgentId(event.payload.agentId);
        loadAgentStatus(event.payload.agentId);
      }
    };

    // Subscribe to agent execution events
    const handleAgentExecution = (event: any) => {
      if (
        [
          'AGENT_INIT',
          'AGENT_MESSAGE',
          'AGENT_STATE_UPDATE',
          'AGENT_ERROR',
        ].includes(event.type)
      ) {
        if (
          event.target === selectedAgentId ||
          event.source === selectedAgentId
        ) {
          setExecutionHistory(prev => [...prev, event]);
        }
      }
    };

    const selectionUnsubscribe = eventBus.subscribe(
      ['AGENT_SELECT'],
      handleAgentSelection
    );
    const executionUnsubscribe = eventBus.subscribe(
      ['AGENT_INIT', 'AGENT_MESSAGE', 'AGENT_STATE_UPDATE', 'AGENT_ERROR'],
      handleAgentExecution
    );

    return () => {
      selectionUnsubscribe();
      executionUnsubscribe();
    };
  }, [agentId, selectedAgentId]);

  // Subscribe to component state
  useEffect(() => {
    const unsubscribe = stateManager.subscribe(
      'agentExecutionUI',
      (state: AgentExecutionUIState) => {
        if (state.selectedAgentId) {
          setSelectedAgentId(state.selectedAgentId);
          loadAgentStatus(state.selectedAgentId);
        }
      }
    );

    return unsubscribe;
  }, []);

  const loadAgentStatus = (agentId: string) => {
    const agents = agentManager.getAgents();
    const agent = agents.find(a => a.id === agentId);

    if (agent) {
      setAgentStatus(agent.status);
      setIsExecuting(agent.status === 'active');

      // Update component state
      stateManager.updateComponentState('agentExecutionUI', {
        selectedAgentId: agentId,
        agentStatus: agent.status,
        isExecuting: agent.status === 'active',
      });
    }
  };

  const executeAgent = () => {
    if (!selectedAgentId) return;

    // Start agent execution
    setIsExecuting(true);
    setAgentStatus('active');

    // Publish agent execution event
    eventBus.publish(
      createEvent('AGENT_EXECUTE', 'agent-execution-ui', {
        agentId: selectedAgentId,
        timestamp: Date.now(),
      })
    );

    // Update component state
    stateManager.updateComponentState('agentExecutionUI', {
      isExecuting: true,
      agentStatus: 'active',
    });

    // Update metrics periodically
    updateExecutionMetrics();
  };

  const pauseAgent = () => {
    if (!selectedAgentId) return;

    // Pause agent execution
    setIsExecuting(false);
    setAgentStatus('paused');

    // Publish agent pause event
    eventBus.publish(
      createEvent('AGENT_PAUSE', 'agent-execution-ui', {
        agentId: selectedAgentId,
        timestamp: Date.now(),
      })
    );

    // Update component state
    stateManager.updateComponentState('agentExecutionUI', {
      isExecuting: false,
      agentStatus: 'paused',
    });
  };

  const stopAgent = () => {
    if (!selectedAgentId) return;

    // Stop agent execution
    setIsExecuting(false);
    setAgentStatus('terminated');

    // Publish agent stop event
    eventBus.publish(
      createEvent('AGENT_STOP', 'agent-execution-ui', {
        agentId: selectedAgentId,
        timestamp: Date.now(),
      })
    );

    // Update component state
    stateManager.updateComponentState('agentExecutionUI', {
      isExecuting: false,
      agentStatus: 'terminated',
    });
  };

  const updateExecutionMetrics = () => {
    if (!selectedAgentId || !isExecuting) return;

    // Get metrics from agent manager
    const networkMetrics = agentManager.getNetworkMetrics();
    const swarmMetrics = agentManager.getSwarmMetrics();

    // Calculate agent-specific metrics
    const agentEvents = executionHistory.filter(
      event =>
        event.source === selectedAgentId || event.target === selectedAgentId
    );

    const agentMetrics = {
      eventCount: agentEvents.length,
      lastActivity:
        agentEvents.length > 0
          ? agentEvents[agentEvents.length - 1].timestamp
          : 0,
      messagesSent: agentEvents.filter(
        event => event.source === selectedAgentId
      ).length,
      messagesReceived: agentEvents.filter(
        event => event.target === selectedAgentId
      ).length,
      errorCount: agentEvents.filter(event => event.type === 'AGENT_ERROR')
        .length,
    };

    setExecutionMetrics({
      agent: agentMetrics,
      network: networkMetrics,
      swarm: swarmMetrics,
    });

    // Update component state
    stateManager.updateComponentState('agentExecutionUI', {
      executionMetrics: {
        agent: agentMetrics,
        network: networkMetrics,
        swarm: swarmMetrics,
      },
    });

    // Schedule next update if still executing
    if (isExecuting) {
      setTimeout(updateExecutionMetrics, 1000);
    }
  };

  if (!selectedAgentId) {
    return <div className='p-4'>No agent selected</div>;
  }

  const agent = agentManager.getAgents().find(a => a.id === selectedAgentId);
  if (!agent) {
    return <div className='p-4'>Agent not found</div>;
  }

  // Find the node for this agent
  const agentNode = nodes.find(n => n.data?.agentId === selectedAgentId);

  return (
    <div className='p-4 border rounded shadow-sm'>
      <h2 className='text-lg font-semibold mb-4'>
        Agent Execution: {agentNode?.data?.label ?? selectedAgentId}
      </h2>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
        <div className='p-3 border rounded'>
          <h3 className='font-medium mb-2'>Status</h3>
          <div className='flex items-center'>
            <div
              className={`w-3 h-3 rounded-full mr-2 ${
                agentStatus === 'active'
                  ? 'bg-green-500'
                  : agentStatus === 'paused'
                    ? 'bg-yellow-500'
                    : agentStatus === 'error'
                      ? 'bg-red-500'
                      : agentStatus === 'terminated'
                        ? 'bg-gray-500'
                        : 'bg-blue-500'
              }`}
            />
            <span className='capitalize'>{agentStatus}</span>
          </div>
        </div>

        <div className='p-3 border rounded'>
          <h3 className='font-medium mb-2'>Controls</h3>
          <div className='flex space-x-2'>
            <button
              className='px-3 py-1 bg-green-500 text-white rounded disabled:bg-gray-300'
              onClick={executeAgent}
              disabled={isExecuting}
            >
              Execute
            </button>
            <button
              className='px-3 py-1 bg-yellow-500 text-white rounded disabled:bg-gray-300'
              onClick={pauseAgent}
              disabled={!isExecuting || agentStatus !== 'active'}
            >
              Pause
            </button>
            <button
              className='px-3 py-1 bg-red-500 text-white rounded disabled:bg-gray-300'
              onClick={stopAgent}
              disabled={agentStatus === 'terminated'}
            >
              Stop
            </button>
          </div>
        </div>
      </div>

      <div className='mb-4'>
        <h3 className='font-medium mb-2'>Execution Metrics</h3>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
          <div className='p-2 border rounded'>
            <div className='text-sm text-gray-600'>Messages</div>
            <div className='text-lg font-medium'>
              {executionMetrics.agent?.messagesSent ?? 0} /{' '}
              {executionMetrics.agent?.messagesReceived ?? 0}
            </div>
          </div>
          <div className='p-2 border rounded'>
            <div className='text-sm text-gray-600'>Errors</div>
            <div className='text-lg font-medium'>
              {executionMetrics.agent?.errorCount ?? 0}
            </div>
          </div>
          <div className='p-2 border rounded'>
            <div className='text-sm text-gray-600'>Network Load</div>
            <div className='text-lg font-medium'>
              {executionMetrics.network?.messageFlow ?? 0}
            </div>
          </div>
          <div className='p-2 border rounded'>
            <div className='text-sm text-gray-600'>Last Activity</div>
            <div className='text-lg font-medium'>
              {executionMetrics.agent?.lastActivity
                ? new Date(
                    executionMetrics.agent.lastActivity
                  ).toLocaleTimeString()
                : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className='font-medium mb-2'>Execution History</h3>
        <div className='border rounded h-64 overflow-y-auto p-2'>
          {executionHistory.length === 0 ? (
            <div className='text-center text-gray-500 py-4'>
              No execution history yet
            </div>
          ) : (
            executionHistory.map((event, index) => (
              <div key={index} className='mb-2 p-2 border-b'>
                <div className='flex justify-between text-sm'>
                  <span className='font-medium'>{event.type}</span>
                  <span className='text-gray-600'>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className='text-sm'>
                  <span className='text-gray-600'>
                    {event.source} → {event.target}
                  </span>
                </div>
                <div className='text-xs mt-1 font-mono bg-gray-100 p-1 rounded'>
                  {JSON.stringify(event.payload)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
