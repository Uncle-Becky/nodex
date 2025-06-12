import { Handle, type NodeProps, Position } from '@xyflow/react';
import React, { useEffect, useState } from 'react';
import type { AgentType } from '../managers/AgentManager';
import { eventBus } from '../utils/eventBus';

interface SimpleMetrics {
  messagesProcessed: number;
  averageResponseTime: number;
  errorCount: number;
  uptime: number;
  lastActivity: number;
}

export const AdvancedAgentNode: React.FC<NodeProps> = ({
  id,
  data,
  selected,
}) => {
  const [metrics, setMetrics] = useState<SimpleMetrics>({
    messagesProcessed: 0,
    averageResponseTime: 0,
    errorCount: 0,
    uptime: Date.now(),
    lastActivity: Date.now(),
  });
  const [isActive, setIsActive] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(0.5);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe(
      ['AGENT_MESSAGE', 'AGENT_STATE_UPDATE', 'AGENT_ERROR'],
      event => {
        if (event.source === id || event.target === id) {
          setIsActive(true);
          setPulseIntensity(Math.random() * 0.5 + 0.5);

          // Update metrics based on event type
          setMetrics(prev => ({
            ...prev,
            messagesProcessed: prev.messagesProcessed + 1,
            lastActivity: Date.now(),
            errorCount:
              event.type === 'AGENT_ERROR'
                ? prev.errorCount + 1
                : prev.errorCount,
          }));

          // Reset active state after animation
          setTimeout(() => setIsActive(false), 1000);
        }
      }
    );

    return unsubscribe;
  }, [id]);

  const getAgentTypeConfig = (type: AgentType) => {
    switch (type) {
      case 'reasoning':
        return {
          icon: '🧠',
          gradient: 'from-purple-500 via-violet-600 to-purple-700',
          glow: 'shadow-purple-500/50',
          border: 'border-purple-400/30',
          accent: 'text-purple-300',
          bg: 'bg-purple-900/20',
        };
      case 'swarm':
        return {
          icon: '🐝',
          gradient: 'from-amber-500 via-orange-600 to-yellow-700',
          glow: 'shadow-amber-500/50',
          border: 'border-amber-400/30',
          accent: 'text-amber-300',
          bg: 'bg-amber-900/20',
        };
      case 'canvas':
        return {
          icon: '🎯',
          gradient: 'from-emerald-500 via-green-600 to-teal-700',
          glow: 'shadow-emerald-500/50',
          border: 'border-emerald-400/30',
          accent: 'text-emerald-300',
          bg: 'bg-emerald-900/20',
        };
      case 'worker':
        return {
          icon: '⚡',
          gradient: 'from-red-500 via-rose-600 to-pink-700',
          glow: 'shadow-red-500/50',
          border: 'border-red-400/30',
          accent: 'text-red-300',
          bg: 'bg-red-900/20',
        };
      default:
        return {
          icon: '🤖',
          gradient: 'from-blue-500 via-indigo-600 to-purple-700',
          glow: 'shadow-blue-500/50',
          border: 'border-blue-400/30',
          accent: 'text-blue-300',
          bg: 'bg-blue-900/20',
        };
    }
  };

  const config = getAgentTypeConfig(data['agentType'] as AgentType);
  const uptime = Math.floor((Date.now() - metrics.uptime) / 1000);

  const agentStatusFromData = data?.status as string | undefined;

  // Determine status display based on agentStatusFromData and isActive
  let statusText: string;
  let statusColorClass: string;
  let statusTextColorClass: string;
  let shadowColorClass: string;

  if (agentStatusFromData) {
    statusText = agentStatusFromData.toUpperCase();
    switch (agentStatusFromData) {
      case 'error':
        statusColorClass = 'bg-red-500 animate-ping';
        statusTextColorClass = 'text-red-400';
        shadowColorClass = 'shadow-red-500/50';
        break;
      case 'reasoning':
      case 'processing_command':
        statusColorClass = 'bg-yellow-400 animate-ping';
        statusTextColorClass = 'text-yellow-300';
        shadowColorClass = 'shadow-yellow-500/50';
        break;
      case 'active': // Explicit 'active' status from agent
      case 'idle': // Explicit 'idle' status from agent
        statusColorClass = isActive ? 'bg-green-400 animate-ping' : 'bg-green-500';
        statusTextColorClass = 'text-green-300';
        shadowColorClass = 'shadow-green-500/50';
        break;
      default: // Other specific statuses from agent
        statusColorClass = isActive ? 'bg-blue-400 animate-ping' : 'bg-blue-500'; // Default to blue if unknown status
        statusTextColorClass = 'text-blue-300';
        shadowColorClass = 'shadow-blue-500/50';
        break;
    }
  } else {
    // Fallback to old logic if no specific agentStatusFromData
    statusText = isActive ? 'ACTIVE' : 'IDLE';
    statusColorClass = isActive ? 'bg-green-400 animate-ping' : 'bg-green-500';
    statusTextColorClass = 'text-white/70'; // Default text color for old logic
    shadowColorClass = 'shadow-green-500/50';
  }

  return (
    <div
      className={`
        relative group
        w-72 min-h-48
        card-glass
        ${config.border}
        ${config.glow}
        ${selected ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-transparent' : ''}
        ${isActive ? 'animate-neural-pulse' : 'animate-float'}
        transition-all duration-500 ease-neural
        hover:scale-105 hover:shadow-2xl
        cursor-pointer
      `}
      style={{
        animationDelay: `${Math.random() * 2}s`,
        filter: isActive
          ? `brightness(${1 + pulseIntensity * 0.3})`
          : 'brightness(1)',
      }}
    >
      {/* Animated Background Gradient */}
      <div
        className={`
          absolute inset-0 rounded-xl opacity-20
          bg-gradient-to-br ${config.gradient}
          animate-gradient-shift
        `}
      />

      {/* Shimmer Effect */}
      <div className='absolute inset-0 rounded-xl overflow-hidden'>
        <div
          className={`
            absolute inset-0 -translate-x-full
            bg-gradient-to-r from-transparent via-white/20 to-transparent
            ${isActive ? 'animate-shimmer' : ''}
          `}
        />
      </div>

      {/* Content */}
      <div className='relative z-10 p-6'>
        {/* Header */}
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div
              className={`
                text-2xl
                ${isActive ? 'animate-bounce' : 'animate-pulse-slow'}
              `}
            >
              {config.icon}
            </div>
            <div>
              <h3 className='font-bold text-white text-sm leading-tight'>
                {data['label'] as string}
              </h3>
              <p className={`text-xs ${config.accent} font-mono`}>
                {(data['agentType'] as string).toUpperCase()}
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className='flex items-center gap-2'>
            <div
              className={`
                w-3 h-3 rounded-full
                ${statusColorClass}
                shadow-lg ${shadowColorClass}
              `}
            />
            <span className={`text-xs ${statusTextColorClass} font-mono`}>
              {statusText}
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className='grid grid-cols-2 gap-3 mb-4'>
          <div
            className={`${config.bg} rounded-lg p-3 border ${config.border}`}
          >
            <div className='text-xs text-white/60 mb-1'>Messages</div>
            <div className={`text-lg font-bold ${config.accent} font-mono`}>
              {metrics.messagesProcessed}
            </div>
          </div>

          <div
            className={`${config.bg} rounded-lg p-3 border ${config.border}`}
          >
            <div className='text-xs text-white/60 mb-1'>Uptime</div>
            <div className={`text-lg font-bold ${config.accent} font-mono`}>
              {uptime}s
            </div>
          </div>

          <div
            className={`${config.bg} rounded-lg p-3 border ${config.border}`}
          >
            <div className='text-xs text-white/60 mb-1'>Errors</div>
            <div
              className={`text-lg font-bold ${metrics.errorCount > 0 ? 'text-red-400' : config.accent} font-mono`}
            >
              {metrics.errorCount}
            </div>
          </div>

          <div
            className={`${config.bg} rounded-lg p-3 border ${config.border}`}
          >
            <div className='text-xs text-white/60 mb-1'>Response</div>
            <div className={`text-lg font-bold ${config.accent} font-mono`}>
              {metrics.averageResponseTime}ms
            </div>
          </div>
        </div>

        {/* Activity Bar */}
        <div className='mb-4'>
          <div className='flex justify-between items-center mb-2'>
            <span className='text-xs text-white/60'>Activity</span>
            <span className='text-xs text-white/60 font-mono'>
              {new Date(metrics.lastActivity).toLocaleTimeString()}
            </span>
          </div>
          <div className='w-full bg-white/10 rounded-full h-2 overflow-hidden'>
            <div
              className={`
                h-full bg-gradient-to-r ${config.gradient}
                transition-all duration-1000 ease-out
                ${isActive ? 'animate-pulse' : ''}
              `}
              style={{
                width: `${Math.min(100, (metrics.messagesProcessed / 10) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Agent ID */}
        <div className='text-xs text-white/40 font-mono truncate'>
          ID: {data['agentId'] as string}
        </div>
      </div>

      {/* Connection Handles */}
      <Handle
        type='target'
        position={Position.Left}
        className={`
          w-4 h-4 border-2 border-white/50 bg-gradient-to-r ${config.gradient}
          hover:scale-125 transition-transform duration-200
        `}
      />
      <Handle
        type='source'
        position={Position.Right}
        className={`
          w-4 h-4 border-2 border-white/50 bg-gradient-to-r ${config.gradient}
          hover:scale-125 transition-transform duration-200
        `}
      />

      {/* Hover Glow Effect */}
      <div
        className={`
          absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
          bg-gradient-to-br ${config.gradient}
          blur-xl -z-10
          transition-opacity duration-500
        `}
      />
    </div>
  );
};
