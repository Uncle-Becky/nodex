import React from 'react';
import { useEdgeValidation } from '../hooks/useEdgeValidations';
import { useGraphStore } from '../store/useGraphStore';
import type { EdgeValidationState, NodePort } from '../types/nodes';
import { NodeConnector } from './NodeConnector';

interface NodeProps {
  data: {
    label: string;
    inputs?: NodePort[];
    outputs?: NodePort[];
    [key: string]: unknown;
  };
  id: string;
}

export const Node: React.FC<NodeProps> = ({ data, id }) => {
  const { validationState, startEdgeValidation, endEdgeValidation } =
    useEdgeValidation({
      nodes: useGraphStore(state => state.nodes),
      onValidationChange: (_state: EdgeValidationState | null) => {
        // Update UI based on validation state
      },
    });

  const handlePortMouseDown = (port: NodePort, isOutput: boolean) => {
    if (isOutput) {
      startEdgeValidation(id, port.id);
    }
  };

  const handlePortMouseUp = (port: NodePort, isOutput: boolean) => {
    if (isOutput) {
      endEdgeValidation();
    }
  };

  return (
    <div className='node'>
      {/* Input ports */}
      <div className='input-ports'>
        {data.inputs?.map(port => (
          <NodeConnector
            key={port.id}
            port={port}
            isDragging={!!validationState}
            isValidTarget={validationState?.validPorts.has(port.id) ?? false}
            onMouseDown={() => handlePortMouseDown(port, false)}
            onMouseUp={() => handlePortMouseUp(port, false)}
          />
        ))}
      </div>

      {/* Node content */}
      <div className='node-content'>{data.label}</div>

      {/* Output ports */}
      <div className='output-ports'>
        {data.outputs?.map(port => (
          <NodeConnector
            key={port.id}
            port={port}
            isDragging={validationState?.sourcePort === port.id}
            isValidTarget={false}
            onMouseDown={() => handlePortMouseDown(port, true)}
            onMouseUp={() => handlePortMouseUp(port, true)}
          />
        ))}
      </div>
    </div>
  );
};
