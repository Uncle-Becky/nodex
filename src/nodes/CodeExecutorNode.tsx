import { Handle, type NodeProps, Position } from '@xyflow/react';
import React, { useCallback, useState } from 'react';
import { executionEngine } from '../services/ExecutionEngine';
import type { CodeExecutorNodeConfig } from '../types/nodes';

interface CodeExecutorNodeData {
  label: string;
  language: 'javascript' | 'python' | 'typescript' | 'sql';
  code: string;
  timeout?: number;
  allowNetworkAccess?: boolean;
  allowFileAccess?: boolean;
}

export const CodeExecutorNode: React.FC<NodeProps> = ({ id, data }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastOutput, setLastOutput] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<{
    duration: number;
    memoryUsage: number;
  } | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState<CodeExecutorNodeData>(() => {
    const nodeData = data as unknown as CodeExecutorNodeData;
    return {
      label: nodeData?.label || 'Code Executor',
      language: nodeData?.language || 'javascript',
      code:
        nodeData?.code || '// Process the input\nreturn input.toUpperCase();',
      timeout: nodeData?.timeout ?? 5000,
      allowNetworkAccess: nodeData?.allowNetworkAccess ?? false,
      allowFileAccess: nodeData?.allowFileAccess ?? false,
    };
  });

  const executeCode = useCallback(
    async (input: unknown) => {
      setIsExecuting(true);
      setError(null);

      try {
        const nodeConfig: CodeExecutorNodeConfig = {
          id: id as string,
          type: 'code_executor',
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
            language: config.language,
            code: config.code,
            timeout: config.timeout ?? 5000,
            allowNetworkAccess: config.allowNetworkAccess ?? false,
            allowFileAccess: config.allowFileAccess ?? false,
            environment: {},
            dependencies: [],
          },
        };

        const execution = await executionEngine.executeNode(nodeConfig, input, {
          sessionId: `session-${id}`,
          variables: { input },
        });

        if (execution.status === 'completed') {
          setLastOutput(execution.output);
          setMetrics({
            duration: execution.metrics.duration,
            memoryUsage: execution.metrics.memoryUsage,
          });
        } else {
          setError(execution.error ?? 'Execution failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsExecuting(false);
      }
    },
    [id, config]
  );

  const handleExecute = () => {
    let input: unknown = inputValue;

    // Try to parse as JSON if possible
    if (inputValue.trim()) {
      try {
        input = JSON.parse(inputValue);
      } catch {
        // Keep as string if not valid JSON
        input = inputValue;
      }
    }

    executeCode(input);
  };

  const getLanguageColor = (language: string): string => {
    const colors = {
      javascript: 'bg-yellow-100 border-yellow-300',
      typescript: 'bg-blue-100 border-blue-300',
      python: 'bg-green-100 border-green-300',
      sql: 'bg-purple-100 border-purple-300',
    };
    return (
      colors[language as keyof typeof colors] || 'bg-gray-100 border-gray-300'
    );
  };

  const getStatusColor = (): string => {
    if (isExecuting) return 'bg-yellow-100 border-yellow-300';
    if (error) return 'bg-red-100 border-red-300';
    if (lastOutput !== null) return 'bg-green-100 border-green-300';
    return 'bg-gray-100 border-gray-300';
  };

  const formatOutput = (output: unknown): string => {
    if (output === null || output === undefined) return 'null';
    if (typeof output === 'string') return output;
    return JSON.stringify(output, null, 2);
  };

  return (
    <div
      className={`p-4 rounded-lg shadow-xl w-96 border-2 ${getLanguageColor(config.language)}`}
    >
      {/* Header */}
      <div className='flex justify-between items-center mb-3'>
        <div className='flex items-center gap-2'>
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <strong className='text-sm font-semibold'>{config.label}</strong>
          <span className='text-xs px-2 py-1 bg-white rounded-full border'>
            {config.language}
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
            onClick={() => {
              setLastOutput(null);
              setError(null);
              setMetrics(null);
            }}
            className='text-xs px-2 py-1 bg-white hover:bg-gray-50 rounded border'
            title='Clear Output'
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      {isConfigOpen && (
        <div className='mb-3 p-3 bg-white rounded border space-y-2'>
          <div>
            <label className='text-xs font-medium'>Language:</label>
            <select
              value={config.language}
              onChange={e =>
                setConfig(prev => ({
                  ...prev,
                  language: e.target.value as CodeExecutorNodeData['language'],
                }))
              }
              className='w-full text-xs p-1 border rounded'
            >
              <option value='javascript'>JavaScript</option>
              <option value='typescript'>TypeScript</option>
              <option value='python'>Python</option>
              <option value='sql'>SQL</option>
            </select>
          </div>
          <div>
            <label className='text-xs font-medium'>Code:</label>
            <textarea
              value={config.code}
              onChange={e =>
                setConfig(prev => ({ ...prev, code: e.target.value }))
              }
              className='w-full text-xs p-2 border rounded h-32 resize-none font-mono'
              placeholder='Enter your code here...'
            />
          </div>
          <div>
            <label className='text-xs font-medium'>Timeout (ms):</label>
            <input
              type='number'
              min='1000'
              max='30000'
              value={config.timeout ?? 5000}
              onChange={e =>
                setConfig(prev => ({
                  ...prev,
                  timeout: parseInt(e.target.value),
                }))
              }
              className='w-full text-xs p-1 border rounded'
            />
          </div>
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <input
                type='checkbox'
                id={`network-${id}`}
                checked={config.allowNetworkAccess ?? false}
                onChange={e =>
                  setConfig(prev => ({
                    ...prev,
                    allowNetworkAccess: e.target.checked,
                  }))
                }
                className='text-xs'
              />
              <label htmlFor={`network-${id}`} className='text-xs'>
                Allow network access
              </label>
            </div>
            <div className='flex items-center gap-2'>
              <input
                type='checkbox'
                id={`file-${id}`}
                checked={config.allowFileAccess ?? false}
                onChange={e =>
                  setConfig(prev => ({
                    ...prev,
                    allowFileAccess: e.target.checked,
                  }))
                }
                className='text-xs'
              />
              <label htmlFor={`file-${id}`} className='text-xs'>
                Allow file access
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Code Preview */}
      {config.code && !isConfigOpen && (
        <div className='mb-3 p-2 bg-gray-50 rounded border'>
          <div className='text-xs font-medium mb-1'>Code Preview:</div>
          <div className='text-xs font-mono text-gray-700 max-h-20 overflow-y-auto whitespace-pre'>
            {config.code.slice(0, 200)}
            {config.code.length > 200 ? '...' : ''}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className='mb-3'>
        <label className='text-xs font-medium mb-1 block'>Input Data:</label>
        <div className='flex gap-2'>
          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder='Enter input data (JSON or text)...'
            className='flex-1 text-xs p-2 border rounded resize-none h-16 font-mono'
            disabled={isExecuting}
          />
          <button
            onClick={handleExecute}
            disabled={isExecuting || !config.code.trim()}
            className='px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed'
          >
            {isExecuting ? '⏳' : '▶️'}
          </button>
        </div>
      </div>

      {/* Output Area */}
      {lastOutput !== null && (
        <div className='mb-3 p-2 bg-white rounded border'>
          <div className='text-xs font-medium mb-1'>Output:</div>
          <div className='text-xs text-gray-700 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono'>
            {formatOutput(lastOutput)}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className='mb-3 p-2 bg-red-50 border border-red-200 rounded'>
          <div className='text-xs font-medium text-red-700 mb-1'>Error:</div>
          <div className='text-xs text-red-600 font-mono'>{error}</div>
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className='mb-3 p-2 bg-gray-50 rounded border'>
          <div className='text-xs font-medium mb-1'>Execution Metrics:</div>
          <div className='text-xs text-gray-600 space-y-1'>
            <div>Duration: {metrics.duration}ms</div>
            <div>Memory: {metrics.memoryUsage}MB</div>
          </div>
        </div>
      )}

      {/* Handles */}
      <Handle type='target' position={Position.Left} id='input' />
      <Handle type='source' position={Position.Right} id='output' />
    </div>
  );
};
