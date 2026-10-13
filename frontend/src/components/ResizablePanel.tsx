import React, { useState, useEffect, useRef, useCallback } from "react";

export interface ResizablePanelProps {
  side: "left" | "right";
  width: number;
  minWidth?: number;
  maxWidth?: number;
  collapsed: boolean;
  onResize: (newWidth: number) => void;
  onCollapse?: () => void;
  className?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}

export function ResizablePanel({
  side,
  width,
  minWidth = side === "left" ? 220 : 280,
  maxWidth = side === "left" ? 500 : 600,
  collapsed,
  onResize,
  onCollapse,
  className = "",
  ariaLabel,
  children,
}: ResizablePanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: width });
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragStartRef.current = { startX: e.clientX, startWidth: width };
    setIsDragging(true);

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      const { startX, startWidth } = dragStartRef.current;
      const deltaX = side === "left" ? e.clientX - startX : startX - e.clientX;
      
      // Dynamic max width constraint based on viewport width
      const dynamicMaxWidth = Math.min(maxWidth, Math.max(minWidth + 50, window.innerWidth * 0.48));
      const newWidth = Math.round(Math.max(minWidth, Math.min(dynamicMaxWidth, startWidth + deltaX)));
      
      onResizeRef.current(newWidth);
      window.dispatchEvent(new Event("resize"));
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.dispatchEvent(new Event("resize"));
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, side, minWidth, maxWidth]);

  if (collapsed) {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label={ariaLabel || (side === "left" ? "Left tool panel" : "AI Assistant panel")}
      style={{ width: `${width}px` }}
      className={`relative shrink-0 flex flex-col h-full bg-surface select-none z-20 ${
        side === "left" ? "border-r border-outline-variant/30" : "border-l border-outline-variant/30"
      } ${isDragging ? "transition-none select-none" : "transition-[width] duration-150"} ${className}`}
    >
      {/* Real-time Content Container */}
      <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
        {children}
      </div>

      {/* Drag Resize Handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${side === "left" ? "left panel" : "AI Assistant"}`}
        aria-valuenow={width}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        onPointerDown={handlePointerDown}
        onDoubleClick={onCollapse}
        title="Drag to resize panel (Double-click to collapse)"
        className={`group absolute top-0 bottom-0 w-2.5 z-30 cursor-col-resize flex items-center justify-center ${
          side === "left" ? "-right-1.5" : "-left-1.5"
        }`}
      >
        {/* Subtle Visual Line */}
        <div
          className={`h-full w-[2px] transition-colors duration-150 ${
            isDragging
              ? "bg-primary w-[3px]"
              : "bg-transparent group-hover:bg-primary/60 group-hover:w-[3px]"
          }`}
        />
        {/* Subtle Center Grip Indicator on hover/drag */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-1 h-6 rounded-full transition-all duration-150 ${
            isDragging
              ? "bg-primary opacity-100 scale-110"
              : "bg-outline-variant/60 opacity-0 group-hover:opacity-100"
          }`}
        />
      </div>
    </aside>
  );
}
