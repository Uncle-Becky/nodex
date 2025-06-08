import { Handle, type NodeProps, Position } from '@xyflow/react';
import React, { useCallback, useState } from 'react';
import { apiKeyManager } from '../services/ApiKeyManager';
import { executionEngine } from '../services/ExecutionEngine';
import type { LLMProvider } from '../types/llm';
import type { LLMChatNodeConfig } from '../types/nodes';
import { Logger } from '../utils/logger';

interface LLMChatNodeData {
  label: string;
  provider: LLMProvider;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  conversationHistory?: boolean;
  streaming?: boolean;
}

export const LLMChatNode: React.FC<NodeProps> = ({ id, data }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastOutput, setLastOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<{
    tokensUsed: number;
    cost: number;
    duration: number;
  } | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{
      role: string;
      content: string;
      timestamp: number;
    }>
  >([]);
  const [inputValue, setInputValue] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState<LLMChatNodeData>(() => {
    const nodeData = data as unknown as LLMChatNodeData;
    return {
      label: nodeData?.label ?? 'LLM Chat Node',
      provider: nodeData?.provider ?? 'openai',
      model: nodeData?.model,
      systemPrompt: nodeData?.systemPrompt ?? 'You are a helpful AI assistant.',
      temperature: nodeData?.temperature ?? 0.7,
      maxTokens: nodeData?.maxTokens ?? 2048,
      conversationHistory: nodeData?.conversationHistory ?? true,
      streaming: nodeData?.streaming ?? false,
    };
  });

  const hasValidApiKey = config.provider
    ? apiKeyManager.hasValidKey(config.provider)
    : false;

  const executeNode = useCallback(
    async (input: string) => {
      if (!hasValidApiKey) {
        setError(`No valid API key for ${config.provider}`);
        return;
      }

      setIsExecuting(true);
      setError(null);

      try {
        Logger.execution('llm_chat', 'Starting execution with config:', config);
        Logger.execution('llm_chat', 'Has valid API key:', hasValidApiKey);

        const nodeConfig: LLMChatNodeConfig = {
          id,
          type: 'llm_chat',
          label: config.label,
          position: { x: 0, y: 0 },
          enabled: true,
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            version: '1.0.0',
            tags: [],
          },
          config: {
            provider: config.provider,
            model: config.model,
            systemPrompt: config.systemPrompt,
            temperature: config.temperature ?? 0.7,
            maxTokens: config.maxTokens ?? 2048,
            conversationHistory: config.conversationHistory ?? true,
            streaming: config.streaming ?? false,
          },
        };

        Logger.execution('llm_chat', 'Calling executionEngine.executeNode');
        const execution = await executionEngine.executeNode(nodeConfig, input, {
          sessionId: `session-${id}`,
          memory: { conversationHistory },
          variables: {},
        });
        Logger.execution('llm_chat', 'Execution result:', execution);

        if (execution.status === 'completed') {
          const output = execution.output as string;
          setLastOutput(output);
          setMetrics({
            tokensUsed: execution.metrics.tokensUsed ?? 0,
            cost: execution.metrics.cost ?? 0,
            duration: execution.metrics.duration,
          });

          // Update conversation history
          if (config.conversationHistory) {
            setConversationHistory(prev =>
              [
                ...prev,
                { role: 'user', content: input, timestamp: Date.now() },
                { role: 'assistant', content: output, timestamp: Date.now() },
              ].slice(-20)
            ); // Keep last 20 messages
          }
        } else {
          setError(execution.error ?? 'Execution failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsExecuting(false);
      }
    },
    [id, config, hasValidApiKey, conversationHistory]
  );

  const handleExecute = () => {
    if (inputValue.trim()) {
      executeNode(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    }
  };

  const clearHistory = () => {
    setConversationHistory([]);
    setLastOutput('');
    setError(null);
    setMetrics(null);
  };

  const getProviderColor = (provider: LLMProvider): string => {
    const colors = {
      openai: 'bg-green-100 border-green-300',
      claude: 'bg-orange-100 border-orange-300',
      gemini: 'bg-blue-100 border-blue-300',
      perplexity: 'bg-purple-100 border-purple-300',
    };
    return colors[provider] ?? 'bg-gray-100 border-gray-300';
  };

  const getStatusColor = (): string => {
    if (isExecuting) return 'bg-yellow-100 border-yellow-300';
    if (error) return 'bg-red-100 border-red-300';
    if (lastOutput) return 'bg-green-100 border-green-300';
    return 'bg-gray-100 border-gray-300';
  };

  return (
    <div
      className={`p-4 rounded-lg shadow-xl w-96 border-2 ${getProviderColor(config.provider)}`}
    >
      {/* Header */}
      <div className='flex justify-between items-center mb-3'>
        <div className='flex items-center gap-2'>
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <strong className='text-sm font-semibold'>{config.label}</strong>
          <span className='text-xs px-2 py-1 bg-white rounded-full border'>
            {config.provider}
          </span>
        </div>
        <div className='flex gap-1'>
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className='text-xs px-2 py-1 bg-white hover:bg-gray-50 rounded border'
            title='Configure'
          >
            ⚙️
          </button>
          <button
            onClick={clearHistory}
            className='text-xs px-2 py-1 bg-white hover:bg-gray-50 rounded border'
            title='Clear History'
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      {isConfigOpen && (
        <div className='mb-3 p-3 bg-white rounded border space-y-2'>
          <div>
            <label className='text-xs font-medium'>Provider:</label>
            <select
              value={config.provider}
              onChange={e =>
                setConfig(prev => ({
                  ...prev,
                  provider: e.target.value as LLMProvider,
                }))
              }
              className='w-full text-xs p-1 border rounded'
            >
              <option value='openai'>OpenAI</option>
              <option value='claude'>Claude</option>
              <option value='gemini'>Gemini</option>
              <option value='perplexity'>Perplexity</option>
            </select>
          </div>
          <div>
            <label className='text-xs font-medium'>System Prompt:</label>
            <textarea
              value={config.systemPrompt ?? ''}
              onChange={e =>
                setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))
              }
              className='w-full text-xs p-1 border rounded h-16 resize-none'
              placeholder='Enter system prompt...'
            />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <label className='text-xs font-medium'>Temperature:</label>
              <input
                type='number'
                min='0'
                max='2'
                step='0.1'
                value={config.temperature ?? 0.7}
                onChange={e =>
                  setConfig(prev => ({
                    ...prev,
                    temperature: parseFloat(e.target.value),
                  }))
                }
                className='w-full text-xs p-1 border rounded'
              />
            </div>
            <div>
              <label className='text-xs font-medium'>Max Tokens:</label>
              <input
                type='number'
                min='1'
                max='8192'
                value={config.maxTokens ?? 2048}
                onChange={e =>
                  setConfig(prev => ({
                    ...prev,
                    maxTokens: parseInt(e.target.value),
                  }))
                }
                className='w-full text-xs p-1 border rounded'
              />
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id={`history-${id}`}
              checked={config.conversationHistory ?? true}
              onChange={e =>
                setConfig(prev => ({
                  ...prev,
                  conversationHistory: e.target.checked,
                }))
              }
              className='text-xs'
            />
            <label htmlFor={`history-${id}`} className='text-xs'>
              Keep conversation history
            </label>
          </div>
        </div>
      )}

      {/* API Key Status */}
      {!hasValidApiKey && (
        <div className='mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700'>
          ⚠️ No valid API key for {config.provider}. Please configure in
          settings.
        </div>
      )}

      {/* Input Area */}
      <div className='mb-3'>
        <div className='flex gap-2'>
          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder='Enter your message...'
            className='flex-1 text-xs p-2 border rounded resize-none h-20'
            disabled={isExecuting || !hasValidApiKey}
          />
          <button
            onClick={handleExecute}
            disabled={isExecuting || !inputValue.trim() || !hasValidApiKey}
            className='px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed'
          >
            {isExecuting ? '⏳' : '▶️'}
          </button>
        </div>
      </div>

      {/* Output Area */}
      {lastOutput && (
        <div className='mb-3 p-2 bg-white rounded border'>
          <div className='text-xs font-medium mb-1'>Response:</div>
          <div className='text-xs text-gray-700 max-h-32 overflow-y-auto whitespace-pre-wrap'>
            {lastOutput}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className='mb-3 p-2 bg-red-50 border border-red-200 rounded'>
          <div className='text-xs font-medium text-red-700 mb-1'>Error:</div>
          <div className='text-xs text-red-600'>{error}</div>
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className='mb-3 p-2 bg-gray-50 rounded border'>
          <div className='text-xs font-medium mb-1'>Metrics:</div>
          <div className='text-xs text-gray-600 space-y-1'>
            <div>Tokens: {metrics.tokensUsed}</div>
            <div>Cost: ${metrics.cost.toFixed(4)}</div>
            <div>Duration: {metrics.duration}ms</div>
          </div>
        </div>
      )}

      {/* Conversation History */}
      {config.conversationHistory && conversationHistory.length > 0 && (
        <div className='mb-3'>
          <div className='text-xs font-medium mb-1'>
            History ({conversationHistory.length} messages):
          </div>
          <div className='max-h-32 overflow-y-auto space-y-1'>
            {conversationHistory.slice(-6).map((msg, idx) => (
              <div
                key={idx}
                className={`text-xs p-1 rounded ${
                  msg.role === 'user'
                    ? 'bg-blue-50 border-l-2 border-blue-300'
                    : 'bg-green-50 border-l-2 border-green-300'
                }`}
              >
                <div className='font-medium'>{msg.role}:</div>
                <div className='text-gray-700 truncate'>{msg.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Handles */}
      <Handle type='target' position={Position.Left} id='input' />
      <Handle type='source' position={Position.Right} id='output' />
    </div>
  );
};
