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
import { AgentExecutionUI } from './components/AgentExecutionUI';
import { ComponentRouter, showComponent } from './components/ComponentRouter';
import { NodeConfigurationUI } from './components/NodeConfigurationUI';
import { DataEdge } from './edges/DataEdge';
import { edgeAware } from './edges/edgeAware';
import { AgentManager, type AgentType } from './managers/AgentManager';
import { ComponentStateManager } from './managers/ComponentStateManager';
import { AdvancedAgentNode } from './nodes/AdvancedAgentNode';
import { AgentNode } from './nodes/agentNode';
import { CodeExecutorNode } from './nodes/CodeExecutorNode';
import { LLMChatNode } from './nodes/LLMChatNode';
import { ExecutionHistoryService } from './services/ExecutionHistoryService';
import { FlowValidationService } from './services/FlowValidationService';
import { ServiceInitializer } from './services/ServiceInitializer';
import { useGraphStore } from './store/useGraphStore';
import type { ValidationIssue, ValidationResult } from './types';
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

// Add error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className='flex items-center justify-center h-screen bg-red-50'>
          <div className='text-center p-8 max-w-md'>
            <h1 className='text-2xl font-bold text-red-600 mb-4'>
              Something went wrong
            </h1>
            <p className='text-gray-600 mb-4'>
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            <button
              className='px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const fileInput = useRef<HTMLInputElement>(null);
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange } =
    useGraphStore();
  const [agentManager] = useState(() => new AgentManager());
  const [_componentStateManager] = useState(() =>
    ComponentStateManager.getInstance()
  );
  const [_flowValidationService] = useState(() =>
    FlowValidationService.getInstance()
  );
  const [_executionHistoryService] = useState(() =>
    ExecutionHistoryService.getInstance()
  );
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [_isDarkMode, _setIsDarkMode] = useState(true);
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const [showAgentExecution, setShowAgentExecution] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);

  // Add loading state
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    console.log('App: Starting initialization...');

    // Initialize services
    const initServices = async () => {
      try {
        console.log('App: Initializing services...');
        const serviceInitializer = ServiceInitializer.getInstance();
        await serviceInitializer.initialize();
        console.log('App: Services initialized successfully');
      } catch (error) {
        console.error('App: Failed to initialize services:', error);
        setInitError(
          error instanceof Error
            ? error.message
            : 'Service initialization failed'
        );
        return;
      }
    };

    const initializeApp = async () => {
      try {
        await initServices();

        console.log('App: Creating canvas agent...');
        // Initialize with canvas agent
        agentManager.createAgent('canvas', 'canvas');

        console.log('App: Setting up demo nodes...');
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

        setNodes(demoNodes);
        console.log('App: Demo nodes set up');

        setIsInitialized(true);
        console.log('App: Initialization complete');
      } catch (error) {
        console.error('App: Initialization failed:', error);
        setInitError(
          error instanceof Error ? error.message : 'App initialization failed'
        );
      }
    };

    initializeApp();

    // Subscribe to node selection events
    const handleNodeSelection = (event: BusEvent<{ nodeId: string }>) => {
      if (event.type === 'NODE_SELECT') {
        setSelectedNodeId(event.payload.nodeId);
        setShowNodeConfig(true);

        // Get current nodes from the store to avoid stale closure
        const currentNodes = useGraphStore.getState().nodes;
        const node = currentNodes.find(n => n.id === event.payload.nodeId);
        if (node?.data?.['agentId']) {
          setSelectedAgentId(node.data['agentId'] as string);
        }
      }
    };

    // Store the unsubscribe function
    const unsubscribeNodeSelection = eventBus.subscribe(
      ['NODE_SELECT'],
      handleNodeSelection
    );

    // Subscribe to flow validation results
    const handleValidationResult = (event: BusEvent<ValidationResult>) => {
      if (event.type === 'FLOW_VALIDATION_RESULT') {
        setValidationResult(event.payload);
      }
    };

    // Store the unsubscribe function
    const unsubscribeValidationResult = eventBus.subscribe(
      ['FLOW_VALIDATION_RESULT'],
      handleValidationResult
    );

    // Cleanup function should use the stored unsubscribe
    return () => {
      unsubscribeNodeSelection();
      unsubscribeValidationResult();
    };
  }, [agentManager, setNodes]);

  const onConnect: OnConnect = useCallback(
    (params: Connection | Edge) => {
      // Validate connection before creating edge
      if (!params.source || !params.target) {
        (window as Window & { console: Console }).console.warn(
          'Invalid connection: missing source or target'
        );
        return;
      }

      // Prevent self-connections
      if (params.source === params.target) {
        (window as Window & { console: Console }).console.warn(
          'Self-connections are not allowed'
        );
        return;
      }

      // Check if connection already exists
      const existingEdge = edges.find(
        edge =>
          edge.source === params.source &&
          edge.target === params.target &&
          edge.sourceHandle === params.sourceHandle &&
          edge.targetHandle === params.targetHandle
      );

      if (existingEdge) {
        (window as Window & { console: Console }).console.warn(
          'Connection already exists'
        );
        return;
      }

      // Get source and target nodes for validation
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      if (!sourceNode || !targetNode) {
        (window as Window & { console: Console }).console.warn(
          'Source or target node not found'
        );
        return;
      }

      // Determine edge type based on handles and node types
      let edgeType: string = 'aware'; // default
      let edgeData: EdgeData;

      const edgeId = `${params.source}-to-${params.target}-${Date.now()}`;

      // Handle-specific logic for different connection types
      if (
        params.sourceHandle?.startsWith('output-data') &&
        targetNode.type === 'data_processor'
      ) {
        edgeType = 'dataEdge';
        edgeData = {
          id: edgeId,
          source: params.source,
          target: params.target,
          type: 'data',
          confidence: 0.9,
          lastActivity: Date.now(),
          messageCount: 0,
          // DataEdge specific properties
          key: 'performance', // default data key
          label: 'Performance Data',
          showValue: true,
          formatValue: (value: unknown) => `${value}%`,
        } as EdgeData & {
          key: string;
          label: string;
          showValue: boolean;
          formatValue: (value: unknown) => string;
        };
      } else {
        // Standard communication edge
        edgeData = {
          id: edgeId,
          source: params.source,
          target: params.target,
          type: 'communication',
          confidence: 0.8,
          lastActivity: Date.now(),
          messageCount: 0,
        };
      }

      const newEdge: Edge = {
        id: edgeId,
        ...params,
        type: edgeType,
        data: edgeData,
        animated: edgeType === 'dataEdge', // Animate data edges
        style: {
          strokeWidth: 2,
          stroke: edgeType === 'dataEdge' ? '#10b981' : '#64748b',
        },
      };

      setEdges([...edges, newEdge]);

      // Publish edge creation event with enhanced metadata
      eventBus.publish(
        createEvent('EDGE_CREATE', 'ui', {
          edgeId: newEdge.id,
          source: newEdge.source,
          target: newEdge.target,
          sourceHandle: params.sourceHandle,
          targetHandle: params.targetHandle,
          edgeType,
          operation: 'create' as const,
          data: edgeData,
          metrics: {
            confidence: edgeData.confidence,
            lastActivity: edgeData.lastActivity,
            connectionType: edgeType,
          },
          validation: {
            isValid: true,
            sourceNodeType: sourceNode.type,
            targetNodeType: targetNode.type,
          },
        })
      );
    },
    [edges, nodes, setEdges]
  );

  const onInit = (rf: ReactFlowInstance) => {
    (window as Window & { rf?: ReactFlowInstance }).rf = rf;
  };

  /* Persistence helpers */
  const _handleSave = () => saveFlow(nodes, edges);
  const _handleLoad = () => fileInput.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const json = JSON.parse(text) as { nodes: Node[]; edges: Edge[] };
    setNodes(json.nodes);
    setEdges(json.edges);
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

      setNodes([...nodes, newNode]);

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

        setEdges([...edges, newEdge]);

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
  const _runSwarmDemo = async () => {
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

    setNodes([...nodes, ...swarmNodes]);
    setEdges([...edges, ...swarmEdges]);

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

  const _runReasoningDemo = async () => {
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

    setNodes([...nodes, ...reasoningNodes]);
    setEdges([...edges, ...reasoningEdges]);

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

  const _runMixedDemo = async () => {
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

    setNodes([...nodes, ...mixedNodes]);

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

    setEdges([...edges, ...mixedEdges]);
  };

  const _runDataEdgeDemo = async () => {
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

    setNodes([...nodes, ...dataNodes]);

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

    setEdges([...edges, ...dataEdges]);
  };

  const clearAll = () => {
    setNodes([]);
    setEdges([]);
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

  const validateFlow = () => {
    eventBus.publish(
      createEvent('FLOW_VALIDATE', 'ui', {
        nodes,
        edges,
      })
    );
  };

  const toggleNodeConfig = () => {
    setShowNodeConfig(!showNodeConfig);
    if (!showNodeConfig && selectedNodeId) {
      eventBus.publish(
        createEvent('NODE_SELECT', 'ui', {
          nodeId: selectedNodeId,
        })
      );
    }
  };

  const toggleAgentExecution = () => {
    setShowAgentExecution(!showAgentExecution);
    if (!showAgentExecution && selectedAgentId) {
      eventBus.publish(
        createEvent('AGENT_SELECT', 'ui', {
          agentId: selectedAgentId,
        })
      );
    }
  };

  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);

    // Find agent ID for this node
    if (node?.data?.['agentId']) {
      setSelectedAgentId(node.data['agentId'] as string);
    }

    // Publish node select event
    eventBus.publish(
      createEvent('NODE_SELECT', 'ui', {
        nodeId: node.id,
        data: node.data,
      })
    );
  };

  // Show loading state
  if (!isInitialized) {
    return (
      <div className='flex items-center justify-center h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4'></div>
          <h2 className='text-xl font-semibold text-white mb-2'>
            Initializing Nodal Agent System
          </h2>
          <p className='text-indigo-200'>Setting up services and agents...</p>
          {initError && (
            <div className='mt-4 p-4 bg-red-500 bg-opacity-20 border border-red-400 rounded-lg'>
              <p className='text-red-200 text-sm'>{initError}</p>
              <button
                className='mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700'
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div
        className={`h-screen w-screen overflow-hidden ${_isDarkMode ? 'dark' : ''}`}
      >
        <div className='h-full w-full bg-white dark:bg-gray-900 text-black dark:text-white'>
          <div className='h-full w-full react-flow-wrapper'>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onInit={onInit}
              onNodeClick={onNodeClick}
              fitView
              style={{ width: '100%', height: '100%' }}
              minZoom={0.1}
              maxZoom={2}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            >
              <Background />
              <Controls />
              <MiniMap />

              {/* Component Router handles all component visibility */}
              <ComponentRouter />

              {/* Conditional UI Elements */}
              {showNodeConfig && selectedNodeId && (
                <div className='absolute top-0 right-0 w-96 h-full bg-white dark:bg-gray-800 shadow-lg overflow-y-auto z-10'>
                  <NodeConfigurationUI nodeId={selectedNodeId} />
                </div>
              )}

              {showAgentExecution && selectedAgentId && (
                <div className='absolute bottom-0 left-0 w-full h-72 bg-white dark:bg-gray-800 shadow-lg overflow-y-auto z-10'>
                  <AgentExecutionUI agentId={selectedAgentId} />
                </div>
              )}
            </ReactFlow>
          </div>

          {/* Controls */}
          <div className='absolute top-4 left-4 flex flex-col space-y-2 z-20'>
            <button
              className='px-3 py-1 bg-blue-500 text-white rounded'
              onClick={() => createAgent('reasoning')}
              disabled={isCreatingAgent}
            >
              Add Reasoning Agent
            </button>
            <button
              className='px-3 py-1 bg-green-500 text-white rounded'
              onClick={() => createAgent('swarm')}
              disabled={isCreatingAgent}
            >
              Add Swarm Agent
            </button>
            <button
              className='px-3 py-1 bg-purple-500 text-white rounded'
              onClick={validateFlow}
            >
              Validate Flow
            </button>
            <button
              className='px-3 py-1 bg-gray-500 text-white rounded'
              onClick={toggleNodeConfig}
            >
              {showNodeConfig ? 'Hide' : 'Show'} Node Config
            </button>
            <button
              className='px-3 py-1 bg-gray-500 text-white rounded'
              onClick={toggleAgentExecution}
            >
              {showAgentExecution ? 'Hide' : 'Show'} Agent Execution
            </button>
          </div>

          {/* Demo Buttons */}
          <div className='absolute top-4 right-4 flex flex-col space-y-2 z-20'>
            <button
              className='px-3 py-1 bg-blue-500 text-white rounded'
              onClick={() => {
                showComponent('analytics', true);
              }}
            >
              Show Analytics
            </button>
            <button
              className='px-3 py-1 bg-green-500 text-white rounded'
              onClick={() => {
                showComponent('apiSettings', true);
              }}
            >
              Show API Settings
            </button>
            <button
              className='px-3 py-1 bg-purple-500 text-white rounded'
              onClick={() => {
                showComponent('nodePalette', true);
              }}
            >
              Show Node Palette
            </button>
            <button
              className='px-3 py-1 bg-red-500 text-white rounded'
              onClick={clearAll}
            >
              Clear All
            </button>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className='absolute bottom-4 right-4 w-96 bg-white dark:bg-gray-800 shadow-lg rounded p-4 max-h-96 overflow-y-auto z-20'>
              <h3 className='text-lg font-medium'>Validation Results</h3>
              <div className='mt-2'>
                <div className='flex items-center'>
                  <div
                    className={`w-3 h-3 rounded-full mr-2 ${
                      validationResult.isValid ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span>
                    {validationResult.isValid ? 'Valid Flow' : 'Invalid Flow'}
                  </span>
                </div>

                {validationResult.issues.length > 0 && (
                  <div className='mt-2'>
                    <h4 className='font-medium'>Issues:</h4>
                    <ul className='list-disc pl-5'>
                      {validationResult.issues.map((issue: ValidationIssue) => (
                        <li
                          key={issue.id}
                          className={`
                            ${
                              issue.severity === 'error'
                                ? 'text-red-500'
                                : issue.severity === 'warning'
                                  ? 'text-yellow-500'
                                  : 'text-blue-500'
                            }
                          `}
                        >
                          {issue.message}
                          {issue.code && (
                            <span className='text-xs ml-2 text-gray-500'>
                              ({issue.code})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <input
            type='file'
            ref={fileInput}
            onChange={onFile}
            className='hidden'
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
