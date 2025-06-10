import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { memo, useMemo } from 'react';

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

// Memoized component for better performance
export const DataEdge = memo<EdgeProps>(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    selected,
    sourceHandleId,
    targetHandleId,
  }) => {
    const { getNode } = useReactFlow();

    // Memoize calculations to prevent unnecessary recalculations
    const { sourceNode, edgePath, labelX, labelY, value, displayValue, label } =
      useMemo(() => {
        // Get source node using proper source ID from edge
        const sourceNodeId = id.split('-to-')[0] || id.split('->')[0] || '';
        const sourceNode = getNode(sourceNodeId);

        // Type guard for data
        const edgeData = data as DataEdgeData | undefined;

        // Get the value from the source node's data using the specified key
        const value: unknown = sourceNode?.data?.[edgeData?.key ?? ''];
        const displayValue = edgeData?.formatValue
          ? edgeData.formatValue(value)
          : String(value ?? 'N/A');
        const label = edgeData?.label ?? edgeData?.key ?? 'Data';

        const [edgePath, labelX, labelY] = getStraightPath({
          sourceX,
          sourceY,
          targetX,
          targetY,
        });

        return {
          sourceNode,
          edgePath,
          labelX,
          labelY,
          value,
          displayValue,
          label,
        };
      }, [id, sourceX, sourceY, targetX, targetY, data, getNode]);

    // Determine edge style based on data availability and type
    const edgeStyle = useMemo(() => {
      const hasValidData = value !== undefined && value !== null;
      const isSelected = selected;

      return {
        stroke: isSelected ? '#667eea' : hasValidData ? '#10b981' : '#64748b',
        strokeWidth: isSelected ? 3 : 2,
        strokeDasharray: (data as DataEdgeData)?.showValue ? '5,5' : 'none',
        strokeOpacity: hasValidData ? 1 : 0.5,
      };
    }, [selected, value, data]);

    // Validate connection compatibility
    const isValidConnection = useMemo(() => {
      const sourceNode = getNode(id.split('-to-')[0] || '');
      const targetNode = getNode(id.split('-to-')[1] || '');

      return (
        sourceNode &&
        targetNode &&
        sourceNode.data &&
        (data as DataEdgeData)?.key in
          (sourceNode.data as Record<string, unknown>)
      );
    }, [id, data, getNode]);

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={edgeStyle}
          markerEnd={
            isValidConnection ? 'url(#data-marker)' : 'url(#invalid-marker)'
          }
        />

        {/* Enhanced Edge Label with better styling */}
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            className={`
              glass rounded-lg px-3 py-2 text-xs font-mono border border-white/30 
              backdrop-blur-sm shadow-lg transition-all duration-200
              ${selected ? 'ring-2 ring-blue-400' : ''}
              ${isValidConnection ? 'bg-white/90' : 'bg-red-50/90'}
            `}
            role='tooltip'
            aria-label={`Data edge from ${sourceHandleId} to ${targetHandleId}: ${label} = ${displayValue}`}
          >
            <div className='flex flex-col items-center gap-1'>
              <div className='flex items-center gap-2'>
                <span
                  className={`
                  font-medium
                  ${isValidConnection ? 'text-gray-700' : 'text-red-600'}
                `}
                >
                  {label}
                </span>
                {!isValidConnection && (
                  <span
                    className='text-red-500 text-xs'
                    title='Invalid connection'
                  >
                    ⚠️
                  </span>
                )}
              </div>

              {(data as DataEdgeData)?.showValue && (
                <div className='flex items-center gap-1'>
                  <span
                    className={`
                    font-bold px-2 py-1 rounded text-xs
                    ${
                      isValidConnection
                        ? 'text-emerald-700 bg-emerald-100'
                        : 'text-red-700 bg-red-100'
                    }
                  `}
                  >
                    {displayValue}
                  </span>
                  {value !== undefined && typeof value === 'number' && (
                    <div className='text-xs text-gray-500'>
                      {typeof value === 'number' ? '📊' : '📝'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>

        {/* Add custom markers for valid/invalid connections */}
        <defs>
          <marker
            id='data-marker'
            viewBox='0 0 10 10'
            refX='9'
            refY='3'
            markerUnits='strokeWidth'
            markerWidth='10'
            markerHeight='10'
            orient='auto'
          >
            <path d='M0,0 L0,6 L9,3 z' fill='#10b981' />
          </marker>
          <marker
            id='invalid-marker'
            viewBox='0 0 10 10'
            refX='9'
            refY='3'
            markerUnits='strokeWidth'
            markerWidth='10'
            markerHeight='10'
            orient='auto'
          >
            <path d='M0,0 L0,6 L9,3 z' fill='#ef4444' />
          </marker>
        </defs>
      </>
    );
  }
);

DataEdge.displayName = 'DataEdge';
