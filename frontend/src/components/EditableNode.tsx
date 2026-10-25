import { useState, useRef, useEffect } from "react";

import { Handle, Position, useReactFlow, NodeToolbar } from "@xyflow/react";

import { updateNode, createNode, deleteNode, expandNode, summarizeNode } from "@/api/nodes";

import { createEdge } from "@/api/edges";

import { DEFAULT_THEME } from "@/lib/graphColoring";

import { Icon } from "@/components/Icon";

import { toast } from "sonner";

import {

  ContextMenu,

  ContextMenuContent,

  ContextMenuItem,

  ContextMenuSeparator,

  ContextMenuTrigger,

} from "@/components/ui/context-menu";

import { resolveNodeVisualConfig, normalizeSemanticType } from "@/lib/semanticAdapter";
import { applyLayout, type LayoutDirection } from "@/lib/layoutAlgorithms";

import type { SemanticNodeType } from "@/types/semanticGraph";



export function EditableNode({

  id,

  data,

  selected,

  positionAbsoluteX,

  positionAbsoluteY,

  sourcePosition,

  targetPosition,

}: any) {

  const effectiveTargetPos = targetPosition || (sourcePosition === Position.Right ? Position.Left : Position.Top);

  const effectiveSourcePos = sourcePosition || (targetPosition === Position.Left ? Position.Right : Position.Bottom);

  const [isEditing, setIsEditing] = useState(false);

  const [editValue, setEditValue] = useState(data.label);

  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const { setNodes, setEdges, getEdges, getNodes } = useReactFlow();

  const inputRef = useRef<HTMLInputElement>(null);



  useEffect(() => {

    if (data.isNew) {

      setIsEditing(true);

      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, isNew: false } } : n)));

    }

  }, [data.isNew, id, setNodes]);



  const depth = data.depth !== undefined ? data.depth : 1;

  const theme = data.theme || DEFAULT_THEME;



  useEffect(() => {

    setEditValue(data.label);

  }, [data.label]);



  useEffect(() => {

    if (isEditing && inputRef.current) {

      inputRef.current.focus();

      inputRef.current.select();

    }

  }, [isEditing]);



  useEffect(() => {

    if (!selected || isEditing) return;



    const handleGlobalKeyDown = (e: KeyboardEvent) => {

      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

      if (e.key === "Tab") {

        e.preventDefault();

        handleAddChild();

      } else if (e.key === "Enter") {

        e.preventDefault();

        handleAddSibling();

      }

    };



    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => window.removeEventListener("keydown", handleGlobalKeyDown);

  }, [selected, isEditing, data.mindMapId, id, depth, theme, positionAbsoluteX, positionAbsoluteY]);



  const pushSnapshot = () => {

    setTimeout(() => {

      if (data.onPushHistory) data.onPushHistory(getNodes(), getEdges());

    }, 50);

  };



  async function handleSave() {

    setIsEditing(false);

    const newLabel = editValue.trim();

    if (newLabel === data.label || newLabel === "") {

      setEditValue(data.label);

      return;

    }



    const semanticType = data.semanticType || normalizeSemanticType(undefined, depth, newLabel);

    const updatedVisual = resolveNodeVisualConfig(

      {

        id,

        mindMapId: data.mindMapId,

        title: newLabel,

        type: semanticType,

        depth,

        parentId: data.parentId || null,

        branchId: data.branchId || null,

        position: { x: positionAbsoluteX, y: positionAbsoluteY },

        importanceScore: data.importance_score ?? 1.0,

      },

      theme,

      selected

    );



    setNodes((nds) =>

      nds.map((n) =>

        n.id === id

          ? {

              ...n,

              data: {

                ...n.data,

                label: newLabel,

                semanticType,

                visualConfig: updatedVisual,

              },

            }

          : n

      )

    );



    try {

      await updateNode(id, { label: newLabel, type: semanticType });

      if (data.onBroadcastUpdate) {

        data.onBroadcastUpdate(id, { label: newLabel, type: semanticType });

      }

      pushSnapshot();

    } catch (err) {

      console.error("Failed to update node label:", err);

      toast.error("Failed to rename node.");

      setNodes((nds) =>

        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: data.label } } : n))

      );

      setEditValue(data.label);

    }

  }



  function handleKeyDown(e: React.KeyboardEvent) {

    if (e.key === "Enter") {

      handleSave();

    } else if (e.key === "Escape") {

      setIsEditing(false);

      setEditValue(data.label);

    }

  }



  const handleToggleTask = async () => {

    const raw = data.label || "";

    let nextLabel = raw;

    let nextStatus: "todo" | "done" = "done";



    if (raw.startsWith("[ ]")) {

      nextLabel = raw.replace(/^\[ \]\s*/, "[x] ");

      nextStatus = "done";

    } else if (raw.startsWith("[x]") || raw.startsWith("[X]")) {

      nextLabel = raw.replace(/^\[[xX]\]\s*/, "[ ] ");

      nextStatus = "todo";

    } else {

      const currentlyDone = visualConfig?.isCompleted || data.metadata?.status === "done";

      nextStatus = currentlyDone ? "todo" : "done";

      nextLabel = currentlyDone ? `[ ] ${raw}` : `[x] ${raw}`;

    }



    setNodes((nds) =>

      nds.map((n) => {

        if (n.id === id) {

          const nData = n.data as any;

          const updatedVisual = nData?.visualConfig

            ? {

                ...nData.visualConfig,

                isCompleted: nextStatus === "done",

                iconName: nextStatus === "done" ? "check_box" : "check_box_outline_blank",

              }

            : undefined;

          return {

            ...n,

            data: {

              ...nData,

              label: nextLabel,

              visualConfig: updatedVisual,

              metadata: { ...(nData?.metadata || {}), status: nextStatus },

            },

          };

        }

        return n;

      })

    );



    if (data.mindMapId) {

      try {

        await updateNode(id, { label: nextLabel });

        if (data.onBroadcastUpdate) {

          data.onBroadcastUpdate(id, { label: nextLabel });

        }

        pushSnapshot();

      } catch (err) {

        console.error("Failed to toggle task", err);

      }

    }

  };



  const handleAcceptSuggestion = async () => {

    if (!data.mindMapId) return;

    try {

      const newType: SemanticNodeType = depth === 1 ? "topic" : "concept";

      await updateNode(id, { type: newType });

      if (data.onBroadcastUpdate) {

        data.onBroadcastUpdate(id, { type: newType });

      }



      setNodes((nds) =>

        nds.map((n) => {

          if (n.id === id) {

            const nData = n.data as any;

            const updatedVisual = resolveNodeVisualConfig(

              {

                id,

                mindMapId: data.mindMapId,

                title: String(nData?.label || ""),

                type: newType,

                depth,

                parentId: (nData?.parentId as string) || null,

                branchId: (nData?.branchId as string) || null,

                position: n.position,

                importanceScore: (nData?.importance_score as number) ?? 1.0,

              },

              theme,

              selected

            );

            return {

              ...n,

              data: {

                ...nData,

                semanticType: newType,

                visualConfig: updatedVisual,

              },

            };

          }

          return n;

        })

      );

      pushSnapshot();

      toast.success("AI suggestion accepted as permanent node");

    } catch (err) {

      console.error(err);

      toast.error("Failed to accept suggestion");

    }

  };



  async function handleAddChild() {

    if (!data.mindMapId) {

      toast.error("Missing mind map ID");

      return;

    }

    try {

      const childDepth = depth + 1;

      const childType: SemanticNodeType = childDepth === 1 ? "topic" : "concept";

      const branchId = data.branchId || (childDepth === 1 ? undefined : id);



      const newNode = await createNode(data.mindMapId, {

        label: "New Node",

        type: childType,

        position_x: positionAbsoluteX,

        position_y: positionAbsoluteY + 120,

      });

      const newEdge = await createEdge(data.mindMapId, {

        source: id,

        target: newNode.id,

      });



      const visualConfig = resolveNodeVisualConfig(

        {

          id: newNode.id,

          mindMapId: data.mindMapId,

          title: newNode.label,

          type: childType,

          depth: childDepth,

          parentId: id,

          branchId: branchId || newNode.id,

          position: { x: newNode.position_x, y: newNode.position_y },

          importanceScore: newNode.importance_score ?? 1.0,

        },

        theme,

        true

      );



      if (data.onBroadcastCreate) {

        data.onBroadcastCreate(newNode, newEdge);

      }



      setNodes((nds) => [

        ...nds.map((n) => ({ ...n, selected: false })),

        {

          id: newNode.id,

          type: "editable",

          position: { x: newNode.position_x, y: newNode.position_y },

          selected: true,

          data: {

            label: newNode.label,

            semanticType: childType,

            visualConfig,

            mindMapId: data.mindMapId,

            depth: childDepth,

            parentId: id,

            branchId: branchId || newNode.id,

            theme: {

              bg: visualConfig.bgClasses,

              border: visualConfig.borderClasses,

              text: visualConfig.textColorClasses,

              stroke: "#6366f1",

            },

            isNew: true,

            importance_score: newNode.importance_score ?? 1.0,

            onPushHistory: data.onPushHistory,

            onDelete: data.onDelete,

            onRegenerate: data.onRegenerate,

            onBroadcastUpdate: data.onBroadcastUpdate,

            onBroadcastCreate: data.onBroadcastCreate,

          },

        },

      ]);

      setEdges((eds) => [

        ...eds,

        {

          id: newEdge.id,

          source: id,

          target: newNode.id,

          type: "editable",

        },

      ]);

      pushSnapshot();

    } catch (e) {

      console.error(e);

      toast.error("Failed to add child node.");

    }

  }



  async function handleAddSibling() {

    if (!data.mindMapId) return;

    const edges = getEdges();

    const parentEdge = edges.find((e) => e.target === id);

    if (!parentEdge) {

      toast.error("Cannot add sibling to the root node.");

      return;

    }

    try {

      const siblingType: SemanticNodeType = data.semanticType || (depth === 1 ? "topic" : "concept");

      const branchId = data.branchId || (depth === 1 ? undefined : parentEdge.source);



      const newNode = await createNode(data.mindMapId, {

        label: "New Node",

        type: siblingType,

        position_x: positionAbsoluteX + 220,

        position_y: positionAbsoluteY,

      });

      const newEdge = await createEdge(data.mindMapId, {

        source: parentEdge.source,

        target: newNode.id,

      });



      const visualConfig = resolveNodeVisualConfig(

        {

          id: newNode.id,

          mindMapId: data.mindMapId,

          title: newNode.label,

          type: siblingType,

          depth,

          parentId: parentEdge.source,

          branchId: branchId || newNode.id,

          position: { x: newNode.position_x, y: newNode.position_y },

          importanceScore: newNode.importance_score ?? 1.0,

        },

        theme,

        true

      );



      if (data.onBroadcastCreate) {

        data.onBroadcastCreate(newNode, newEdge);

      }



      setNodes((nds) => [

        ...nds.map((n) => ({ ...n, selected: false })),

        {

          id: newNode.id,

          type: "editable",

          position: { x: newNode.position_x, y: newNode.position_y },

          selected: true,

          data: {

            label: newNode.label,

            semanticType: siblingType,

            visualConfig,

            mindMapId: data.mindMapId,

            depth,

            parentId: parentEdge.source,

            branchId: branchId || newNode.id,

            theme: {

              bg: visualConfig.bgClasses,

              border: visualConfig.borderClasses,

              text: visualConfig.textColorClasses,

              stroke: "#6366f1",

            },

            isNew: true,

            importance_score: newNode.importance_score ?? 1.0,

            onPushHistory: data.onPushHistory,

            onDelete: data.onDelete,

            onRegenerate: data.onRegenerate,

            onBroadcastUpdate: data.onBroadcastUpdate,

            onBroadcastCreate: data.onBroadcastCreate,

          },

        },

      ]);

      setEdges((eds) => [

        ...eds,

        {

          id: newEdge.id,

          source: parentEdge.source,

          target: newNode.id,

          type: "editable",

        },

      ]);

      pushSnapshot();

    } catch (e) {

      console.error(e);

      toast.error("Failed to add sibling node.");

    }

  }



  const handleDelete = async () => {

    if (data.onDelete) {

      data.onDelete(id);

    }

  };



  const handleDuplicate = async () => {

    if (!data.mindMapId) return;

    try {

      const newNode = await createNode(data.mindMapId, {

        label: `${data.label} (Copy)`,

        type: data.semanticType || "concept",

        position_x: positionAbsoluteX + 150,

        position_y: positionAbsoluteY + 50,

      });



      const edges = getEdges();

      const parentEdge = edges.find((e) => e.target === id);

      let newEdge: any = null;

      if (parentEdge) {

        newEdge = await createEdge(data.mindMapId, {

          source: parentEdge.source,

          target: newNode.id,

        });

        setEdges((eds) => [

          ...eds,

          {

            id: newEdge.id,

            source: parentEdge.source,

            target: newNode.id,

            type: "editable",

          },

        ]);

      }



      if (data.onBroadcastCreate) {

        data.onBroadcastCreate(newNode, newEdge);

      }



      const visualConfig = resolveNodeVisualConfig(

        {

          id: newNode.id,

          mindMapId: data.mindMapId,

          title: newNode.label,

          type: (data.semanticType as SemanticNodeType) || "concept",

          depth,

          parentId: parentEdge ? parentEdge.source : null,

          branchId: data.branchId || null,

          position: { x: newNode.position_x, y: newNode.position_y },

          importanceScore: data.importance_score ?? 1.0,

        },

        theme,

        false

      );



      setNodes((nds) => [

        ...nds,

        {

          id: newNode.id,

          type: "editable",

          position: { x: newNode.position_x, y: newNode.position_y },

          data: {

            label: newNode.label,

            semanticType: data.semanticType || "concept",

            visualConfig,

            mindMapId: data.mindMapId,

            depth,

            parentId: parentEdge ? parentEdge.source : null,

            branchId: data.branchId || null,

            theme,

            isNew: false,

            onPushHistory: data.onPushHistory,

            onDelete: data.onDelete,

            onRegenerate: data.onRegenerate,

            onBroadcastUpdate: data.onBroadcastUpdate,

            onBroadcastCreate: data.onBroadcastCreate,

          },

        },

      ]);

      pushSnapshot();

      toast.success("Node duplicated");

    } catch (e) {

      console.error(e);

      toast.error("Failed to duplicate node.");

    }

  };



  const handleAIExpand = async () => {

    setIsProcessingAI(true);

    try {

      toast.info("AI is expanding this branch...");

      const res = await expandNode(id);



      const newNodes = res.nodes.map((n: any) => {

        const nDepth = depth + 1;

        const nType = normalizeSemanticType(n.type, nDepth, n.label);

        const bId = data.branchId || (nDepth === 1 ? n.id : id);

        const visual = resolveNodeVisualConfig(

          {

            id: n.id,

            mindMapId: data.mindMapId,

            title: n.label,

            type: nType,

            depth: nDepth,

            parentId: id,

            branchId: bId,

            position: { x: n.position_x, y: n.position_y },

            importanceScore: n.importance_score ?? 0.8,

          },

          theme,

          false

        );



        return {

          id: n.id,

          type: "editable",

          position: { x: n.position_x, y: n.position_y },

          data: {

            label: n.label,

            semanticType: nType,

            visualConfig: visual,

            mindMapId: data.mindMapId,

            depth: nDepth,

            parentId: id,

            branchId: bId,

            importance_score: n.importance_score ?? 0.8,

            onPushHistory: data.onPushHistory,

            onDelete: data.onDelete,

            onRegenerate: data.onRegenerate,

            onBroadcastUpdate: data.onBroadcastUpdate,

            onBroadcastCreate: data.onBroadcastCreate,

          },

        };

      });



      const newEdges = res.edges.map((e: any) => ({

        id: e.id,

        source: e.source,

        target: e.target,

        type: "editable",

        animated: true,

      }));



      const currentNodes = getNodes();
      const currentEdges = getEdges();
      const existingNodeIds = new Set(currentNodes.map((n) => n.id));
      const existingEdgeIds = new Set(currentEdges.map((e) => e.id));
      const combinedNodes = [...currentNodes, ...newNodes.filter((n: any) => !existingNodeIds.has(n.id))];
      const combinedEdges = [...currentEdges, ...newEdges.filter((e: any) => !existingEdgeIds.has(e.id))];

      const currentLayout = (localStorage.getItem(`mindmap_layout_${data.mindMapId}`) as LayoutDirection) || "radial";
      const layoutResult = applyLayout(combinedNodes, combinedEdges, currentLayout);
      setNodes(layoutResult.nodes);
      setEdges(layoutResult.edges);



      pushSnapshot();

      toast.success("Branch expanded!");

    } catch (e) {

      console.error(e);

      toast.error("AI expansion failed.");

    } finally {

      setIsProcessingAI(false);

    }

  };



  const handleAISummarize = async () => {

    setIsProcessingAI(true);

    try {

      const res = await summarizeNode(id);

      alert(`Summary for ${data.label}:\r\n\r\n${res.summary}`);

    } catch (e) {

      console.error(e);

      toast.error("AI summarization failed.");

    } finally {

      setIsProcessingAI(false);

    }

  };



  const visualConfig = data.visualConfig;

  const rawLabel = data.label || "";

  const isTaskNode =

    visualConfig?.showCheckbox ||

    data.semanticType === "task" ||

    rawLabel.startsWith("[ ]") ||

    rawLabel.startsWith("[x]") ||

    rawLabel.startsWith("[X]");



  const isTaskCompleted =

    visualConfig?.isCompleted ||

    rawLabel.startsWith("[x]") ||

    rawLabel.startsWith("[X]") ||

    data.metadata?.status === "done";



  const displayLabel = isTaskNode ? rawLabel.replace(/^\[[ xX]\]\s*/, "") : rawLabel;



  const shapeClasses =

    visualConfig?.shapeClasses ||

    (depth === 0

      ? "rounded-full py-3 px-6 min-w-[160px] max-w-[280px] shadow-md border-2"

      : depth === 1

      ? "rounded-xl py-2.5 px-4 min-w-[120px] max-w-[240px] shadow-xs border-2"

      : "rounded-lg py-2 px-3.5 min-w-[90px] max-w-[220px] border shadow-2xs");



  const textClasses =

    visualConfig?.typographyClasses ||

    (depth === 0

      ? "text-headline-sm font-semibold tracking-tight text-center"

      : depth === 1

      ? "text-title-sm font-semibold text-center"

      : "text-ui font-medium text-center");



  const bgClass = visualConfig?.bgClasses || theme.bg;



  const borderClass = selected

    ? "border-primary shadow-glow ring-2 ring-primary ring-offset-2 ring-offset-background"

    : (visualConfig?.borderClasses || theme.border);



  const textColorClass = visualConfig?.textColorClasses || theme.text;

  const hasChildren = Boolean(data.hasChildren);
  const isCollapsed = Boolean(data.isCollapsed);
  const childrenCount = Number(data.childrenCount || 0);
  const isAiSuggestion = data.semanticType === "ai_suggestion";

  const collapseBadgePositionClass =
    effectiveSourcePos === Position.Left
      ? "-left-3.5 top-1/2 -translate-y-1/2"
      : effectiveSourcePos === Position.Bottom
      ? "-bottom-3.5 left-1/2 -translate-x-1/2"
      : effectiveSourcePos === Position.Top
      ? "-top-3.5 left-1/2 -translate-x-1/2"
      : "-right-3.5 top-1/2 -translate-y-1/2";



  return (

    <ContextMenu>

      <ContextMenuTrigger disabled={isEditing}>

        <NodeToolbar

          isVisible={selected && !isEditing}

          position={Position.Top}

          className="flex items-center gap-1 bg-surface/95 backdrop-blur-md border border-outline-variant/30 rounded-xl p-1 shadow-level-2 mb-2 transition-all"

        >

          <button

            onClick={handleAddChild}

            className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-low hover:text-primary text-on-surface-variant rounded-lg transition-colors tooltip-trigger"

            title="Add Child"

          >

            <Icon name="add_circle" className="text-[16px]" />

          </button>

          <button

            onClick={handleAddSibling}

            className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-low hover:text-primary text-on-surface-variant rounded-lg transition-colors tooltip-trigger"

            title="Add Sibling"

          >

            <Icon name="queue" className="text-[16px]" />

          </button>

          <div className="w-px h-4 bg-outline-variant/50 mx-0.5" />

          <button

            onClick={() => setIsEditing(true)}

            className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-low hover:text-primary text-on-surface-variant rounded-lg transition-colors"

            title="Rename"

          >

            <Icon name="edit" className="text-[16px]" />

          </button>

          <div className="w-px h-4 bg-outline-variant/50 mx-0.5" />

          <button

            onClick={handleAIExpand}

            disabled={isProcessingAI}

            className="w-8 h-8 flex items-center justify-center hover:bg-accent-violet/10 text-accent-violet rounded-lg transition-colors disabled:opacity-50"

            title="AI Expand"

          >

            <Icon

              name={isProcessingAI ? "sync" : "auto_awesome"}

              className={`text-[16px] ${isProcessingAI ? "animate-spin" : ""}`}

            />

          </button>

          <button

            onClick={handleAISummarize}

            disabled={isProcessingAI}

            className="w-8 h-8 flex items-center justify-center hover:bg-accent-blue/10 text-accent-blue rounded-lg transition-colors disabled:opacity-50"

            title="AI Summarize"

          >

            <Icon name="summarize" className="text-[16px]" />

          </button>

          <div className="w-px h-4 bg-outline-variant/50 mx-0.5" />

          <button

            onClick={() => data.onOpenInspector?.(id)}

            className="w-8 h-8 flex items-center justify-center hover:bg-primary/10 text-primary rounded-lg transition-colors tooltip-trigger"

            title="Style & Appearance"

          >

            <Icon name="palette" className="text-[16px]" />

          </button>

          {hasChildren && (
            <>
              <button
                onClick={() => data.onToggleCollapse?.(id)}
                className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-low hover:text-primary text-on-surface-variant rounded-lg transition-colors tooltip-trigger"
                title={isCollapsed ? `Expand branch (+${childrenCount})` : "Collapse branch"}
              >
                <Icon name={isCollapsed ? "unfold_more" : "unfold_less"} className="text-[16px]" />
              </button>
              <div className="w-px h-4 bg-outline-variant/50 mx-0.5" />
            </>
          )}

          <button

            onClick={handleDelete}

            className="w-8 h-8 flex items-center justify-center hover:bg-error-container hover:text-error text-outline rounded-lg transition-colors"

            title="Delete"

          >

            <Icon name="delete" className="text-[16px]" />

          </button>

        </NodeToolbar>



        <div

          className={`flex flex-col items-center justify-center transition-all duration-200 select-none group cursor-pointer ${shapeClasses} ${bgClass} ${borderClass}`}

          onDoubleClick={() => setIsEditing(true)}

        >

          <Handle

            type="target"

            position={effectiveTargetPos}

            className="opacity-0 group-hover:opacity-100 transition-opacity w-3 h-3 bg-primary"

          />

          {isAiSuggestion && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-accent-violet uppercase tracking-wider mb-1 select-none">
              <Icon name="auto_awesome" className="text-[12px]" />
              <span>AI Suggestion</span>
            </div>
          )}



          {isEditing ? (

            <input

              ref={inputRef}

              value={editValue}

              onChange={(e) => setEditValue(e.target.value)}

              onBlur={handleSave}

              onKeyDown={handleKeyDown}

              className={`nodrag nowheel outline-none border-none bg-transparent text-center w-full px-1 ${textClasses} ${textColorClass}`}

            />

          ) : (

            <div className={`text-center break-words w-full ${textClasses} ${textColorClass} flex items-center justify-center gap-1.5`}>

              {isProcessingAI && <Icon name="sync" className="animate-spin text-[14px] opacity-70 shrink-0" />}



              {isTaskNode ? (

                <button

                  type="button"

                  onClick={(e) => {

                    e.stopPropagation();

                    handleToggleTask();

                  }}

                  className="w-4 h-4 flex items-center justify-center shrink-0 text-primary hover:text-primary-container transition-colors cursor-pointer"

                  title={isTaskCompleted ? "Mark incomplete" : "Mark complete"}

                >

                  <Icon

                    name={isTaskCompleted ? "check_box" : "check_box_outline_blank"}

                    className="text-[16px]"

                  />

                </button>

              ) : visualConfig?.iconName ? (

                <Icon

                  name={visualConfig.iconName}

                  className={visualConfig.iconClasses || "text-[16px] shrink-0 opacity-80"}

                />

              ) : null}



              <span className={`break-words ${isTaskCompleted ? "line-through opacity-70" : ""}`}>

                {displayLabel}

              </span>

            </div>

          )}



          {isAiSuggestion && !isEditing && (
            <div
              className="flex items-center justify-center gap-1.5 mt-2 pt-1.5 border-t border-accent-violet/20 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleAcceptSuggestion}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-violet/15 hover:bg-accent-violet text-accent-violet hover:text-white text-[11px] font-semibold transition-all cursor-pointer"
                title="Accept suggestion and add to map"
              >
                <Icon name="check" className="text-[13px]" />
                <span>Accept</span>
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-error/15 text-on-surface-variant hover:text-error text-[11px] font-medium transition-colors cursor-pointer"
                title="Dismiss suggestion"
              >
                <Icon name="close" className="text-[13px]" />
                <span>Dismiss</span>
              </button>
            </div>
          )}

          <Handle

            type="source"

            position={effectiveSourcePos}

            className="opacity-0 group-hover:opacity-100 transition-opacity w-3 h-3 bg-primary"

          />

          {/* Branch Collapse/Expand Trigger & Badge */}
          {hasChildren && (
            <div className={`absolute z-20 flex items-center ${collapseBadgePositionClass}`}>
              {isCollapsed ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onToggleCollapse?.(id);
                  }}
                  className="px-1.5 py-0.5 min-w-[22px] h-5 rounded-full bg-primary text-on-primary font-bold text-[11px] shadow-sm hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-2 border-surface"
                  title={`Expand branch (+${childrenCount} subnodes hidden)`}
                >
                  +{childrenCount}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onToggleCollapse?.(id);
                  }}
                  className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded-full bg-surface border border-outline-variant/60 hover:bg-surface-container text-on-surface-variant hover:text-primary transition-all flex items-center justify-center cursor-pointer shadow-xs hover:scale-110"
                  title="Collapse branch"
                >
                  <Icon name="remove" className="text-[12px]" />
                </button>
              )}
            </div>
          )}

        </div>

      </ContextMenuTrigger>



      <ContextMenuContent className="w-56">

        <ContextMenuItem onClick={handleAddChild} className="cursor-pointer">

          <Icon name="add_circle" className="mr-2 text-[16px]" /> Add child

        </ContextMenuItem>

        <ContextMenuItem onClick={handleAddSibling} className="cursor-pointer">

          <Icon name="queue" className="mr-2 text-[16px]" /> Add sibling

        </ContextMenuItem>

        <ContextMenuItem onClick={() => setIsEditing(true)} className="cursor-pointer">

          <Icon name="edit" className="mr-2 text-[16px]" /> Rename

        </ContextMenuItem>

        <ContextMenuItem onClick={handleDuplicate} className="cursor-pointer">

          <Icon name="content_copy" className="mr-2 text-[16px]" /> Duplicate

        </ContextMenuItem>

        {hasChildren && (
          <ContextMenuItem onClick={() => data.onToggleCollapse?.(id)} className="cursor-pointer">
            <Icon name={isCollapsed ? "unfold_more" : "unfold_less"} className="mr-2 text-[16px]" />
            {isCollapsed ? `Expand branch (+${childrenCount})` : "Collapse branch"}
          </ContextMenuItem>
        )}

        <ContextMenuItem onClick={() => data.onOpenInspector?.(id)} className="cursor-pointer">

          <Icon name="palette" className="mr-2 text-[16px]" /> Style & Appearance

        </ContextMenuItem>



        {isTaskNode && (

          <>

            <ContextMenuSeparator />

            <ContextMenuItem onClick={handleToggleTask} className="cursor-pointer text-primary">

              <Icon name={isTaskCompleted ? "check_box_outline_blank" : "check_box"} className="mr-2 text-[16px]" />

              {isTaskCompleted ? "Mark as Incomplete" : "Mark as Complete"}

            </ContextMenuItem>

          </>

        )}



        {data.semanticType === "ai_suggestion" && (

          <>

            <ContextMenuSeparator />

            <ContextMenuItem onClick={handleAcceptSuggestion} className="cursor-pointer text-accent-violet">

              <Icon name="check_circle" className="mr-2 text-[16px]" /> Accept AI Suggestion

            </ContextMenuItem>

          </>

        )}



        <ContextMenuSeparator />

        <ContextMenuItem onClick={handleAIExpand} disabled={isProcessingAI} className="cursor-pointer text-accent-violet">

          <Icon name="auto_awesome" className="mr-2 text-[16px]" /> Expand with AI

        </ContextMenuItem>

        <ContextMenuItem onClick={handleAISummarize} disabled={isProcessingAI} className="cursor-pointer text-accent-blue">

          <Icon name="summarize" className="mr-2 text-[16px]" /> Summarize with AI

        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem

          onClick={handleDelete}

          className="cursor-pointer text-error hover:bg-error-container hover:text-error focus:bg-error-container focus:text-error"

        >

          <Icon name="delete" className="mr-2 text-[16px]" /> Delete

        </ContextMenuItem>

      </ContextMenuContent>

    </ContextMenu>

  );

}

