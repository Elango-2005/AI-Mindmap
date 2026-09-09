import { useState, useRef, useEffect } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { updateNode } from "@/api/nodes";
import { DEFAULT_THEME } from "@/lib/graphColoring";

export function EditableNode({ id, data, selected }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const { setNodes } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);

  // Safely extract styling properties computed by graphColoring.ts
  const depth = data.depth !== undefined ? data.depth : 1;
  const theme = data.theme || DEFAULT_THEME;

  // Sync editValue if data.label changes externally
  useEffect(() => {
    setEditValue(data.label);
  }, [data.label]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
    } catch (err) {
      console.error("Failed to update node label:", err);
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

  // Determine dynamic shape and sizes based on depth
  let shapeClasses = "rounded-xl py-2 px-4 min-w-[120px]"; // Leaf nodes
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

  // Determine colors based on theme
  const bgClass = theme.bg;
  const borderClass = selected ? "border-primary shadow-glow" : theme.border;
  const textColorClass = theme.text;

  return (
    <div
      className={`flex items-center justify-center transition-all duration-300 ${shapeClasses} ${bgClass} ${borderClass}`}
      onDoubleClick={() => setIsEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100" />
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
        <div className={`text-center break-words w-full ${textClasses} ${textColorClass}`}>
          {data.label}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100" />
    </div>
  );
}
