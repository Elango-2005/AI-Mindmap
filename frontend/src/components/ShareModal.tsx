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
}

export function ShareModal({
  isOpen,
  onClose,
  mindMapTitle,
  remoteUsers = {},
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  
  // Hardcoded to edit since backend does not currently support granular permissions
  const accessLevel = "edit";
  
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
      <DialogContent className="w-[calc(100%-2rem)] max-w-[32rem] bg-surface border border-outline-variant/30 text-on-surface shadow-level-3 p-6 rounded-2xl">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Icon name="share" className="text-[24px]" />
            <DialogTitle className="text-headline-sm font-bold text-on-surface">
              Share "{mindMapTitle}"
            </DialogTitle>
          </div>
          <DialogDescription className="text-body-sm text-on-surface-variant">
            Invite others to view and collaborate on this mind map.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share Link Section */}
          <section>
            <h4 className="text-label-sm font-bold text-outline uppercase tracking-wider mb-3">
              Share Link
            </h4>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full pl-3 pr-8 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl text-body-sm text-on-surface font-mono select-all focus:outline-none focus:border-primary/50 transition-colors"
                />
                <Icon
                  name="link"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[16px]"
                />
              </div>
              <button
                onClick={handleCopy}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-label-sm font-semibold flex items-center gap-2 transition-all shadow-sm ${
                  copied
                    ? "bg-primary text-on-primary"
                    : "bg-primary-container text-on-primary-container hover:bg-primary-container/80"
                }`}
              >
                <Icon name={copied ? "check" : "content_copy"} className="text-[18px]" />
                <span>{copied ? "Copied" : "Copy link"}</span>
              </button>
            </div>
          </section>

          {/* Permissions Section */}
          <section>
            <h4 className="text-label-sm font-bold text-outline uppercase tracking-wider mb-3">
              Permission
            </h4>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Icon name="edit" className="text-[20px]" />
                </div>
                <div>
                  <p className="text-label-md font-bold text-on-surface">Anyone with the link</p>
                  <p className="text-body-sm text-on-surface-variant mt-0.5">
                    Can edit nodes and collaborate in real-time
                  </p>
                </div>
              </div>
              <select
                disabled
                value={accessLevel}
                className="bg-surface-container border border-outline-variant/40 text-on-surface rounded-lg text-label-sm px-3 py-2 font-medium opacity-70 cursor-not-allowed shrink-0"
              >
                <option value="edit">Editor</option>
                <option value="view">Viewer</option>
              </select>
            </div>
            <p className="text-label-xs text-outline mt-2 px-1">
              * Granular permissions (Viewer/Editor) are currently unsupported by the backend. All shared links provide Edit access.
            </p>
          </section>

          {/* People Section */}
          <section>
            <h4 className="text-label-sm font-bold text-outline uppercase tracking-wider mb-3">
              People ({activeUserList.length + 1} Active)
            </h4>
            <div className="space-y-1 border border-outline-variant/20 rounded-xl overflow-hidden bg-surface-container-lowest">
              <div className="flex items-center justify-between p-3 hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-sm font-bold">
                    You
                  </div>
                  <div>
                    <p className="text-label-md font-medium text-on-surface">You (Owner)</p>
                  </div>
                </div>
                <span className="text-label-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                  Active
                </span>
              </div>

              {activeUserList.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-3 border-t border-outline-variant/10 hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-label-sm font-bold text-white shadow-sm"
                      style={{ backgroundColor: user.color || "#0284c7" }}
                    >
                      {user.userName?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <p className="text-label-md font-medium text-on-surface">{user.userName}</p>
                  </div>
                  <span className="text-label-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
