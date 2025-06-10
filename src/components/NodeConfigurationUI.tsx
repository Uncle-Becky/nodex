import React, { useCallback, useEffect, useState } from 'react';
import { ComponentStateManager } from '../managers/ComponentStateManager';
import { useGraphStore } from '../store/useGraphStore';
import type { NodeConfigUIState } from '../types/components';
import { createEvent, eventBus } from '../utils/eventBus';

interface NodeConfigurationUIProps {
  nodeId?: string;
}

export const NodeConfigurationUI: React.FC<NodeConfigurationUIProps> = ({
  nodeId,
}) => {
  const { nodes, setNodes } = useGraphStore();
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(
    nodeId
  );
  const [nodeConfig, setNodeConfig] = useState<Record<string, unknown>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const stateManager = ComponentStateManager.getInstance();

  const loadNodeConfig = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
 setNodeConfig(node.data || {});
 stateManager.updateComponentState('nodeConfigUI', {
 selectedNodeId: nodeId,
 currentConfig: node.data || {},
 });
    }
  }, [nodes, stateManager]);

  useEffect(() => {
    // Load initial node if provided
    if (nodeId) {
      setSelectedNodeId(nodeId);
      loadNodeConfig(nodeId);
    }

    // Subscribe to node selection events
    const handleNodeSelection = (event: {
      type: string;
      payload: { nodeId: string };
    }) => {
      if (event.type === 'NODE_SELECT') {
        setSelectedNodeId(event.payload.nodeId);
        loadNodeConfig(event.payload.nodeId);
      }
    };

    const unsubscribe = eventBus.subscribe(
      ['NODE_SELECT'],
      handleNodeSelection
    );

    return unsubscribe;
  }, [loadNodeConfig, nodeId, nodes]);

  // Subscribe to component state
  useEffect(() => {
    const unsubscribe = stateManager.subscribe(
      'nodeConfigUI',
      (state: NodeConfigUIState) => {
        if (state.selectedNodeId) {
          setSelectedNodeId(state.selectedNodeId);
          loadNodeConfig(state.selectedNodeId);
        }
      }
    );

    return unsubscribe;
  }, [loadNodeConfig, nodes, stateManager]);

  const handleConfigChange = (key: string, value: unknown) => {
    const newConfig = { ...nodeConfig, [key]: value };
    setNodeConfig(newConfig);

    // Validate config
    validateConfig(newConfig);

    // Update component state
    stateManager.updateComponentState('nodeConfigUI', {
      currentConfig: newConfig,
    });
  };

  const validateConfig = (config: Record<string, unknown>): boolean => {
    const errors: string[] = [];

    // Basic validation based on node type
    const node = nodes.find(n => n.id === selectedNodeId);
    if (node) {
      switch (node.type) {
        case 'agent':
        case 'advanced':
          if (!config['label']) errors.push('Label is required');
          if (!config['agentType']) errors.push('Agent type is required');
          break;
        case 'llm_chat':
          if (!config['model']) errors.push('Model is required');
          if (
            typeof config['temperature'] === 'number' &&
            (config['temperature'] < 0 || config['temperature'] > 1)
          ) {
            errors.push('Temperature must be between 0 and 1');
          }
          break;
        case 'code_executor':
          if (
            !config['code'] ||
            (typeof config['code'] === 'string' && config['code'].trim() === '')
          ) {
            errors.push('Code is required');
          }
          if (!config['environment']) errors.push('Environment is required');
          break;
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const applyConfiguration = () => {
    // Validate before applying
    if (!validateConfig(nodeConfig)) {
      return;
    }

    // Update node
    if (selectedNodeId) {
      const updatedNodes = nodes.map(node => {
        if (node.id === selectedNodeId) {
          return {
            ...node,
            data: { ...nodeConfig },
          };
        }
        return node;
      });

      setNodes(updatedNodes);

      // Publish config update event
      eventBus.publish(
        createEvent('NODE_CONFIG_UPDATE', 'node-config-ui', {
          nodeId: selectedNodeId,
          config: nodeConfig,
        })
      );
    }
  };

  if (!selectedNodeId) {
    return (
      <div className='card p-4 text-center text-gray-400'>
        <p>No node selected</p>
        <p className='text-sm mt-2'>
          Select a node to configure its properties
        </p>
      </div>
    );
  }

  const node = nodes.find(n => n.id === selectedNodeId);
  if (!node) {
    return (
      <div className='card p-4 text-center text-error'>
        <p>Node not found</p>
        <p className='text-sm mt-2'>The selected node no longer exists</p>
      </div>
    );
  }

  // Helper functions for type-safe property access
  const getStringValue = (key: string): string => {
    const value = nodeConfig[key];
    return typeof value === 'string' ? value : '';
  };

  const getNumberValue = (key: string, defaultValue: number): number => {
    const value = nodeConfig[key];
    return typeof value === 'number' ? value : defaultValue;
  };

  const getArrayValue = (key: string): string[] => {
    const value = nodeConfig[key];
    return Array.isArray(value) ? value : [];
  };

  // Render different config options based on node type
  const renderNodeConfig = () => {
    switch (node.type) {
      case 'agent':
      case 'advanced':
        return (
          <div className='space-y-6'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Label
              </label>
              <input
                type='text'
                className='w-full px-4 py-3 glass border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200'
                placeholder='Enter agent label'
                value={getStringValue('label')}
                onChange={e => handleConfigChange('label', e.target.value)}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Agent Type
              </label>
              <select
                className='w-full px-4 py-3 glass border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200'
                value={getStringValue('agentType')}
                onChange={e => handleConfigChange('agentType', e.target.value)}
              >
                <option value=''>Select Agent Type</option>
                <option value='reasoning'>🧠 Reasoning Agent</option>
                <option value='swarm'>🐝 Swarm Agent</option>
                <option value='canvas'>🎨 Canvas Agent</option>
              </select>
            </div>
          </div>
        );

      case 'llm_chat':
        return (
          <div className='space-y-6'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Model
              </label>
              <select
                className='w-full px-4 py-3 glass border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200'
                value={getStringValue('model')}
                onChange={e => handleConfigChange('model', e.target.value)}
              >
                <option value=''>Select Model</option>
                <option value='gpt-4'>🤖 GPT-4</option>
                <option value='gpt-3.5-turbo'>⚡ GPT-3.5 Turbo</option>
                <option value='claude-3'>🎭 Claude 3</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Temperature: {getNumberValue('temperature', 0.7)}
              </label>
              <input
                type='range'
                min='0'
                max='1'
                step='0.1'
                className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider'
                value={getNumberValue('temperature', 0.7)}
                onChange={e =>
                  handleConfigChange('temperature', parseFloat(e.target.value))
                }
              />
              <div className='flex justify-between text-xs text-gray-500 mt-1'>
                <span>Creative</span>
                <span>Balanced</span>
                <span>Focused</span>
              </div>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Context
              </label>
              <textarea
                className='w-full px-4 py-3 glass border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 font-mono text-sm'
                rows={4}
                placeholder='Enter system context...'
                value={getStringValue('context')}
                onChange={e =>
                  handleConfigChange('context', e.target.value.split('\n'))
                }
              />
            </div>
          </div>
        );

      case 'code_executor':
        return (
          <div className='space-y-6'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Environment
              </label>
              <select
                className='w-full px-4 py-3 glass border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200'
                value={getStringValue('environment')}
                onChange={e =>
                  handleConfigChange('environment', e.target.value)
                }
              >
                <option value=''>Select Environment</option>
                <option value='node'>🟢 Node.js</option>
                <option value='python'>🐍 Python</option>
                <option value='shell'>💻 Shell</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Code
              </label>
              <textarea
                className='w-full px-4 py-3 glass border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 font-mono text-sm bg-gray-50'
                rows={10}
                placeholder='Enter your code here...'
                value={getStringValue('code')}
                onChange={e => handleConfigChange('code', e.target.value)}
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Dependencies
              </label>
              <input
                type='text'
                className='w-full px-4 py-3 glass border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200'
                placeholder='e.g., lodash, axios, react'
                value={getArrayValue('dependencies').join(', ')}
                onChange={e =>
                  handleConfigChange(
                    'dependencies',
                    e.target.value.split(',').map(d => d.trim())
                  )
                }
              />
            </div>
          </div>
        );

      default:
        return <div>Unsupported node type: {node.type}</div>;
    }
  };

  return (
    <div className='p-4 border rounded shadow-sm'>
      <h2 className='text-xl font-bold mb-4'>
        Configure Node: {String(node.data?.['label'] ?? node.id)}
      </h2>

      {validationErrors.length > 0 && (
        <div className='mb-4 p-2 bg-red-100 border border-red-400 rounded'>
          <h3 className='font-medium text-red-800'>Validation Errors:</h3>
          <ul className='list-disc pl-5'>
            {validationErrors.map((error, i) => (
              <li key={i} className='text-red-800'>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {renderNodeConfig()}

      <div className='flex justify-end mt-4'>
        <button
          className='px-4 py-2 bg-gray-200 rounded mr-2'
          onClick={() => loadNodeConfig(selectedNodeId!)}
        >
          Reset
        </button>
        <button
          className='px-4 py-2 bg-blue-500 text-white rounded'
          onClick={applyConfiguration}
        >
          Apply
        </button>
      </div>
    </div>
  );
};
