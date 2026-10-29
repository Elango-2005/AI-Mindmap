import { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { deleteEdge, updateEdge } from '@/api/edges';
import { Icon } from '@/components/Icon';
import { toast } from 'sonner';
import { type SemanticEdgeType } from '@/types/semanticGraph';

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
  data,
  label,
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

  const edgeType: SemanticEdgeType =
    (data?.["edgeType"] as SemanticEdgeType) ||
    (data?.["isAiSuggestion"] ? "ai_suggestion" : style.strokeDasharray ? "relationship" : "hierarchy");

  const isHierarchy = edgeType === "hierarchy";
  const isRelationship = edgeType === "relationship";
  const isSuggestion = edgeType === "ai_suggestion" || Boolean(data?.["isAiSuggestion"]);

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

  const handleAcceptSuggestion = async () => {
    try {
      await updateEdge(id, { type: "relationship" });
      setEdges((edges) =>
        edges.map((e) =>
          e.id === id
            ? {
                ...e,
                data: { ...(e.data || {}), edgeType: "relationship" },
                animated: false,
              }
            : e
        )
      );
      toast.success("Accepted AI suggestion as relationship");
    } catch (err) {
      console.error(err);
      toast.error("Failed to accept suggestion");
    }
  };

  const showActions = selected || isHovered;
  // Hierarchy edges must NOT have labels; only relationships and suggestions display semantic labels
  const rawLabel = (label as string) || (data?.["label"] as string);
  const effectiveLabel = isHierarchy ? null : rawLabel;

  // Compute stroke styling based on edge type
  let baseStroke = style.stroke || "var(--color-outline-variant)";
  let strokeDasharray = style.strokeDasharray;
  let strokeWidth = selected ? 3 : (style.strokeWidth || 2);
  let isAnimated = animated || isSuggestion;

  if (isRelationship) {
    baseStroke = selected ? "var(--color-primary)" : (style.stroke || "#0284c7");
    strokeDasharray = strokeDasharray || "5, 5";
    strokeWidth = selected ? 2.5 : 1.75;
  } else if (isSuggestion) {
    baseStroke = selected ? "#7c3aed" : "#8b5cf6";
    strokeDasharray = "4, 4";
    strokeWidth = selected ? 2.5 : 2;
    isAnimated = true;
  } else if (isHierarchy) {
    baseStroke = selected ? "var(--color-primary)" : (style.stroke || "var(--color-primary)");
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        {...(!isHierarchy && markerEnd ? { markerEnd } : {})}
        style={{
          ...style,
          strokeWidth,
          stroke: isHovered ? "var(--color-primary)" : baseStroke,
          strokeDasharray,
          opacity: isHierarchy ? 0.8 : 0.85,
          strokeLinecap: "round",
          transition: "stroke 0.2s ease, stroke-width 0.2s ease, opacity 0.2s ease",
        }}
        className={isAnimated ? "animate-pulse-edge" : ""}
      />

      {/* Interaction hover zone */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={24}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: effectiveLabel || showActions ? "all" : "none",
            zIndex: 1000,
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {effectiveLabel ? (
            <div
              className={`group/badge flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all shadow-xs backdrop-blur-md select-none ${
                isSuggestion
                  ? "bg-violet-50/95 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-300/80 dark:border-violet-700/60"
                  : "bg-surface/95 dark:bg-surface-container-lowest/90 text-on-surface-variant border border-outline-variant/60 shadow-2xs"
              }`}
              style={
                !isSuggestion && baseStroke
                  ? { borderColor: `${baseStroke}50`, color: baseStroke }
                  : undefined
              }
            >
              {isSuggestion && (
                <Icon name="auto_awesome" className="text-[12px] text-violet-600 dark:text-violet-400 shrink-0" />
              )}
              <span className="max-w-[150px] truncate">{effectiveLabel}</span>
              {isSuggestion && showActions && (
                <button
                  className="w-4 h-4 rounded-full flex items-center justify-center text-accent-violet hover:bg-accent-violet hover:text-white transition-colors cursor-pointer ml-0.5"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleAcceptSuggestion();
                  }}
                  title="Accept AI connection"
                >
                  <Icon name="check" className="text-[10px]" />
                </button>
              )}
              {showActions && (
                <button
                  className="w-4 h-4 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container transition-colors cursor-pointer ml-0.5"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete();
                  }}
                  title="Remove connection"
                >
                  <Icon name="close" className="text-[10px]" />
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                opacity: showActions ? 1 : 0,
                transition: "opacity 0.2s",
              }}
            >
              {isSuggestion ? (
                <div className="flex items-center gap-1 bg-surface border border-accent-violet/30 rounded-full p-0.5 shadow-sm">
                  <button
                    className="w-5 h-5 rounded-full flex items-center justify-center text-accent-violet hover:bg-accent-violet hover:text-white transition-colors cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAcceptSuggestion();
                    }}
                    title="Accept AI connection"
                  >
                    <Icon name="check" className="text-[12px]" />
                  </button>
                  <button
                    className="w-5 h-5 rounded-full flex items-center justify-center text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete();
                    }}
                    title="Dismiss connection"
                  >
                    <Icon name="close" className="text-[12px]" />
                  </button>
                </div>
              ) : (
                <button
                  className="w-6 h-6 bg-surface border border-outline-variant rounded-full flex items-center justify-center text-on-surface-variant hover:text-error hover:border-error hover:bg-error-container shadow-sm transition-colors cursor-pointer group"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete();
                  }}
                  title="Remove connection"
                >
                  <Icon name="close" className="text-[14px]" />
                </button>
              )}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
