import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getProjects } from "@/api/projects";
import { getProjectMindMaps, type MindMap } from "@/api/mindmaps";
import { AppLayout } from "@/components/AppLayout";

import { Icon } from "@/components/Icon";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";

interface HistoryEntry {
  mindMap: MindMap;
  projectTitle: string;
  projectId: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function HistoryComponent() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const projects = await getProjects();
        const allEntries: HistoryEntry[] = [];
        await Promise.all(
          projects.map(async (project) => {
            const maps = await getProjectMindMaps(project.id);
            maps.forEach((mindMap) => {
              allEntries.push({ mindMap, projectTitle: project.title, projectId: project.id });
            });
          }),
        );
        allEntries.sort((a, b) =>
          new Date(b.mindMap.updated_at).getTime() - new Date(a.mindMap.updated_at).getTime()
        );
        setEntries(allEntries);
      } catch (e) {
        console.error(e);
        setError("Failed to load history. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const handleCopyLink = (e: React.MouseEvent, mindMapId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/workspace/${mindMapId}`;
    navigator.clipboard.writeText(url);
    toast.success("Mind map link copied to clipboard!");
  };

  const filtered = entries.filter(
    (e) =>
      e.mindMap.title.toLowerCase().includes(search.toLowerCase()) ||
      e.projectTitle.toLowerCase().includes(search.toLowerCase()),
  );

  const grouped: Record<string, HistoryEntry[]> = {};
  filtered.forEach((entry) => {
    const date = new Date(entry.mindMap.updated_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    let group: string;
    if (date.toDateString() === today.toDateString()) group = "Today";
    else if (date.toDateString() === yesterday.toDateString()) group = "Yesterday";
    else if (today.getTime() - date.getTime() < 7 * 86400 * 1000) group = "This Week";
    else group = "Older";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(entry);
  });

  const GROUP_ORDER = ["Today", "Yesterday", "This Week", "Older"];

  return (
    <AppLayout activeRoute="History">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="px-4 sm:px-xl py-4 sm:py-lg border-b border-outline-variant/20 bg-surface shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-headline-md sm:text-headline-lg text-on-surface font-bold">History</h1>
                <p className="text-body-sm sm:text-body-md text-on-surface-variant mt-0.5">
                  All your mind maps, sorted by recent activity
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
              <input
                type="text"
                placeholder="Search maps or projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-outline-variant/50 bg-surface-container-low text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-4 sm:px-xl py-4 sm:py-lg">

          {loading && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-on-surface-variant">
              <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-body-md">Loading history...</p>
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Icon name="error_outline" className="text-[48px] text-error" />
              <p className="text-body-md text-on-surface-variant">{error}</p>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
              <Icon name="history" className="text-[48px] text-outline" />
              <div>
                <h3 className="text-headline-sm text-on-surface">{search ? "No results found" : "No history yet"}</h3>
                <p className="text-body-md text-on-surface-variant mt-1">
                  {search ? "Try a different search term." : "Create your first mind map to get started."}
                </p>
              </div>
              {!search && (
                <Link
                  to="/dashboard"
                  className="bg-primary text-on-primary text-label-md rounded-xl py-2.5 px-6 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                >
                  <Icon name="add" />
                  New Project
                </Link>
              )}
            </div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div className="flex flex-col max-w-4xl relative">
              {/* Timeline continuous vertical line */}
              <div className="absolute left-8 sm:left-10 top-4 bottom-8 w-px bg-outline-variant/30 hidden sm:block"></div>
              
              {GROUP_ORDER.filter((g) => grouped[g]).map((groupLabel) => (
                <section key={groupLabel} className="mb-xl relative">
                  <div className="flex items-center gap-3 mb-md">
                    <div className="hidden sm:flex w-20 justify-end">
                       {/* spacer for timeline */}
                    </div>
                    <div className="hidden sm:flex w-2 h-2 rounded-full bg-outline-variant relative -left-[4.5px] z-10 shrink-0 ring-4 ring-surface" />
                    <h2 className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wider">
                      {groupLabel}
                    </h2>
                  </div>
                  <div className="flex flex-col gap-sm">
                    {grouped[groupLabel].map((entry) => {
                      const createdMs = new Date(entry.mindMap.created_at).getTime();
                      const updatedMs = new Date(entry.mindMap.updated_at).getTime();
                      const isCreation = Math.abs(updatedMs - createdMs) < 10000;
                      const actionLabel = isCreation ? "Created map" : "Edited map";
                      const actionIcon = isCreation ? "add_circle" : "edit";
                      const actionColor = isCreation ? "text-primary bg-primary/10" : "text-tertiary bg-tertiary/10";
                      
                      return (
                        <div
                          key={entry.mindMap.id}
                          className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-lg bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 sm:px-lg py-3 sm:py-md hover:shadow-level-1 hover:border-primary/40 transition-all sm:ml-[4.5rem]"
                        >
                          <Link
                            to="/workspace/$mindMapId"
                            params={{ mindMapId: entry.mindMap.id }}
                            className="flex items-center gap-3 sm:gap-md flex-1 min-w-0"
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${actionColor} group-hover:bg-primary group-hover:text-on-primary transition-colors`}>
                              <Icon name={actionIcon} className="text-[20px]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-label-sm font-medium text-on-surface-variant px-1.5 py-0.5 bg-surface-variant rounded-md">
                                  {actionLabel}
                                </span>
                                <span className="text-label-sm text-outline hidden sm:inline">&bull;</span>
                                <p className="text-label-sm text-on-surface-variant hidden sm:flex items-center gap-1 truncate">
                                  <Icon name="folder_open" className="text-[14px] text-outline" />
                                  {entry.projectTitle}
                                </p>
                              </div>
                              <p className="text-body-md font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                                {entry.mindMap.title}
                              </p>
                              {/* Mobile project title */}
                              <p className="text-label-sm text-on-surface-variant mt-1 flex sm:hidden items-center gap-1 truncate">
                                <Icon name="folder_open" className="text-[14px] text-outline" />
                                {entry.projectTitle}
                              </p>
                            </div>
                          </Link>

                          {/* Actions & Timestamps */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant/10">
                            <div className="text-left sm:text-right">
                              <p className="text-label-sm text-on-surface-variant font-medium">{timeAgo(entry.mindMap.updated_at)}</p>
                            </div>

                            <div className="flex items-center gap-1">
                              <Link
                                to="/present/$mindMapId"
                                params={{ mindMapId: entry.mindMap.id }}
                                className="p-2 rounded-lg text-outline hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Present Slideshow"
                              >
                                <Icon name="play_circle" className="text-[18px]" />
                              </Link>
                              <button
                                onClick={(e) => handleCopyLink(e, entry.mindMap.id)}
                                className="p-2 rounded-lg text-outline hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Copy Share Link"
                              >
                                <Icon name="link" className="text-[18px]" />
                              </button>
                              <Link
                                to="/workspace/$mindMapId"
                                params={{ mindMapId: entry.mindMap.id }}
                                className="p-2 rounded-lg text-outline group-hover:text-primary hover:bg-surface-container transition-colors"
                                title="Open in Workspace"
                              >
                                <Icon name="chevron_right" className="text-[18px]" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
              <p className="text-label-sm text-outline text-center pb-lg sm:pl-[4.5rem]">
                Showing {filtered.length} recent activit{filtered.length !== 1 ? "ies" : "y"}
              </p>
            </div>
          )}
        
        </div>
      </div>
    </AppLayout>
  );
}

export const Route = createFileRoute("/history")({
  component: HistoryComponent,
});
