import {
  Background,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  type OnConnect,
  ReactFlow,
  type ReactFlowInstance,
} from '@xyflow/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ServiceInitializer } from './services/ServiceInitializer';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ApiKeySettings } from './components/ApiKeySettings';
import { NodePalette } from './components/NodePalette';
import { DataEdge } from './edges/DataEdge';
import { edgeAware } from './edges/edgeAware';
import { AgentManager, type AgentType } from './managers/AgentManager';
import { AdvancedAgentNode } from './nodes/AdvancedAgentNode';
import { AgentNode } from './nodes/agentNode';
import { CodeExecutorNode } from './nodes/CodeExecutorNode';
import { LLMChatNode } from './nodes/LLMChatNode';
import { useGraphStore } from './store/useGraphStore';
import type { EdgeData } from './types/agents';
import type { BusEvent } from './types/bus';
import { createEvent, eventBus } from './utils/eventBus';
import { saveFlow } from './utils/persist';

const nodeTypes = {
  agent: AgentNode,
  advanced: AdvancedAgentNode,
  llm_chat: LLMChatNode,
  code_executor: CodeExecutorNode,
};
const edgeTypes = {
  aware: edgeAware,
  dataEdge: DataEdge,
};

export default function App() {
  const fileInput = useRef<HTMLInputElement>(null);
  const { nodes, edges, setNodes, setEdges, updateNodes, updateEdges } =
    useGraphStore();
  const [agentManager] = useState(() => new AgentManager());
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [showNodePalette, setShowNodePalette] = useState(false);

  useEffect(() => {
    // Initialize services
    const initServices = async () => {
      try {
        const serviceInitializer = ServiceInitializer.getInstance();
        await serviceInitializer.initialize();
        console.log('App: Services initialized successfully');
      } catch (error) {
        console.error('App: Failed to initialize services:', error);
      }
    };

    initServices();

    // Initialize with canvas agent
    agentManager.createAgent('canvas', 'canvas');

    // Add initial demo nodes
    const demoNodes: Node[] = [
      {
        id: 'canvas',
        type: 'advanced',
        position: { x: 400, y: 100 },
        data: {
          label: 'Canvas Meta-Agent',
          agentType: 'canvas' as AgentType,
          agentId: 'canvas',
        },
      },
    ];

    updateNodes(demoNodes);
  }, [agentManager, updateNodes]);

  useEffect(() => {
    const handler = (event: BusEvent) => {
      if (event.type === 'AGENT_STATE_UPDATE') {
        const agentId = event.source;
        // Ensure payload and state exist and are objects
        if (
          event.payload &&
          typeof event.payload === 'object' &&
          'state' in event.payload
        ) {
          const agentFullState = (
            event.payload as { state: Record<string, any> }
          ).state;

          if (typeof agentFullState !== 'object' || agentFullState === null) {
            console.warn(
              'AGENT_STATE_UPDATE received with invalid state in payload',
              event
            );
            return;
          }

          updateNodes(currentNodes =>
            currentNodes.map(node => {
              if (node.id === agentId) {
                const newNode = {
                  ...node,
                  data: { ...node.data, agentState: { ...agentFullState } },
                };

                // Update position if present in agent's state
                if (
                  typeof agentFullState.position === 'object' &&
                  agentFullState.position !== null &&
                  typeof agentFullState.position.x === 'number' &&
                  typeof agentFullState.position.y === 'number'
                ) {
                  newNode.position = { ...agentFullState.position };
                }

                // Update label if present in agent's state
                if (typeof agentFullState.label === 'string') {
                  newNode.data.label = agentFullState.label;
                }

                // Update status if present in agent's state
                if (typeof agentFullState.status === 'string') {
                  newNode.data.status = agentFullState.status;
                  // Potentially update a visual cue or style based on status
                }

                return newNode;
              }
              return node;
            })
          );
        } else {
          console.warn(
            'AGENT_STATE_UPDATE received with missing or invalid payload.state',
            event
          );
        }
      }
    };

    const unsubscribe = eventBus.subscribe('AGENT_STATE_UPDATE', handler);

    return () => {
      unsubscribe();
    };
  }, [updateNodes]);

  const onConnect: OnConnect = useCallback(
    (params: Connection | Edge) => {
      const edgeId = `edge-${Date.now()}`;
      const edgeData: EdgeData = {
        id: edgeId,
        source: params.source!,
        target: params.target!,
        confidence: 0.8,
        type: 'communication',
        lastActivity: Date.now(),
        messageCount: 0,
      };

      const newEdge: Edge = {
        id: edgeId,
        ...params,
        type: 'aware',
        data: edgeData,
      };

      updateEdges([...edges, newEdge]);

      // Publish edge creation event
      eventBus.publish(
        createEvent('EDGE_CREATE', 'ui', {
          edgeId: newEdge.id!,
          source: newEdge.source,
          target: newEdge.target,
          operation: 'create' as const,
          data: edgeData,
          metrics: {
            confidence: edgeData.confidence,
            lastActivity: edgeData.lastActivity,
          },
        })
      );
    },
    [edges, updateEdges]
  );

  const onInit = (rf: ReactFlowInstance) => {
    (window as Window & { rf?: ReactFlowInstance }).rf = rf;
  };

  /* Persistence helpers */
  const handleSave = () => saveFlow(nodes, edges);
  const handleLoad = () => fileInput.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const json = JSON.parse(text) as { nodes: Node[]; edges: Edge[] };
    updateNodes(json.nodes);
    updateEdges(json.edges);
  };

  /* Agent Creation */
  const createAgent = async (type: AgentType) => {
    if (isCreatingAgent) return;

    setIsCreatingAgent(true);

    try {
      const agentId = await agentManager.createAgent(type);

      // Create node for the new agent
      const newNode: Node = {
        id: agentId,
        type: 'advanced',
        position: {
          x: Math.random() * 400 + 200,
          y: Math.random() * 400 + 200,
        },
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
          agentType: type,
          agentId,
        },
      };

      updateNodes([...nodes, newNode]);

      // Publish node creation event
      eventBus.publish(
        createEvent('NODE_CREATE', 'ui', {
          nodeId: agentId,
          operation: 'create' as const,
          position: newNode.position,
          data: newNode.data,
        })
      );

      // Create edge to canvas if it's not the canvas agent
      if (type !== 'canvas') {
        const edgeId = `${agentId}-to-canvas`;
        const edgeData: EdgeData = {
          id: edgeId,
          source: agentId,
          target: 'canvas',
          confidence: 0.9,
          type: 'communication',
          lastActivity: Date.now(),
          messageCount: 0,
        };

        const newEdge: Edge = {
          id: edgeId,
          source: agentId,
          target: 'canvas',
          type: 'aware',
          data: edgeData,
        };

        updateEdges([...edges, newEdge]);

        // Publish edge creation event
        eventBus.publish(
          createEvent('EDGE_CREATE', 'ui', {
            edgeId: newEdge.id,
            source: newEdge.source,
            target: newEdge.target,
            operation: 'create' as const,
            data: edgeData,
            metrics: {
              confidence: edgeData.confidence,
              lastActivity: edgeData.lastActivity,
            },
          })
        );
      }
    } catch (error) {
      // Publish error event
      eventBus.publish(
        createEvent('SYSTEM_ALERT', 'ui', {
          level: 'error' as const,
          message: 'Failed to create agent',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          source: 'ui',
          actionRequired: false,
        })
      );
    } finally {
      setIsCreatingAgent(false);
    }
  };

  /* Demo Scenarios */
  const runSwarmDemo = async () => {
    // Create swarm agents
    const swarmIds: string[] = await Promise.all([
      agentManager.createAgent('swarm'),
      agentManager.createAgent('swarm'),
      agentManager.createAgent('swarm'),
      agentManager.createAgent('swarm'),
      agentManager.createAgent('swarm'),
    ]);

    // Create nodes for swarm agents
    const swarmNodes: Node[] = swarmIds.map((id, index) => ({
      id,
      type: 'advanced',
      position: {
        x: 200 + (index % 3) * 150,
        y: 300 + Math.floor(index / 3) * 120,
      },
      data: {
        label: `Swarm ${index + 1}`,
        agentType: 'swarm' as AgentType,
        agentId: id,
      },
    }));

    // Create edges between swarm agents
    const swarmEdges: Edge[] = [];
    for (let i = 0; i < swarmIds.length; i++) {
      for (let j = i + 1; j < swarmIds.length; j++) {
        const edgeId = `${swarmIds[i]}-to-${swarmIds[j]}`;
        const edgeData: EdgeData = {
          id: edgeId,
          source: swarmIds[i]!,
          target: swarmIds[j]!,
          confidence: 0.7,
          type: 'proximity',
          lastActivity: Date.now(),
          messageCount: 0,
        };

        swarmEdges.push({
          id: edgeId,
          source: swarmIds[i]!,
          target: swarmIds[j]!,
          type: 'aware',
          data: edgeData,
        });
      }
    }

    updateNodes([...nodes, ...swarmNodes]);
    updateEdges([...edges, ...swarmEdges]);

    // Trigger swarm behaviors
    setTimeout(() => {
      swarmIds.forEach(id => {
        eventBus.publish(
          createEvent(
            'CANVAS_COMMAND',
            'ui',
            {
              command: 'optimize_towards',
              target: id,
              args: [{ x: 50, y: 50 }],
              executionMode: 'immediate' as const,
            },
            { target: id }
          )
        );
      });
    }, 2000);
  };

  const runReasoningDemo = async () => {
    // Create reasoning agents
    const reasoningIds: string[] = await Promise.all([
      agentManager.createAgent('reasoning'),
      agentManager.createAgent('reasoning'),
    ]);

    // Create nodes for reasoning agents
    const reasoningNodes: Node[] = reasoningIds.map((id, index) => ({
      id,
      type: 'advanced',
      position: {
        x: 600 + index * 200,
        y: 250,
      },
      data: {
        label: `Reasoning ${index + 1}`,
        agentType: 'reasoning' as AgentType,
        agentId: id,
      },
    }));

    // Create edges between reasoning agents
    const reasoningEdges: Edge[] = [];
    for (let i = 0; i < reasoningIds.length - 1; i++) {
      const edgeId = `${reasoningIds[i]}-to-${reasoningIds[i + 1]}`;
      const edgeData: EdgeData = {
        id: edgeId,
        source: reasoningIds[i]!,
        target: reasoningIds[i + 1]!,
        confidence: 0.85,
        type: 'communication',
        lastActivity: Date.now(),
        messageCount: 0,
      };

      reasoningEdges.push({
        id: edgeId,
        source: reasoningIds[i]!,
        target: reasoningIds[i + 1]!,
        type: 'aware',
        data: edgeData,
      });
    }

    updateNodes([...nodes, ...reasoningNodes]);
    updateEdges([...edges, ...reasoningEdges]);

    // Trigger reasoning behaviors
    setTimeout(() => {
      reasoningIds.forEach((id, index) => {
        eventBus.publish(
          createEvent(
            'AGENT_QUERY',
            'ui',
            {
              query: `What is the meaning of existence? (Agent ${index + 1})`,
              queryType: 'information' as const,
              expectResponse: true,
            },
            { target: id }
          )
        );
      });
    }, 1000);
  };

  const runMixedDemo = async () => {
    // Create mixed agent types
    const mixedIds: string[] = await Promise.all([
      agentManager.createAgent('reasoning'),
      agentManager.createAgent('swarm'),
      agentManager.createAgent('worker'),
    ]);

    // Create nodes for mixed agents with additional data for DataEdge
    const mixedNodes: Node[] = mixedIds.map((id, index) => {
      const types: AgentType[] = ['reasoning', 'swarm', 'worker'];
      const type = types[index]!;

      return {
        id,
        type: 'advanced',
        position: {
          x: 100 + index * 200,
          y: 400,
        },
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
          agentType: type,
          agentId: id,
          // Add data for DataEdge demonstration
          performance: Math.round(Math.random() * 100),
          messageCount: Math.round(Math.random() * 50),
          status: ['active', 'idle', 'processing'][
            Math.floor(Math.random() * 3)
          ],
        },
      };
    });

    updateNodes([...nodes, ...mixedNodes]);

    // Create interconnected edges with DataEdge types
    const mixedEdges: Edge[] = [];
    for (let i = 0; i < mixedIds.length; i++) {
      for (let j = i + 1; j < mixedIds.length; j++) {
        const edgeId = `${mixedIds[i]}-to-${mixedIds[j]}`;
        const edgeData: EdgeData = {
          id: edgeId,
          source: mixedIds[i]!,
          target: mixedIds[j]!,
          confidence: 0.6,
          type: 'communication',
          lastActivity: Date.now(),
          messageCount: 0,
        };

        // Alternate between aware and dataEdge types
        const edgeType = Math.random() > 0.5 ? 'dataEdge' : 'aware';

        mixedEdges.push({
          id: edgeId,
          source: mixedIds[i]!,
          target: mixedIds[j]!,
          type: edgeType,
          data:
            edgeType === 'dataEdge'
              ? {
                  key: 'performance',
                  label: 'Performance',
                  showValue: true,
                  formatValue: (value: number) => `${value}%`,
                }
              : edgeData,
        });
      }
    }

    updateEdges([...edges, ...mixedEdges]);
  };

  const runDataEdgeDemo = async () => {
    // Create agents specifically for data edge demonstration
    const dataAgentIds: string[] = await Promise.all([
      agentManager.createAgent('reasoning'),
      agentManager.createAgent('swarm'),
    ]);

    // Create nodes with rich data for demonstration
    const dataNodes: Node[] = dataAgentIds.map((id, index) => ({
      id,
      type: 'advanced',
      position: {
        x: 300 + index * 300,
        y: 200,
      },
      data: {
        label: index === 0 ? 'Data Source' : 'Data Consumer',
        agentType:
          index === 0 ? ('reasoning' as AgentType) : ('swarm' as AgentType),
        agentId: id,
        // Rich data for DataEdge
        temperature: 23.5 + Math.random() * 10,
        cpu_usage: Math.round(Math.random() * 100),
        memory_usage: Math.round(Math.random() * 100),
        network_latency: Math.round(Math.random() * 200),
        throughput: Math.round(Math.random() * 1000),
      },
    }));

    updateNodes([...nodes, ...dataNodes]);

    // Create multiple DataEdges showing different data fields
    const dataEdges: Edge[] = [
      {
        id: 'temp-edge',
        source: dataAgentIds[0]!,
        target: dataAgentIds[1]!,
        type: 'dataEdge',
        data: {
          key: 'temperature',
          label: 'Temperature',
          showValue: true,
          formatValue: (value: number) => `${value.toFixed(1)}°C`,
        },
      },
      {
        id: 'cpu-edge',
        source: dataAgentIds[0]!,
        target: dataAgentIds[1]!,
        type: 'dataEdge',
        data: {
          key: 'cpu_usage',
          label: 'CPU',
          showValue: true,
          formatValue: (value: number) => `${value}%`,
        },
      },
      {
        id: 'throughput-edge',
        source: dataAgentIds[0]!,
        target: dataAgentIds[1]!,
        type: 'dataEdge',
        data: {
          key: 'throughput',
          label: 'Throughput',
          showValue: true,
          formatValue: (value: number) => `${value} ops/s`,
        },
      },
    ];

    updateEdges([...edges, ...dataEdges]);
  };

  const clearAll = () => {
    updateNodes([]);
    updateEdges([]);
    agentManager.clearAll();

    // Publish system event
    eventBus.publish(
      createEvent('SYSTEM_ALERT', 'ui', {
        level: 'info' as const,
        message: 'All agents and connections cleared',
        source: 'ui',
        actionRequired: false,
      })
    );
  };

  return (
    <div
      className={`w-screen h-screen flex neural-mesh-bg ${isDarkMode ? 'dark' : ''}`}
    >
      {/* Animated Background Elements */}
      <div className='absolute inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-1/4 left-1/4 w-64 h-64 bg-neural-500/10 rounded-full blur-3xl animate-pulse-slow'></div>
        <div className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-agent-reasoning/10 rounded-full blur-3xl animate-float'></div>
        <div className='absolute top-1/2 left-1/2 w-32 h-32 bg-agent-swarm/10 rounded-full blur-2xl animate-ping-slow'></div>
      </div>

      {/* Main Flow Area */}
      <div className='flex-1 relative'>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onConnect={onConnect}
          onInit={onInit}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          className='neural-mesh-bg'
          fitView
        >
          <Background
            color={isDarkMode ? '#667eea' : '#764ba2'}
            gap={20}
            size={1}
            className='opacity-30'
          />
          <Controls
            className='glass rounded-xl border border-white/20 backdrop-blur-xl'
            showZoom={true}
            showFitView={true}
            showInteractive={true}
          />
          <MiniMap
            className='glass rounded-xl border border-white/20 backdrop-blur-xl'
            nodeColor={node => {
              const agentType = node.data?.['agentType'];
              switch (agentType) {
                case 'reasoning':
                  return '#8b5cf6';
                case 'swarm':
                  return '#f59e0b';
                case 'canvas':
                  return '#10b981';
                case 'worker':
                  return '#ef4444';
                default:
                  return '#667eea';
              }
            }}
          />

          {/* SVG Marker Definitions for Data Edges */}
          <svg style={{ position: 'absolute', top: 0, left: 0 }}>
            <defs>
              <marker
                id='data-marker'
                markerWidth='12'
                markerHeight='12'
                refX='12'
                refY='6'
                orient='auto'
                markerUnits='strokeWidth'
              >
                <path
                  d='M0,0 L0,12 L12,6 z'
                  fill='#667eea'
                  stroke='#667eea'
                  strokeWidth='1'
                />
              </marker>
            </defs>
          </svg>
        </ReactFlow>
      </div>

      {/* Futuristic Control Panel */}
      <div className='w-80 h-full card-glass border-l border-white/20 backdrop-blur-2xl p-6 overflow-y-auto'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-2xl font-bold holographic-text mb-2'>
            Neural Agent System
          </h1>
          <p className='text-sm text-white/70'>
            Advanced Multi-Agent Intelligence Platform
          </p>
        </div>

        {/* Theme Toggle */}
        <div className='mb-6'>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className='neural-button w-full flex items-center justify-center gap-2'
          >
            {isDarkMode ? '🌙' : '☀️'}
            <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>

        {/* Agent Controls */}
        <div className='mb-8'>
          <h2 className='text-lg font-semibold text-white mb-4 flex items-center gap-2'>
            <span className='w-2 h-2 bg-neural-400 rounded-full animate-pulse'></span>
            Agent Controls
          </h2>

          <div className='space-y-3'>
            <button
              onClick={() => createAgent('reasoning')}
              disabled={isCreatingAgent}
              className='w-full neural-button bg-gradient-to-r from-agent-reasoning to-purple-600 hover:from-purple-600 hover:to-agent-reasoning transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <span className='flex items-center justify-center gap-2'>
                🧠 <span>Reasoning Agent</span>
              </span>
            </button>

            <button
              onClick={() => createAgent('swarm')}
              disabled={isCreatingAgent}
              className='w-full neural-button bg-gradient-to-r from-agent-swarm to-yellow-600 hover:from-yellow-600 hover:to-agent-swarm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <span className='flex items-center justify-center gap-2'>
                🐝 <span>Swarm Agent</span>
              </span>
            </button>

            <button
              onClick={() => createAgent('worker')}
              disabled={isCreatingAgent}
              className='w-full neural-button bg-gradient-to-r from-agent-worker to-red-600 hover:from-red-600 hover:to-agent-worker transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <span className='flex items-center justify-center gap-2'>
                ⚡ <span>Worker Agent</span>
              </span>
            </button>
          </div>
        </div>

        {/* Demo Scenarios */}
        <div className='mb-8'>
          <h2 className='text-lg font-semibold text-white mb-4 flex items-center gap-2'>
            <span className='w-2 h-2 bg-agent-swarm rounded-full animate-pulse'></span>
            Demo Scenarios
          </h2>

          <div className='space-y-3'>
            <button
              onClick={runSwarmDemo}
              className='w-full neural-button bg-gradient-to-r from-green-500 to-emerald-600 hover:from-emerald-600 hover:to-green-500 transition-all duration-300'
            >
              <span className='flex items-center justify-center gap-2'>
                🌊 <span>Swarm Demo</span>
              </span>
            </button>

            <button
              onClick={runReasoningDemo}
              className='w-full neural-button bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 transition-all duration-300'
            >
              <span className='flex items-center justify-center gap-2'>
                🧩 <span>Reasoning Demo</span>
              </span>
            </button>

            <button
              onClick={runMixedDemo}
              className='w-full neural-button bg-gradient-to-r from-purple-500 to-pink-600 hover:from-pink-600 hover:to-purple-500 transition-all duration-300'
            >
              <span className='flex items-center justify-center gap-2'>
                ✨ <span>Mixed Demo</span>
              </span>
            </button>

            <button
              onClick={runDataEdgeDemo}
              className='w-full neural-button bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-cyan-600 hover:to-teal-500 transition-all duration-300'
            >
              <span className='flex items-center justify-center gap-2'>
                📊 <span>Data Edge Demo</span>
              </span>
            </button>
          </div>
        </div>

        {/* AI Tools */}
        <div className='mb-8'>
          <h2 className='text-lg font-semibold text-white mb-4 flex items-center gap-2'>
            <span className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></span>
            AI Tools
          </h2>

          <div className='space-y-3'>
            <button
              onClick={() => setShowNodePalette(true)}
              className='w-full neural-button bg-gradient-to-r from-emerald-500 to-green-600 hover:from-green-600 hover:to-emerald-500 transition-all duration-300'
            >
              <span className='flex items-center justify-center gap-2'>
                🧩 <span>Add AI Node</span>
              </span>
            </button>

            <button
              onClick={() => setShowApiSettings(true)}
              className='w-full neural-button bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 transition-all duration-300'
            >
              <span className='flex items-center justify-center gap-2'>
                🔑 <span>API Keys</span>
              </span>
            </button>
          </div>
        </div>

        {/* System Controls */}
        <div className='mb-8'>
          <h2 className='text-lg font-semibold text-white mb-4 flex items-center gap-2'>
            <span className='w-2 h-2 bg-agent-canvas rounded-full animate-pulse'></span>
            System Controls
          </h2>

          <div className='space-y-3'>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className='w-full neural-button bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-blue-600 hover:to-cyan-500 transition-all duration-300'
            >
              <span className='flex items-center justify-center gap-2'>
                📊 <span>Analytics</span>
              </span>
            </button>

            <button
              onClick={handleSave}
              className='w-full neural-button bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-600 transition-all duration-300'
            >
              <span className='flex items-center justify-center gap-2'>
                💾 <span>Save</span>
              </span>
            </button>

            <button
              onClick={handleLoad}
              className='w-full neural-button bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-600 transition-all duration-300'
            >
              <span className='flex items-center justify-center gap-2'>
                📁 <span>Load</span>
              </span>
            </button>

            <button
              onClick={clearAll}
              className='w-full neural-button bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all duration-300'
            >
              <span className='flex items-center justify-center gap-2'>
                🗑️ <span>Clear All</span>
              </span>
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className='card-glass p-4 rounded-xl border border-white/20'>
          <h3 className='text-sm font-semibold text-white mb-3 flex items-center gap-2'>
            <span className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></span>
            System Status
          </h3>

          <div className='space-y-2 text-xs text-white/70'>
            <div className='flex justify-between'>
              <span>Agents:</span>
              <span className='text-neural-300 font-mono'>{nodes.length}</span>
            </div>
            <div className='flex justify-between'>
              <span>Connections:</span>
              <span className='text-neural-300 font-mono'>{edges.length}</span>
            </div>
            <div className='flex justify-between'>
              <span>Status:</span>
              <span className='text-green-400 font-mono'>Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && (
        <div className='absolute top-4 right-4 w-96 card-glass border border-white/20 backdrop-blur-2xl p-6 rounded-xl'>
          <div className='flex justify-between items-center mb-4'>
            <h2 className='text-lg font-semibold holographic-text'>
              System Analytics
            </h2>
            <button
              onClick={() => setShowAnalytics(false)}
              className='text-white/70 hover:text-white transition-colors'
            >
              ✕
            </button>
          </div>
          <AnalyticsDashboard />
        </div>
      )}

      {/* API Key Settings Modal */}
      <ApiKeySettings
        isOpen={showApiSettings}
        onClose={() => setShowApiSettings(false)}
      />

      {/* Node Palette Modal */}
      <NodePalette
        isOpen={showNodePalette}
        onClose={() => setShowNodePalette(false)}
        onAddNode={(template: any, position: { x: number; y: number }) => {
          const newNode: Node = {
            id: `${template.type}-${Date.now()}`,
            type: template.type,
            position,
            data: {
              label: template.label,
              ...template.defaultData,
            },
          };
          updateNodes([...nodes, newNode]);
        }}
      />

      {/* Hidden file input */}
      <input
        ref={fileInput}
        type='file'
        accept='.json'
        onChange={onFile}
        className='hidden'
      />
    </div>
  );
}
