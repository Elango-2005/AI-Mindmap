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

export function EditableNode({ id, data, selected, positionAbsoluteX, positionAbsoluteY }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const { setNodes, setEdges, getEdges, getNodes } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data.isNew) {
      setIsEditing(true);
      setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, isNew: false } } : n));
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

  const pushSnapshot = () => {
    // Delay slightly so setNodes/setEdges can finish applying
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

    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n
      )
    );

    try {
      await updateNode(id, { label: newLabel });
      pushSnapshot();
    } catch (err) {
      console.error("Failed to update node label:", err);
      toast.error("Failed to rename node.");
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, label: data.label } } : n
        )
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

  const handleAddChild = async () => {
    if (!data.mindMapId) {
      toast.error("Missing mind map ID");
      return;
    }
    try {
      const newNode = await createNode(data.mindMapId, {
        label: "New Node",
        position_x: positionAbsoluteX,
        position_y: positionAbsoluteY + 150
      });
      const newEdge = await createEdge(data.mindMapId, {
        source: id,
        target: newNode.id
      });
      
      setNodes((nds) => [...nds, {
        id: newNode.id,
        type: "editable",
        position: { x: newNode.position_x, y: newNode.position_y },
        data: { label: newNode.label, mindMapId: data.mindMapId, depth: depth + 1, theme: theme, isNew: true, onPushHistory: data.onPushHistory, onDelete: data.onDelete, onRegenerate: data.onRegenerate }
      }]);
      setEdges((eds) => [...eds, {
        id: newEdge.id,
        source: id,
        target: newNode.id,
        type: "editable"
      }]);
      pushSnapshot();
    } catch (e) {
      console.error(e);
      toast.error("Failed to add child node.");
    }
  };

  const handleAddSibling = async () => {
    if (!data.mindMapId) return;
    const edges = getEdges();
    const parentEdge = edges.find(e => e.target === id);
    if (!parentEdge) {
      toast.error("Cannot add sibling to the root node.");
      return;
    }
    try {
      const newNode = await createNode(data.mindMapId, {
        label: "New Node",
        position_x: positionAbsoluteX + 200,
        position_y: positionAbsoluteY
      });
      const newEdge = await createEdge(data.mindMapId, {
        source: parentEdge.source,
        target: newNode.id
      });
      
      setNodes((nds) => [...nds, {
        id: newNode.id,
        type: "editable",
        position: { x: newNode.position_x, y: newNode.position_y },
        data: { label: newNode.label, mindMapId: data.mindMapId, depth: depth, theme: theme, isNew: true, onPushHistory: data.onPushHistory, onDelete: data.onDelete, onRegenerate: data.onRegenerate }
      }]);
      setEdges((eds) => [...eds, {
        id: newEdge.id,
        source: parentEdge.source,
        target: newNode.id,
        type: "editable"
      }]);
      pushSnapshot();
    } catch (e) {
      console.error(e);
      toast.error("Failed to add sibling node.");
    }
  };

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
        position_x: positionAbsoluteX + 150,
        position_y: positionAbsoluteY + 50
      });
      
      // If it has a parent, attach to same parent
      const edges = getEdges();
      const parentEdge = edges.find(e => e.target === id);
      if (parentEdge) {
        const newEdge = await createEdge(data.mindMapId, {
          source: parentEdge.source,
          target: newNode.id
        });
        setEdges(eds => [...eds, {
          id: newEdge.id,
          source: parentEdge.source,
          target: newNode.id,
          type: "editable"
        }]);
      }
      
      setNodes((nds) => [...nds, {
        id: newNode.id,
        type: "editable",
        position: { x: newNode.position_x, y: newNode.position_y },
        data: { label: newNode.label, mindMapId: data.mindMapId, depth: depth, theme: theme, isNew: false, onPushHistory: data.onPushHistory, onDelete: data.onDelete, onRegenerate: data.onRegenerate }
      }]);
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
      
      const newNodes = res.nodes.map((n: any) => ({
        id: n.id,
        type: "editable",
        position: { x: n.position_x, y: n.position_y },
        data: { label: n.label, mindMapId: data.mindMapId, onPushHistory: data.onPushHistory, onDelete: data.onDelete, onRegenerate: data.onRegenerate }
      }));
      const newEdges = res.edges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "editable",
        animated: true
      }));

      setNodes(nds => {
        const existingIds = new Set(nds.map(n => n.id));
        return [...nds, ...newNodes.filter(n => !existingIds.has(n.id))];
      });
      setEdges(eds => {
        const existingIds = new Set(eds.map(e => e.id));
        return [...eds, ...newEdges.filter(e => !existingIds.has(e.id))];
      });
      
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
      alert(`Summary for ${data.label}:\n\n${res.summary}`);
    } catch (e) {
      console.error(e);
      toast.error("AI summarization failed.");
    } finally {
      setIsProcessingAI(false);
    }
  };

  let shapeClasses = "rounded-xl py-2 px-4 min-w-[120px]";
  let textClasses = "text-body-md font-medium";
  
  if (depth === 0) {
    shapeClasses = "rounded-full py-4 px-6 min-w-[200px] shadow-md border-4";
    textClasses = "text-title-lg font-bold tracking-tight";
  } else if (depth === 1) {
    shapeClasses = "rounded-full py-3 px-5 min-w-[150px] shadow-sm border-2";
    textClasses = "text-body-lg font-semibold";
  } else {
    shapeClasses += " border-2";
  }

  const bgClass = theme.bg;
  const borderClass = selected ? "border-primary shadow-glow" : theme.border;
  const textColorClass = theme.text;

  return (
    <ContextMenu>
      <ContextMenuTrigger disabled={isEditing}>
        <NodeToolbar
          isVisible={selected && !isEditing}
          position={Position.Top}
          className="flex items-center gap-1 bg-surface/95 backdrop-blur-md border border-outline-variant/30 rounded-xl p-1.5 shadow-level-2 mb-2 transition-all"
        >
          <button onClick={handleAddChild} className="p-1.5 hover:bg-surface-container-low hover:text-primary text-on-surface-variant rounded-lg transition-colors tooltip-trigger" title="Add Child">
            <Icon name="add_circle" className="text-[18px]" />
          </button>
          <button onClick={handleAddSibling} className="p-1.5 hover:bg-surface-container-low hover:text-primary text-on-surface-variant rounded-lg transition-colors tooltip-trigger" title="Add Sibling">
            <Icon name="queue" className="text-[18px]" />
          </button>
          <div className="w-px h-4 bg-outline-variant/50 mx-0.5" />
          <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-surface-container-low hover:text-primary text-on-surface-variant rounded-lg transition-colors" title="Rename">
            <Icon name="edit" className="text-[18px]" />
          </button>
          <div className="w-px h-4 bg-outline-variant/50 mx-0.5" />
          <button onClick={handleAIExpand} disabled={isProcessingAI} className="p-1.5 hover:bg-accent-violet/10 text-accent-violet rounded-lg transition-colors disabled:opacity-50" title="AI Expand">
            <Icon name={isProcessingAI ? "sync" : "auto_awesome"} className={`text-[18px] ${isProcessingAI ? "animate-spin" : ""}`} />
          </button>
          <button onClick={handleAISummarize} disabled={isProcessingAI} className="p-1.5 hover:bg-accent-blue/10 text-accent-blue rounded-lg transition-colors disabled:opacity-50" title="AI Summarize">
            <Icon name="summarize" className="text-[18px]" />
          </button>
          <div className="w-px h-4 bg-outline-variant/50 mx-0.5" />
          <button onClick={handleDelete} className="p-1.5 hover:bg-error-container hover:text-error text-outline rounded-lg transition-colors" title="Delete">
            <Icon name="delete" className="text-[18px]" />
          </button>
        </NodeToolbar>

        <div
          className={`flex items-center justify-center transition-all duration-300 ${shapeClasses} ${bgClass} ${borderClass}`}
          onDoubleClick={() => setIsEditing(true)}
        >
          <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity w-3 h-3 bg-primary" />
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className={`nodrag nowheel outline-none border-none bg-transparent text-center w-full ${textClasses} ${textColorClass}`}
            />
          ) : (
            <div className={`text-center break-words w-full ${textClasses} ${textColorClass} flex items-center justify-center gap-2`}>
              {isProcessingAI && <Icon name="sync" className="animate-spin text-[14px] opacity-70" />}
              {data.label}
            </div>
          )}
          <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity w-3 h-3 bg-primary" />
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
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleAIExpand} disabled={isProcessingAI} className="cursor-pointer text-accent-violet">
          <Icon name="auto_awesome" className="mr-2 text-[16px]" /> Expand with AI
        </ContextMenuItem>
        <ContextMenuItem onClick={handleAISummarize} disabled={isProcessingAI} className="cursor-pointer text-accent-blue">
          <Icon name="summarize" className="mr-2 text-[16px]" /> Summarize with AI
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="cursor-pointer text-error hover:bg-error-container hover:text-error focus:bg-error-container focus:text-error">
          <Icon name="delete" className="mr-2 text-[16px]" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
