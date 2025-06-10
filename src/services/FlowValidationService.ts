import type { Edge, Node } from '@xyflow/react';
import type { ValidationIssue, ValidationResult } from '../types/components';
import { eventBus } from '../utils/eventBus';

export class FlowValidationService {
  private static instance: FlowValidationService;

  private constructor() {}

  public static getInstance(): FlowValidationService {
    if (!FlowValidationService.instance) {
      FlowValidationService.instance = new FlowValidationService();
    }
    return FlowValidationService.instance;
  }

  /**
   * Validate an entire flow
   */
  public validateFlow(nodes: Node[], edges: Edge[]): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Validate nodes
    nodes.forEach(node => {
      const nodeIssues = this.validateNode(node);
      issues.push(...nodeIssues);
    });

    // Validate edges
    edges.forEach(edge => {
      const edgeIssues = this.validateEdge(edge, nodes);
      issues.push(...edgeIssues);
    });

    // Validate flow integrity
    const flowIssues = this.validateFlowIntegrity(nodes, edges);
    issues.push(...flowIssues);

    const isValid = !issues.some(issue => issue.severity === 'error');

    // Publish validation result
    eventBus.publish({
      id: `validation-${Date.now()}`,
      type: 'FLOW_VALIDATION_RESULT',
      timestamp: Date.now(),
      source: 'flow-validation-service',
      target: 'app',
      payload: {
        isValid,
        issues,
      },
    });

    return {
      isValid,
      issues,
    };
  }

  /**
   * Validate a specific node
   */
  private validateNode(node: Node): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if node has a type
    if (!node.type) {
      issues.push({
        id: `node-missing-type-${node.id}`,
        type: 'node',
        targetId: node.id,
        message: 'Node is missing a type',
        severity: 'error',
        code: 'NODE_MISSING_TYPE',
      });
    }

    // Check if node has required data based on its type
    if (node.type) {
      switch (node.type) {
        case 'agent':
        case 'advanced':
          if (!node.data?.label) {
            issues.push({
              id: `node-missing-label-${node.id}`,
              type: 'node',
              targetId: node.id,
              message: 'Agent node is missing a label',
              severity: 'warning',
              code: 'NODE_MISSING_LABEL',
            });
          }

          if (!node.data?.agentType) {
            issues.push({
              id: `node-missing-agent-type-${node.id}`,
              type: 'node',
              targetId: node.id,
              message: 'Agent node is missing an agent type',
              severity: 'error',
              code: 'NODE_MISSING_AGENT_TYPE',
            });
          }
          break;

        case 'llm_chat':
          if (!node.data?.model) {
            issues.push({
              id: `node-missing-model-${node.id}`,
              type: 'node',
              targetId: node.id,
              message: 'LLM node is missing a model',
              severity: 'error',
              code: 'NODE_MISSING_MODEL',
            });
          }
          break;

        case 'code_executor':
          if (!node.data?.code || node.data.code === '') {
            issues.push({
              id: `node-missing-code-${node.id}`,
              type: 'node',
              targetId: node.id,
              message: 'Code executor node is missing code',
              severity: 'error',
              code: 'NODE_MISSING_CODE',
            });
          }
          break;
      }
    }

    return issues;
  }

  /**
   * Validate a specific edge
   */
  private validateEdge(edge: Edge, nodes: Node[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if source node exists
    if (!nodes.some(node => node.id === edge.source)) {
      issues.push({
        id: `edge-invalid-source-${edge.id}`,
        type: 'edge',
        targetId: edge.id,
        message: `Edge references non-existent source node: ${edge.source}`,
        severity: 'error',
        code: 'EDGE_INVALID_SOURCE',
      });
    }

    // Check if target node exists
    if (!nodes.some(node => node.id === edge.target)) {
      issues.push({
        id: `edge-invalid-target-${edge.id}`,
        type: 'edge',
        targetId: edge.id,
        message: `Edge references non-existent target node: ${edge.target}`,
        severity: 'error',
        code: 'EDGE_INVALID_TARGET',
      });
    }

    return issues;
  }

  /**
   * Validate the integrity of the flow
   */
  private validateFlowIntegrity(
    nodes: Node[],
    edges: Edge[]
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();

    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    nodes.forEach(node => {
      if (!connectedNodeIds.has(node.id)) {
        issues.push({
          id: `node-disconnected-${node.id}`,
          type: 'node',
          targetId: node.id,
          message: 'Node is disconnected from the flow',
          severity: 'warning',
          code: 'NODE_DISCONNECTED',
        });
      }
    });

    // Check for cycles
    const hasCycle = this.detectCycle(nodes, edges);
    if (hasCycle) {
      issues.push({
        id: `flow-has-cycle`,
        type: 'flow',
        message: 'Flow contains a cycle',
        severity: 'warning',
        code: 'FLOW_HAS_CYCLE',
      });
    }

    // Check for multiple entry points
    const entryPoints = nodes.filter(
      node => !edges.some(edge => edge.target === node.id)
    );

    if (entryPoints.length > 1) {
      issues.push({
        id: 'flow-multiple-entry-points',
        type: 'flow',
        message: `Flow has multiple entry points (${entryPoints.length})`,
        severity: 'info',
        code: 'FLOW_MULTIPLE_ENTRY_POINTS',
      });
    }

    // Check for multiple exit points
    const exitPoints = nodes.filter(
      node => !edges.some(edge => edge.source === node.id)
    );

    if (exitPoints.length > 1) {
      issues.push({
        id: 'flow-multiple-exit-points',
        type: 'flow',
        message: `Flow has multiple exit points (${exitPoints.length})`,
        severity: 'info',
        code: 'FLOW_MULTIPLE_EXIT_POINTS',
      });
    }

    return issues;
  }

  /**
   * Detect if there is a cycle in the flow
   */
  private detectCycle(nodes: Node[], edges: Edge[]): boolean {
    const adjacencyList: Record<string, string[]> = {};

    // Build adjacency list
    nodes.forEach(node => {
      adjacencyList[node.id] = [];
    });

    edges.forEach(edge => {
      if (adjacencyList[edge.source]) {
        adjacencyList[edge.source].push(edge.target);
      }
    });

    // DFS to detect cycle
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (!visited.has(nodeId)) {
        visited.add(nodeId);
        recursionStack.add(nodeId);

        for (const neighbor of adjacencyList[nodeId] || []) {
          if (!visited.has(neighbor) && hasCycle(neighbor)) {
            return true;
          } else if (recursionStack.has(neighbor)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of Object.keys(adjacencyList)) {
      if (!visited.has(nodeId) && hasCycle(nodeId)) {
        return true;
      }
    }

    return false;
  }
}
