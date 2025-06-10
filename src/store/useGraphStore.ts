import {
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type Viewport,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react';
import { create } from 'zustand';

interface GraphState {
  // Core graph state
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;

  // Node operations
  addNode: (node: Node) => void;
  updateNode: (nodeId: string, data: Partial<Node>) => void;
  removeNode: (nodeId: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  setNodes: (nodes: Node[]) => void;

  // Edge operations
  addEdge: (edge: Edge) => void;
  updateEdge: (edgeId: string, data: Partial<Edge>) => void;
  removeEdge: (edgeId: string) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  setEdges: (edges: Edge[]) => void;

  // Viewport operations
  setViewport: (viewport: Viewport) => void;

  // Selection state
  selectedNodes: string[];
  selectedEdges: string[];
  setSelectedNodes: (nodeIds: string[]) => void;
  setSelectedEdges: (edgeIds: string[]) => void;
}
/* eslint-disable @typescript-eslint/no-unused-vars */
export const useGraphStore = create<GraphState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodes: [],
  selectedEdges: [],

  // Node operations
  addNode: (node: Node) =>
    set(state => ({
      nodes: [...state.nodes, node],
    })),

  updateNode: (nodeId: string, data: Partial<Node>) =>
    set(state => ({
      nodes: state.nodes.map(node =>
        node.id === nodeId ? { ...node, ...data } : node
      ),
    })),

  removeNode: (nodeId: string) =>
    set(state => ({
      nodes: state.nodes.filter(node => node.id !== nodeId),
      edges: state.edges.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId
      ),
    })),

  onNodesChange: (changes: NodeChange[]) =>
    set(state => ({
      nodes: applyNodeChanges(changes, state.nodes),
    })),

  setNodes: (nodes: Node[]) => set({ nodes }),

  // Edge operations
  addEdge: (edge: Edge) =>
    set(state => ({
      edges: [...state.edges, edge],
    })),

  updateEdge: (edgeId: string, data: Partial<Edge>) =>
    set(state => ({
      edges: state.edges.map(edge =>
        edge.id === edgeId ? { ...edge, ...data } : edge
      ),
    })),

  removeEdge: (edgeId: string) =>
    set(state => ({
      edges: state.edges.filter(edge => edge.id !== edgeId),
    })),

  onEdgesChange: (changes: EdgeChange[]) =>
    set(state => ({
      edges: applyEdgeChanges(changes, state.edges),
    })),

  setEdges: (edges: Edge[]) => set({ edges }),

  // Viewport operations
  setViewport: (viewport: Viewport) => set({ viewport }),

  // Selection operations
  setSelectedNodes: (nodeIds: string[]) => set({ selectedNodes: nodeIds }),
  setSelectedEdges: (edgeIds: string[]) => set({ selectedEdges: edgeIds }),
}));

// Selector hooks for better performance
export const useNodes = () => useGraphStore(state => state.nodes);
export const useEdges = () => useGraphStore(state => state.edges);
export const useViewport = () => useGraphStore(state => state.viewport);
export const useSelectedNodes = () =>
  useGraphStore(state => state.selectedNodes);
export const useSelectedEdges = () =>
  /* eslint-enable @typescript-eslint/no-unused-vars */
  useGraphStore(state => state.selectedEdges);
