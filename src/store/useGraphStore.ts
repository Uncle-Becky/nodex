import {
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  applyEdgeChanges,
  applyNodeChanges,
  type NodeUpdater,
  type EdgeUpdater,
} from '@xyflow/react';
import { create } from 'zustand';

interface GraphState {
  nodes: Node[];
  edges: Edge[];
  setNodes: (changes: NodeChange[]) => void;
  setEdges: (changes: EdgeChange[]) => void;
  updateNodes: (updater: Node[] | NodeUpdater) => void;
  updateEdges: (updater: Edge[] | EdgeUpdater) => void;
}

export const useGraphStore = create<GraphState>(set => ({
  nodes: [
    {
      id: 'agent-1',
      type: 'agent',
      data: { label: 'Agent 1' },
      position: { x: 250, y: 5 },
    },
  ],
  edges: [],
  setNodes: changes =>
    set(state => ({ nodes: applyNodeChanges(changes, state.nodes) })),
  setEdges: changes =>
    set(state => ({ edges: applyEdgeChanges(changes, state.edges) })),
  updateNodes: updater =>
    set(state => ({
      nodes: typeof updater === 'function' ? updater(state.nodes) : updater,
    })),
  updateEdges: updater =>
    set(state => ({
      edges: typeof updater === 'function' ? updater(state.edges) : updater,
    })),
}));
