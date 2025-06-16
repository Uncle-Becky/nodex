import type { Edge, Node } from '@xyflow/react';
import { useCallback, useState } from 'react';
import { useGraphStore } from '../store/useGraphStore';
import type { EdgeValidationState, NodePort } from '../types/nodes';

interface UseEdgeValidationProps {
  nodes: Node[];
  edges?: Edge[];
  onValidationChange?: (state: EdgeValidationState | null) => void;
}

export const useEdgeValidation = ({
  nodes,
  edges,
  onValidationChange,
}: UseEdgeValidationProps) => {
  const storeEdges = useGraphStore(state => state.edges);
  const actualEdges = edges ?? storeEdges;

  const [validationState, setValidationState] =
    useState<EdgeValidationState | null>(null);

  const validateConnection = useCallback(
    (
      sourceNodeId: string,
      sourcePortId: string,
      targetNodeId: string,
      targetPortId: string
    ): boolean => {
      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      const targetNode = nodes.find(n => n.id === targetNodeId);

      if (!sourceNode || !targetNode) return false;

      // Safely access the data property and its nested properties
      const sourceData = (sourceNode.data as { outputs?: NodePort[] }) ?? {};
      const targetData = (targetNode.data as { inputs?: NodePort[] }) ?? {};

      const sourcePort = sourceData.outputs?.find(
        (p: NodePort) => p.id === sourcePortId
      );
      const targetPort = targetData.inputs?.find(
        (p: NodePort) => p.id === targetPortId
      );

      if (!sourcePort || !targetPort) return false;

      // Check if the target port accepts the source port's type
      const isValidType =
        targetPort.type === 'any' || sourcePort.type === targetPort.type;

      // Check if the target port allows multiple connections
      const hasExistingConnections = actualEdges.some(
        e => e.target === targetNodeId && e.targetHandle === targetPortId
      );
      const isValidConnection = !hasExistingConnections || targetPort.multiple;

      return isValidType && isValidConnection;
    },
    [nodes, actualEdges]
  );

  const startEdgeValidation = useCallback(
    (sourceNodeId: string, sourcePortId: string) => {
      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      if (!sourceNode) return;

      // Safely access the data property and its nested properties
      const sourceData = (sourceNode.data as { outputs?: NodePort[] }) ?? {};

      const sourcePort = sourceData.outputs?.find(
        (p: NodePort) => p.id === sourcePortId
      );
      if (!sourcePort) return;

      const validTargets = new Set<string>();
      const validPorts = new Set<string>();

      // Find all valid target nodes and ports
      nodes.forEach(node => {
        if (node.id === sourceNodeId) return; // Skip source node

        // Safely access the data property and its nested properties
        const nodeData = (node.data as { inputs?: NodePort[] }) ?? {};

        const validNodePorts =
          nodeData.inputs?.filter(
            (port: NodePort) =>
              port.type === 'any' || port.type === sourcePort.type
          ) ?? [];

        if (validNodePorts.length > 0) {
          validTargets.add(node.id);
          validNodePorts.forEach((port: NodePort) => validPorts.add(port.id));
        }
      });

      const newValidationState: EdgeValidationState = {
        sourceNode: sourceNodeId,
        sourcePort: sourcePortId,
        sourceType: sourcePort.type,
        validTargets,
        validPorts,
      };

      setValidationState(newValidationState);
      onValidationChange?.(newValidationState);
    },
    [nodes, onValidationChange]
  );

  const endEdgeValidation = useCallback(() => {
    setValidationState(null);
    onValidationChange?.(null);
  }, [onValidationChange]);

  return {
    validationState,
    validateConnection,
    startEdgeValidation,
    endEdgeValidation,
  };
};
