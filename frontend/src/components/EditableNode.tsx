import { useState, useRef, useEffect } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { updateNode } from "@/api/nodes";

export function EditableNode({ id, data, selected }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const { setNodes } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue if data.label changes externally
  useEffect(() => {
    setEditValue(data.label);
  }, [data.label]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Optionally select all text
      inputRef.current.select();
    }
  }, [isEditing]);

  async function handleSave() {
    setIsEditing(false);
    const newLabel = editValue.trim();
    if (newLabel === data.label || newLabel === "") {
      setEditValue(data.label); // Revert to original if empty
      return;
    }

    // Update local state immediately for snappy UI
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n
      )
    );

    try {
      await updateNode(id, { label: newLabel });
    } catch (err) {
      console.error("Failed to update node label:", err);
      // Revert on error
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

  return (
    <div
      className={`px-4 py-2 shadow-sm rounded-md bg-surface border-2 min-w-[150px] flex items-center justify-center transition-colors ${
        selected ? "border-primary" : "border-outline-variant"
      }`}
      onDoubleClick={() => setIsEditing(true)}
    >
      <Handle type="target" position={Position.Top} />
      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="nodrag nowheel outline-none border-none bg-transparent text-center text-body-md text-on-surface w-full"
        />
      ) : (
        <div className="text-body-md font-medium text-on-surface text-center break-words w-full">
          {data.label}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
