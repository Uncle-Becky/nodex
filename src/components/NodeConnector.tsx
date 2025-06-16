import React from 'react';
import type { DataType, NodePort } from '../types/nodes';

interface NodeConnectorProps {
  port: NodePort;
  isDragging: boolean;
  isValidTarget: boolean;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
}

export const NodeConnector: React.FC<NodeConnectorProps> = ({
  port,
  isDragging,
  isValidTarget,
  onMouseDown,
  onMouseUp,
}) => {
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
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    />
  );
};

export const getTypeColor = (type: DataType): string => {
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

  return typeColors[type];
};
