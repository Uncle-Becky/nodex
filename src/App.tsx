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
import { ComponentRouter } from './components/ComponentRouter';
import { NodeConfigurationUI } from './components/NodeConfigurationUI';
import { UILayout } from './components/UILayout';
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
import type { ValidationResult } from './types';
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

// Simplified Error Boundary
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
        <div className='error-boundary'>
          <div className='error-content'>
            <h1>Something went wrong</h1>
            <p>{this.state.error?.message ?? 'An unexpected error occurred'}</p>
            <button onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Loading Component
const LoadingScreen: React.FC<{ error?: string }> = ({ error }) => (
  <div className='loading-screen'>
    <div className='loading-content'>
      <div className='loading-spinner' />
      <h2>Initializing Nodal Agent System</h2>
      <p>Setting up services and agents...</p>
      {error && (
        <div className='loading-error'>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
    </div>
  </div>
);

export default function App() {
  // Core state
  const fileInput = useRef<HTMLInputElement>(null);
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange } =
    useGraphStore();

  // Managers - single instances
  const [agentManager] = useState(() => new AgentManager());
  const [componentStateManager] = useState(() =>
    ComponentStateManager.getInstance()
  );
  const [flowValidationService] = useState(() =>
    FlowValidationService.getInstance()
  );
  const [executionHistoryService] = useState(() =>
    ExecutionHistoryService.getInstance()
  );

  // UI state
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const [showAgentExecution, setShowAgentExecution] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);

  // App state
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialization
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('App: Starting initialization...');

        // Initialize services
        const serviceInitializer = ServiceInitializer.getInstance();
        await serviceInitializer.initialize();
        console.log('App: Services initialized');

        // Create canvas agent
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

        setNodes(demoNodes);
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
  }, [agentManager, setNodes]);

  // Event subscriptions
  useEffect(() => {
    const handleNodeSelection = (event: BusEvent<{ nodeId: string }>) => {
      if (event.type === 'NODE_SELECT') {
        setSelectedNodeId(event.payload.nodeId);
        setShowNodeConfig(true);

        const currentNodes = useGraphStore.getState().nodes;
        const node = currentNodes.find(n => n.id === event.payload.nodeId);
        if (node?.data?.['agentId']) {
          setSelectedAgentId(node.data['agentId'] as string);
        }
      }
    };

    const handleValidationResult = (event: BusEvent<ValidationResult>) => {
      if (event.type === 'FLOW_VALIDATION_RESULT') {
        setValidationResult(event.payload);
      }
    };

    const unsubscribeNodeSelection = eventBus.subscribe(
      ['NODE_SELECT'],
      handleNodeSelection
    );
    const unsubscribeValidationResult = eventBus.subscribe(
      ['FLOW_VALIDATION_RESULT'],
      handleValidationResult
    );

    return () => {
      unsubscribeNodeSelection();
      unsubscribeValidationResult();
    };
  }, []);

  // React Flow handlers
  const onConnect: OnConnect = useCallback(
    (params: Connection | Edge) => {
      if (!params.source || !params.target) {
        console.warn('Invalid connection: missing source or target');
        return;
      }

      if (params.source === params.target) {
        console.warn('Self-connections are not allowed');
        return;
      }

      const existingEdge = edges.find(
        edge =>
          edge.source === params.source &&
          edge.target === params.target &&
          edge.sourceHandle === params.sourceHandle &&
          edge.targetHandle === params.targetHandle
      );

      if (existingEdge) {
        console.warn('Connection already exists');
        return;
      }

      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);

      if (!sourceNode || !targetNode) {
        console.warn('Source or target node not found');
        return;
      }

      const edgeId = `${params.source}-to-${params.target}-${Date.now()}`;
      const edgeData: EdgeData = {
        id: edgeId,
        source: params.source,
        target: params.target,
        type: 'communication',
        confidence: 0.8,
        lastActivity: Date.now(),
        messageCount: 0,
      };

      const newEdge: Edge = {
        id: edgeId,
        ...params,
        type: 'aware',
        data: edgeData,
        style: { strokeWidth: 2, stroke: '#64748b' },
      };

      setEdges([...edges, newEdge]);

      eventBus.publish(
        createEvent('EDGE_CREATE', 'ui', {
          edgeId: newEdge.id,
          source: newEdge.source,
          target: newEdge.target,
          operation: 'create' as const,
          data: edgeData,
        })
      );
    },
    [edges, nodes, setEdges]
  );

  const onInit = useCallback((rf: ReactFlowInstance) => {
    (window as any).rf = rf;
    console.log('React Flow initialized');
  }, []);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    if (node?.data?.['agentId']) {
      setSelectedAgentId(node.data['agentId'] as string);
    }
    eventBus.publish(
      createEvent('NODE_SELECT', 'ui', { nodeId: node.id, data: node.data })
    );
  }, []);

  // Agent creation
  const createAgent = useCallback(
    async (type: AgentType) => {
      if (isCreatingAgent) return;

      setIsCreatingAgent(true);
      try {
        const agentId = await agentManager.createAgent(type);
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
        eventBus.publish(
          createEvent('NODE_CREATE', 'ui', {
            nodeId: agentId,
            operation: 'create',
            position: newNode.position,
            data: newNode.data,
          })
        );
      } catch (error) {
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
    },
    [isCreatingAgent, agentManager, nodes, setNodes]
  );

  // Utility functions
  const clearAll = useCallback(() => {
    setNodes([]);
    setEdges([]);
    agentManager.clearAll();
    eventBus.publish(
      createEvent('SYSTEM_ALERT', 'ui', {
        level: 'info' as const,
        message: 'All agents and connections cleared',
        source: 'ui',
        actionRequired: false,
      })
    );
  }, [setNodes, setEdges, agentManager]);

  const validateFlow = useCallback(() => {
    eventBus.publish(createEvent('FLOW_VALIDATE', 'ui', { nodes, edges }));
  }, [nodes, edges]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text) as { nodes: Node[]; edges: Edge[] };
        setNodes(json.nodes);
        setEdges(json.edges);
      } catch (error) {
        console.error('Failed to load file:', error);
      }
    },
    [setNodes, setEdges]
  );

  const handleSave = useCallback(() => {
    saveFlow(nodes, edges);
  }, [nodes, edges]);

  // Loading state
  if (!isInitialized) {
    return <LoadingScreen error={initError || undefined} />;
  }

  return (
    <ErrorBoundary>
      <div className='app-container'>
        {/* Main Flow Canvas */}
        <div className='flow-container'>
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
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* UI Layout - Outside ReactFlow */}
        <UILayout
          isCreatingAgent={isCreatingAgent}
          showNodeConfig={showNodeConfig}
          showAgentExecution={showAgentExecution}
          selectedNodeId={selectedNodeId}
          selectedAgentId={selectedAgentId}
          validationResult={validationResult}
          onCreateAgent={createAgent}
          onClearAll={clearAll}
          onValidateFlow={validateFlow}
          onToggleNodeConfig={() => setShowNodeConfig(!showNodeConfig)}
          onToggleAgentExecution={() =>
            setShowAgentExecution(!showAgentExecution)
          }
          onSave={handleSave}
          onLoadFile={() => fileInput.current?.click()}
        />

        {/* Component Router for Modals */}
        <ComponentRouter />

        {/* Side Panels */}
        {showNodeConfig && selectedNodeId && (
          <div className='side-panel side-panel--right'>
            <NodeConfigurationUI nodeId={selectedNodeId} />
          </div>
        )}

        {showAgentExecution && selectedAgentId && (
          <div className='side-panel side-panel--bottom'>
            <AgentExecutionUI agentId={selectedAgentId} />
          </div>
        )}

        {/* Hidden file input */}
        <input
          type='file'
          ref={fileInput}
          onChange={handleFileUpload}
          className='hidden'
          accept='.json'
        />
      </div>
    </ErrorBoundary>
  );
}
