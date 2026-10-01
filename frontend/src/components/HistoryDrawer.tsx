import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getSnapshots, createSnapshot, restoreSnapshot, type Snapshot } from "@/api/mindmaps";
import { toast } from "sonner";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mindMapId: string | null;
  onRestore: () => void;
}

export function HistoryDrawer({ isOpen, onClose, mindMapId, onRestore }: HistoryDrawerProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && mindMapId) {
      loadSnapshots();
    }
  }, [isOpen, mindMapId]);

  async function loadSnapshots() {
    if (!mindMapId) return;
    setLoading(true);
    try {
      const data = await getSnapshots(mindMapId);
      setSnapshots(data);
    } catch (e) {
      toast.error("Failed to load version history.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSnapshot(e: React.FormEvent) {
    e.preventDefault();
    if (!mindMapId || !snapshotName.trim()) return;
    setIsSaving(true);
    try {
      await createSnapshot(mindMapId, snapshotName.trim());
      setSnapshotName("");
      toast.success("Version saved successfully!");
      await loadSnapshots();
    } catch (e) {
      toast.error("Failed to save version.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRestore(snapshot: Snapshot) {
    if (!mindMapId) return;
    if (!confirm(`Are you sure you want to restore "${snapshot.name}"? This will overwrite your current draft.`)) {
      return;
    }
    
    setRestoringId(snapshot.id);
    try {
      await restoreSnapshot(mindMapId, snapshot.id);
      toast.success("Version restored successfully!");
      onRestore(); // trigger graph reload
      onClose();
    } catch (e) {
      toast.error("Failed to restore version.");
    } finally {
      setRestoringId(null);
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[340px] p-0 flex flex-col bg-surface border-l border-outline-variant/30">
        <SheetHeader className="p-4 border-b border-outline-variant/30 bg-surface-container-lowest">
          <SheetTitle className="flex items-center gap-2 text-on-surface text-headline-sm">
            <Icon name="history" className="text-primary text-[22px]" />
            Version History
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 border-b border-outline-variant/30 bg-surface-container-low">
          <form onSubmit={handleCreateSnapshot} className="flex flex-col gap-2">
            <label className="text-label-sm text-on-surface-variant font-medium">Save current version</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Before AI translation"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                className="flex-1 bg-surface-container-lowest border border-outline-variant/50 rounded-lg px-3 py-1.5 text-body-sm focus:outline-none focus:border-primary"
                maxLength={40}
              />
              <button
                type="submit"
                disabled={isSaving || !snapshotName.trim()}
                className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-label-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {loading && <div className="text-center text-on-surface-variant py-4">Loading versions...</div>}
          
          {!loading && snapshots.length === 0 && (
            <div className="text-center text-on-surface-variant py-8 flex flex-col items-center gap-2">
              <Icon name="history_toggle_off" className="text-[32px] opacity-50" />
              <p className="text-body-sm">No saved versions yet.</p>
              <p className="text-[11px] opacity-70 px-4">Create a snapshot before making major changes.</p>
            </div>
          )}

          {!loading && snapshots.map(snap => (
            <div key={snap.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 flex flex-col gap-2 hover:border-outline-variant/60 transition-colors">
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col">
                  <span className="text-label-md text-on-surface font-semibold">{snap.name}</span>
                  <span className="text-[11px] text-on-surface-variant">{formatDate(snap.created_at)}</span>
                </div>
                <div className="bg-surface-container-high rounded px-1.5 py-0.5 text-[10px] text-on-surface-variant font-medium shrink-0">
                  {snap.graph_data.nodes.length} nodes
                </div>
              </div>
              <button
                onClick={() => handleRestore(snap)}
                disabled={restoringId === snap.id}
                className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-primary/20 text-primary hover:bg-primary/5 text-label-sm font-medium transition-colors disabled:opacity-50"
              >
                <Icon name={restoringId === snap.id ? "sync" : "restore"} className={restoringId === snap.id ? "animate-spin text-[16px]" : "text-[16px]"} />
                {restoringId === snap.id ? "Restoring..." : "Restore this version"}
              </button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
