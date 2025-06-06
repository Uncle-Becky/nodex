import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { memo } from 'react';

export type DataEdgeData = {
  key: string;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: unknown) => string;
};

export type DataEdgeType = {
  id: string;
  source: string;
  target: string;
  type: 'dataEdge';
  data: DataEdgeData;
} & Partial<EdgeProps>;

export const DataEdge = memo<EdgeProps>(
  ({ id, sourceX, sourceY, targetX, targetY, data, selected }) => {
    const { getNode } = useReactFlow();
    // Get source node
    const sourceNode = getNode(String(id).split('->')[0]!);

    // Type guard for data
    const edgeData = data as DataEdgeData | undefined;

    // Get the value from the source node's data using the specified key
    const value: unknown = sourceNode?.data?.[edgeData?.key ?? ''];
    const displayValue = edgeData?.formatValue
      ? edgeData.formatValue(value)
      : String(value ?? '');
    const label = edgeData?.label ?? edgeData?.key;

    const [edgePath, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: selected ? '#667eea' : '#64748b',
            strokeWidth: selected ? 3 : 2,
            strokeDasharray: edgeData?.showValue ? '5,5' : 'none',
          }}
          markerEnd='url(#data-marker)'
        />
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
            }}
            className='glass rounded-lg px-2 py-1 text-xs font-mono border border-white/30 backdrop-blur-sm'
          >
            <div className='flex flex-col items-center gap-1'>
              <span className='text-white/70 font-medium'>{label}</span>
              {edgeData?.showValue && (
                <span className='text-neural-300 font-bold bg-neural-900/50 px-1 rounded'>
                  {displayValue}
                </span>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);

DataEdge.displayName = 'DataEdge';
