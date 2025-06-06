import { Handle, type NodeProps, Position } from '@xyflow/react';
import React, { useEffect, useState } from 'react';
import type {
  AgentBeliefs,
  AgentStatus,
  AgentWorkerMessage,
  UiMessage,
} from '../types/messages';

export const AgentNode: React.FC<NodeProps> = ({ id, data }) => {
  const [status, setStatus] = useState<AgentStatus>({
    status: 'idle',
    lastActivity: Date.now(),
  });
  const [beliefs, setBeliefs] = useState<AgentBeliefs>({ nodeId: id });
  const [error, setError] = useState<string | null>(null);

  const workerRef = React.useRef<Worker | null>(null);

  useEffect(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/agentWorker.ts', import.meta.url),
        {
          type: 'module',
        }
      );

      workerRef.current.postMessage({
        type: 'INIT',
        payload: { nodeId: id },
      } satisfies UiMessage);

      workerRef.current.onmessage = (e: MessageEvent<AgentWorkerMessage>) => {
        const { type, payload } = e.data;

        switch (
          type // Fix: Add missing ':' here
        ) {
          case 'STATE_UPDATE': {
            const stateUpdatePayload =
              payload as AgentWorkerMessage['payload'] & {
                type: 'STATE_UPDATE';
                beliefs: AgentBeliefs;
                status: AgentStatus;
              };
            if (
              stateUpdatePayload &&
              stateUpdatePayload.type === 'STATE_UPDATE'
            ) {
              setBeliefs(stateUpdatePayload.beliefs);
              setStatus(stateUpdatePayload.status);
              setError(null);
            }
            break;
          }
          case 'QUERY_RESPONSE': {
            const queryResponsePayload =
              payload as AgentWorkerMessage['payload'] & {
                result: unknown;
                type: 'QUERY_RESPONSE';
              };
            if (
              queryResponsePayload &&
              queryResponsePayload.type === 'QUERY_RESPONSE'
            ) {
              setBeliefs(prev => ({
                ...prev,
                lastResponse: queryResponsePayload.result,
              }));
              setStatus({ status: 'idle', lastActivity: Date.now() });
            }
            break;
          }
          case 'ERROR': {
            const errorPayload = payload as AgentWorkerMessage['payload'] & {
              message: string;
              type: 'ERROR';
            };
            if (errorPayload && errorPayload.type === 'ERROR') {
              setError(errorPayload.message as string);
            }
            setStatus({ status: 'error', lastActivity: Date.now() });
            break;
          }
        }
      };
    }
    return () => {
      workerRef.current?.terminate();
    };
  }, [id]);

  const handleQuery = () => {
    const query = prompt('Enter your query:');
    if (query) {
      workerRef.current?.postMessage({
        type: 'QUERY',
        payload: { query },
      } satisfies UiMessage);
    }
  };

  const handleReset = () => {
    workerRef.current?.postMessage({
      type: 'RESET',
      payload: { nodeId: id },
    } satisfies UiMessage);
  };

  return (
    <div className='p-2 rounded-lg bg-white shadow-xl w-48'>
      <div className='flex justify-between items-center mb-2'>
        <strong>{data['label'] as string}</strong>
        <div className='flex gap-1'>
          <button
            onClick={handleQuery}
            className='text-xs px-1 py-0.5 bg-blue-100 hover:bg-blue-200 rounded'
          >
            Query
          </button>
          <button
            onClick={handleReset}
            className='text-xs px-1 py-0.5 bg-gray-100 hover:bg-gray-200 rounded'
          >
            Reset
          </button>
        </div>
      </div>

      <div
        className={`text-xs mb-1 ${status.status === 'error' ? 'text-red-500' : 'text-gray-500'}`}
      >
        Status: {status.status}
      </div>

      {error && <div className='text-xs text-red-500 mb-1'>Error: {error}</div>}

      <div className='text-xs space-y-1'>
        {Boolean(beliefs['lastQuery']) &&
          typeof beliefs['lastQuery'] === 'string' && (
            <div>Last Query: {beliefs['lastQuery']}</div>
          )}
        {Boolean(beliefs['lastResponse']) && (
          <div>Response: {JSON.stringify(beliefs['lastResponse'])}</div>
        )}
        {Boolean(beliefs['lastPercept']) && (
          <div>Last Percept: {JSON.stringify(beliefs['lastPercept'])}</div>
        )}
      </div>

      <Handle type='source' position={Position.Right} id='out' />
      <Handle type='target' position={Position.Left} id='in' />
    </div>
  );
};
