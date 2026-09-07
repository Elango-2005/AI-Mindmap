import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getProjects } from "@/api/projects";
import { getProjectMindMaps, type MindMap } from "@/api/mindmaps";
import { AppSidebar } from "@/components/AppSidebar";
import { Icon } from "@/components/Icon";

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
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar active="History" ctaVariant="muted" showBrand />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="px-xl py-lg border-b border-outline-variant/20 bg-surface shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-headline-lg text-on-surface font-bold">History</h1>
              <p className="text-body-md text-on-surface-variant mt-0.5">All your mind maps, sorted by recent activity</p>
            </div>
            <div className="relative w-72">
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

        <div className="flex-1 overflow-y-auto px-xl py-lg">
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
                  className="bg-primary-container text-white text-label-md rounded-xl py-2.5 px-6 flex items-center gap-2 ai-glow transition-all hover:-translate-y-0.5"
                >
                  <Icon name="add" />
                  New Project
                </Link>
              )}
            </div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div className="flex flex-col gap-xl max-w-3xl">
              {GROUP_ORDER.filter((g) => grouped[g]).map((groupLabel) => (
                <section key={groupLabel}>
                  <h2 className="text-label-md font-semibold text-on-surface-variant uppercase tracking-wider mb-md">
                    {groupLabel}
                  </h2>
                  <div className="flex flex-col gap-sm">
                    {grouped[groupLabel].map((entry) => (
                      <Link
                        key={entry.mindMap.id}
                        to="/workspace"
                        search={{ mindMapId: entry.mindMap.id }}
                        className="group flex items-center gap-lg bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-lg py-md hover:shadow-level-1 hover:-translate-y-0.5 transition-all"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon name="account_tree" className="text-primary text-[20px]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-body-md font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                            {entry.mindMap.title}
                          </p>
                          <p className="text-label-sm text-on-surface-variant mt-0.5 flex items-center gap-1">
                            <Icon name="folder_open" className="text-[14px]" />
                            {entry.projectTitle}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-label-sm text-on-surface-variant">{timeAgo(entry.mindMap.updated_at)}</p>
                          <p className="text-label-xs text-outline mt-0.5">
                            {new Date(entry.mindMap.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <Icon name="chevron_right" className="text-outline group-hover:text-primary transition-colors shrink-0" />
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
              <p className="text-label-sm text-outline text-center pb-lg">
                Showing {filtered.length} mind map{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/history")({
  component: HistoryComponent,
});
