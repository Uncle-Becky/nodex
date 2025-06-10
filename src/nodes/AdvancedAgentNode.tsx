import { Handle, type NodeProps, Position } from '@xyflow/react';
import { memo, useCallback, useEffect, useState } from 'react';
import type { AgentType } from '../managers/AgentManager';
import type { BusEvent } from '../types/bus';
import { createEvent, eventBus } from '../utils/eventBus';

interface SimpleMetrics {
  messagesProcessed: number;
  averageResponseTime: number;
  errorCount: number;
  uptime: number;
  lastActivity: number;
}

// Memoized component for better performance
export const AdvancedAgentNode = memo<NodeProps>(function AdvancedAgentNode({
  id,
  data,
  selected,
}) {
  const [metrics, setMetrics] = useState<SimpleMetrics>({
    messagesProcessed: 0,
    averageResponseTime: 0,
    errorCount: 0,
    uptime: 0,
    lastActivity: Date.now(),
  });
  const [showDetails, setShowDetails] = useState(false);

  // Memoized event handler to prevent unnecessary re-renders
  const handleMetricsUpdate = useCallback(
    (event: BusEvent) => {
      if (event.type === 'AGENT_STATE_UPDATE' && event.target === id) {
        // Type-safe payload handling
        if (
          event.payload &&
          typeof event.payload === 'object' &&
          'metrics' in event.payload
        ) {
          const metricsPayload = event.payload
            .metrics as Partial<SimpleMetrics>;
          setMetrics(prev => ({
            ...prev,
            ...metricsPayload,
          }));
        }
      }
    },
    [id]
  );

  useEffect(() => {
    const unsubscribe = eventBus.subscribe(
      ['AGENT_STATE_UPDATE', 'AGENT_MESSAGE'],
      handleMetricsUpdate
    );

    return unsubscribe;
  }, [handleMetricsUpdate]);

  const getAgentTypeConfig = (type: AgentType) => {
    const configs = {
      reasoning: {
        color: 'bg-purple-500',
        borderColor: 'border-purple-300',
        icon: '🧠',
        description: 'Cognitive Processing',
      },
      swarm: {
        color: 'bg-amber-500',
        borderColor: 'border-amber-300',
        icon: '🐝',
        description: 'Collective Intelligence',
      },
      canvas: {
        color: 'bg-emerald-500',
        borderColor: 'border-emerald-300',
        icon: '🎯',
        description: 'System Orchestrator',
      },
      worker: {
        color: 'bg-red-500',
        borderColor: 'border-red-300',
        icon: '⚡',
        description: 'Task Execution',
      },
    };
    return configs[type] || configs.reasoning;
  };

  const config = getAgentTypeConfig(
    (data?.['agentType'] as AgentType) || 'reasoning'
  );

  // Handle click to select node
  const handleClick = useCallback(() => {
    eventBus.publish(
      createEvent('NODE_SELECT', 'advanced-agent-node', {
        nodeId: id,
        data,
      })
    );
  }, [id, data]);

  // Get active status from metrics
  const isActive = metrics.lastActivity > Date.now() - 30000; // Active if updated in last 30 seconds

  return (
    <div
      className={`
        relative min-w-[280px] bg-white rounded-lg shadow-lg border-2 transition-all duration-200
        ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
        ${config.borderColor}
        hover:shadow-xl
      `}
      onClick={handleClick}
      onDoubleClick={() => setShowDetails(!showDetails)}
      data-testid={`agent-node-${id}`}
      aria-label={`${(data?.['agentType'] as string) || 'Agent'} node: ${(data?.['label'] as string) || id}`}
      role='button'
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* Input Handles - Multiple connection points */}
      <Handle
        type='target'
        position={Position.Left}
        id='input-main'
        style={{
          top: '30%',
          background: '#6366f1',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
        aria-label='Main input connection'
      />
      <Handle
        type='target'
        position={Position.Top}
        id='input-control'
        style={{
          left: '30%',
          background: '#8b5cf6',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
        aria-label='Control input connection'
      />

      {/* Header */}
      <div
        className={`${config.color} text-white p-3 rounded-t-lg flex items-center justify-between`}
      >
        <div className='flex items-center space-x-2'>
          <span
            className='text-xl'
            role='img'
            aria-label={`${(data?.['agentType'] as string) || 'Agent'} agent`}
          >
            {config.icon}
          </span>
          <div>
            <h3 className='font-semibold text-sm truncate max-w-[150px]'>
              {String(data?.['label'] ?? 'Agent Node')}
            </h3>
            <p className='text-xs opacity-90'>{config.description}</p>
          </div>
        </div>
        <div
          className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-300' : 'bg-gray-300'} animate-pulse`}
          aria-label={`Agent status: ${isActive ? 'active' : 'inactive'}`}
        />
      </div>

      {/* Metrics Section */}
      <div className='p-3 space-y-2'>
        <div className='grid grid-cols-2 gap-2 text-xs'>
          <div className='bg-gray-50 p-2 rounded'>
            <div className='text-gray-600'>Messages</div>
            <div className='font-semibold text-blue-600'>
              {metrics.messagesProcessed}
            </div>
          </div>
          <div className='bg-gray-50 p-2 rounded'>
            <div className='text-gray-600'>Errors</div>
            <div
              className={`font-semibold ${metrics.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {metrics.errorCount}
            </div>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className='mt-2'>
          <div className='flex justify-between text-xs text-gray-600 mb-1'>
            <span>Performance</span>
            <span>{Math.round(metrics.averageResponseTime)}ms</span>
          </div>
          <div className='w-full bg-gray-200 rounded-full h-2'>
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                metrics.averageResponseTime < 100
                  ? 'bg-green-500'
                  : metrics.averageResponseTime < 500
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{
                width: `${Math.min(100, (1000 - metrics.averageResponseTime) / 10)}%`,
              }}
            />
          </div>
        </div>

        {/* Agent ID for debugging */}
        <div className='text-xs text-gray-400 font-mono truncate' title={id}>
          ID: {id.substring(0, 8)}...
        </div>
      </div>

      {/* Output Handles - Multiple connection points */}
      <Handle
        type='source'
        position={Position.Right}
        id='output-main'
        style={{
          top: '30%',
          background: '#10b981',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
        aria-label='Main output connection'
      />
      <Handle
        type='source'
        position={Position.Bottom}
        id='output-data'
        style={{
          left: '70%',
          background: '#f59e0b',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
        aria-label='Data output connection'
      />
      <Handle
        type='source'
        position={Position.Right}
        id='output-events'
        style={{
          top: '70%',
          background: '#ef4444',
          width: 12,
          height: 12,
          border: '2px solid white',
        }}
        aria-label='Events output connection'
      />
    </div>
  );
});
