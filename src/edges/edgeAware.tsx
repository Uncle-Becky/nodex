import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { EdgeData } from '../types/agents';

export const edgeAware = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps) => {
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY });

  // Defensive: data may be undefined
  const edgeData = data as EdgeData | undefined;
  const confidence =
    typeof edgeData?.['confidence'] === 'number' ? edgeData['confidence'] : 1;
  const stroke =
    confidence > 0.7 ? '#4ade80' : confidence > 0.4 ? '#facc15' : '#f87171';

  return (
    <>
      <BaseEdge id={id} path={path} style={{ stroke, strokeWidth: 2 }} />
      <EdgeLabelRenderer>
        <div style={{ pointerEvents: 'all', fontSize: 10, color: stroke }}>
          {confidence.toFixed(2)}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
