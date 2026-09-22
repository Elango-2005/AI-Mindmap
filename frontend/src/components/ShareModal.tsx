import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Icon } from "@/components/Icon";
import { toast } from "sonner";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  mindMapTitle: string;
  remoteUsers?: Record<string, { userId: string; userName: string; color: string }>;
  onExport?: (format: "markdown" | "opml" | "png") => void;
}

export function ShareModal({
  isOpen,
  onClose,
  mindMapTitle,
  remoteUsers = {},
  onExport,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [accessLevel, setAccessLevel] = useState<"edit" | "view">("edit");
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Shareable link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const activeUserList = Object.values(remoteUsers);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[30rem] bg-surface border border-outline-variant/30 text-on-surface shadow-level-3 p-5 sm:p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Icon name="group_add" className="text-[24px]" />
            <DialogTitle className="text-headline-sm font-bold text-on-surface">
              Share "{mindMapTitle}"
            </DialogTitle>
          </div>
          <DialogDescription className="text-body-sm text-on-surface-variant">
            Anyone with this link can collaborate and view this mind map in real-time.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full min-w-0 space-y-4 py-2">
          {/* Shareable Link Input with Copy Button */}
          <div className="w-full min-w-0 flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full min-w-0 pl-3 pr-8 py-2 bg-surface-container-low border border-outline-variant/50 rounded-xl text-body-sm text-on-surface font-mono select-all focus:outline-none"
              />
              <Icon
                name="link"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]"
              />
            </div>
            <button
              onClick={handleCopy}
              className={`shrink-0 px-3 sm:px-4 py-2 rounded-xl text-label-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                copied
                  ? "bg-primary text-on-primary"
                  : "bg-primary-container text-on-primary-container hover:bg-primary-container/80"
              }`}
            >
              <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" />
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          {/* Access Permissions Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/20 gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Icon
                  name={accessLevel === "edit" ? "edit" : "visibility"}
                  className="text-[18px]"
                />
              </div>
              <div className="min-w-0">
                <p className="text-label-sm font-semibold text-on-surface">General Access</p>
                <p className="text-label-xs text-on-surface-variant truncate">
                  {accessLevel === "edit"
                    ? "Anyone with the link can edit nodes in real-time"
                    : "Anyone with the link can view without editing"}
                </p>
              </div>
            </div>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as "edit" | "view")}
              className="bg-surface-container border border-outline-variant/40 text-on-surface rounded-lg text-label-xs px-2.5 py-1.5 focus:outline-none cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <option value="edit">Can Edit</option>
              <option value="view">Can View</option>
            </select>
          </div>

          {/* Live Collaborators Section */}
          <div className="pt-1">
            <h4 className="text-label-xs font-semibold uppercase text-outline tracking-wider mb-2">
              Active Collaborators ({activeUserList.length + 1})
            </h4>
            <div className="space-y-2">
              {/* Current User */}
              <div className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-xs font-bold">
                    You
                  </div>
                  <div>
                    <span className="text-body-sm font-medium text-on-surface">You</span>
                    <span className="text-label-xs text-outline ml-1.5">(Owner)</span>
                  </div>
                </div>
                <span className="text-label-xs text-primary font-medium">Active now</span>
              </div>

              {/* Remote Users */}
              {activeUserList.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-label-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: user.color || "#0284c7" }}
                    >
                      {user.userName?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="text-body-sm text-on-surface">{user.userName}</span>
                  </div>
                  <span className="text-label-xs text-emerald-500 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Export Shortcuts */}
          {onExport && (
            <div className="pt-2 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2">
              <span className="text-label-xs text-outline font-medium">Quick Export:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => onExport("png")}
                  className="text-label-xs px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors flex items-center gap-1"
                >
                  <Icon name="image" className="text-[14px]" /> PNG
                </button>
                <button
                  onClick={() => onExport("markdown")}
                  className="text-label-xs px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors flex items-center gap-1"
                >
                  <Icon name="article" className="text-[14px]" /> Markdown
                </button>
                <button
                  onClick={() => onExport("opml")}
                  className="text-label-xs px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors flex items-center gap-1"
                >
                  <Icon name="list" className="text-[14px]" /> OPML
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
