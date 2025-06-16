import React from 'react';
import type { DataType, NodePort } from '../types/nodes';
import { getTypeColor } from './NodeConnector';

export interface EdgeValidationState {
  sourceNode: string;
  sourcePort: string;
  sourceType: DataType;
  validTargets: Set<string>; // Set of valid target node IDs
  validPorts: Set<string>; // Set of valid target port IDs
}

export const NodeConnectorComponent: React.FC<{
  port: NodePort;
  isDragging: boolean;
  isValidTarget: boolean;
}> = ({ port, isDragging, isValidTarget }) => {
  const getConnectorStyle = () => {
    const baseStyle = {
      // Base connector styles
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      border: '2px solid',
      transition: 'all 0.2s ease',
    };

    const typeColors = {
      text: '#3B82F6', // blue
      json: '#10B981', // green
      image: '#8B5CF6', // purple
      number: '#F97316', // orange
      boolean: '#EF4444', // red
      array: '#FBBF24', // yellow
      stream: '#06B6D4', // cyan
      any: '#6B7280', // gray
    };

    return {
      ...baseStyle,
      backgroundColor: typeColors[port.type],
      opacity: isDragging ? (isValidTarget ? 1 : 0.3) : 1,
      transform: isDragging && isValidTarget ? 'scale(1.2)' : 'scale(1)',
      cursor: isDragging
        ? isValidTarget
          ? 'pointer'
          : 'not-allowed'
        : 'pointer',
    };
  };

  return (
    <div
      className='node-connector'
      style={getConnectorStyle()}
      title={`${port.label}: ${port.type}`}
    />
  );
};

export const EdgePreview: React.FC<{
  sourceType: DataType;
  isValid: boolean;
}> = ({ sourceType, isValid }) => {
  return (
    <div
      className={`edge-preview ${isValid ? 'valid' : 'invalid'}`}
      style={{
        stroke: getTypeColor(sourceType),
        strokeDasharray: isValid ? 'none' : '5,5',
        opacity: isValid ? 1 : 0.5,
      }}
    />
  );
};

export const ConnectionTooltip: React.FC<{
  sourceType: DataType;
  targetType: DataType;
  isValid: boolean;
}> = ({ sourceType, targetType, isValid }) => {
  const getMessage = () => {
    if (isValid) {
      return `Valid connection: ${sourceType} → ${targetType}`;
    }
    return `Invalid connection: Cannot connect ${sourceType} to ${targetType}`;
  };

  return (
    <div className={`connection-tooltip ${isValid ? 'valid' : 'invalid'}`}>
      {getMessage()}
    </div>
  );
};
