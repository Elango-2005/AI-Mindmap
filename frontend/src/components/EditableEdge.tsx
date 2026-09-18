import { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { deleteEdge } from '@/api/edges';
import { Icon } from '@/components/Icon';
import { toast } from 'sonner';

export function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  animated,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = async () => {
    try {
      await deleteEdge(id);
      setEdges((edges) => edges.filter((e) => e.id !== id));
      toast.success("Connection removed");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove connection");
    }
  };

  const showActions = selected || isHovered;

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd as string} 
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? 'var(--color-primary)' : (isHovered ? 'var(--color-primary)' : 'var(--color-outline-variant)'),
          opacity: 0.8,
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
        }} 
        className={animated ? "animate-pulse-edge" : ""}
      />
      {/* Invisible interaction path for easier clicking and hover detection */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={30}
        className="react-flow__edge-interaction cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: showActions ? 'all' : 'none',
            opacity: showActions ? 1 : 0,
            transition: 'opacity 0.2s',
            zIndex: 1000,
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            className="w-6 h-6 bg-surface border border-outline-variant rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:border-error hover:bg-error-container shadow-sm transition-colors cursor-pointer group"
            onClick={(event) => {
              event.stopPropagation();
              handleDelete();
            }}
            title="Delete connection"
          >
            <Icon name="close" className="text-[14px]" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
