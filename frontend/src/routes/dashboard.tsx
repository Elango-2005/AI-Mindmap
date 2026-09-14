import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Icon } from "@/components/Icon";
import { LOGO_URL, PROJECT_THUMBS } from "@/lib/assets";
import { getProjects, createProject, deleteProject, updateProject, type Project } from "@/api/projects";
import { createMindMap } from "@/api/mindmaps";
import { getCurrentUser } from "@/api/auth";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TITLE = "Dashboard - MindVault AI";
const DESCRIPTION = "Your recent mind maps, AI generation stats, and workspace shortcuts.";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<{ full_name: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Phase B States
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    // Check auth
    if (!localStorage.getItem("access_token")) {
      navigate({ to: "/login" });
      return;
    }

    // Load Data
    getCurrentUser().then(setUser).catch(console.error);
    getProjects().then(data => {
      setProjects(data);
    }).catch(console.error);

    // AI Funnel Interceptor
    const pendingPrompt = localStorage.getItem("pending_ai_prompt");
    if (pendingPrompt) {
      localStorage.removeItem("pending_ai_prompt");
      handleCreateProject("AI Generated Project", pendingPrompt);
    }
  }, [navigate]);

  const handleCreateProject = async (title = "Untitled Project", prompt?: string) => {
    try {
      setIsCreating(true);
      const project = await createProject({ title, description: "Auto-generated project" });
      const mindMap = await createMindMap(project.id, {
        title,
        graph_data: "{}",
        ai_prompt: prompt ? prompt : undefined
      });
      navigate({ to: "/workspace", search: { mindMapId: mindMap.id, topic: prompt } });
    } catch (e) {
      console.error(e);
      alert("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) return;
    
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter(p => p.id !== projectId));
    } catch (e) {
      console.error(e);
      alert("Failed to delete project");
    }
  };

  const handleRenameSubmit = async (projectId: string, e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!renameValue.trim()) {
      setIsRenaming(null);
      return;
    }
    try {
      const updated = await updateProject(projectId, { title: renameValue });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, title: updated.title } : p));
    } catch (e) {
      console.error(e);
      alert("Failed to rename project");
    } finally {
      setIsRenaming(null);
    }
  };

  // Phase B: Filter & Stats Logic
  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [projects, searchQuery]);

  const stats = useMemo(() => {
    const totalMaps = projects.length;
    let totalNodes = 0;
    projects.forEach(p => {
      // Safely count nodes if available in nested map data
      if (p.mind_maps && p.mind_maps.length > 0) {
        totalNodes += (p.mind_maps[0] as any).node_count || 1; 
      }
    });

    return [
      { label: "Total Maps", icon: "account_tree", value: String(totalMaps), tone: "text-secondary" },
      { label: "Nodes Generated", icon: "auto_awesome", value: String(totalNodes || "1.2k"), tone: "text-tertiary" },
      { label: "Hours Saved", icon: "timer", value: String(Math.max(1, Math.floor(totalMaps * 0.5))), suffix: "h", tone: "text-secondary" },
    ];
  }, [projects]);

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden dot-matrix">
      {/* Mobile top bar */}
      <div className="md:hidden flex justify-between items-center w-full px-lg py-md bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 sticky top-0 z-50">
        <div className="flex items-center gap-sm">
          <img src={LOGO_URL} alt="MindVault AI logo" className="w-8 h-8 rounded-lg" />
          <span className="text-headline-md font-bold text-primary tracking-tight">
            MindVault AI
          </span>
        </div>
        <button
          aria-label="Open menu"
          className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high/50 transition-all"
        >
          <Icon name="menu" />
        </button>
      </div>

      <AppSidebar active="Projects" />

      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="sticky top-0 z-30 px-lg py-md bg-background flex flex-col md:flex-row justify-between items-center gap-md border-b border-outline-variant/30">
          <div className="relative w-full md:w-96">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]"
            />
            <input
              type="text"
              aria-label="Search mind maps"
              placeholder="Search mind maps, nodes, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-full py-2 pl-10 pr-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center gap-sm w-full md:w-auto justify-between md:justify-end">
            <button 
              className="flex items-center gap-xs px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors text-label-sm"
              onClick={() => alert("Advanced filters coming soon in Phase K")}
            >
              <Icon name="filter_list" className="text-[18px]" />
              Filters
            </button>
            <div className="flex items-center gap-xs border-l border-outline-variant/50 pl-sm ml-sm">
              <button
                aria-label="Grid view"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-surface-container text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
              >
                <Icon name="grid_view" className="text-[18px]" />
              </button>
              <button
                aria-label="List view"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-surface-container text-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
              >
                <Icon name="view_list" className="text-[18px]" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-lg md:p-xxl max-w-[1400px] mx-auto w-full flex flex-col gap-xl">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
            <div>
              <p className="text-body-lg text-on-surface-variant mb-1">Welcome back, {user?.full_name?.split(" ")[0] || "there"}.</p>
              <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
                Ready to map something new?
              </h1>
            </div>
            <button
              onClick={() => handleCreateProject()}
              disabled={isCreating}
              className="bg-primary-container text-white text-label-md rounded-xl py-2.5 px-6 flex items-center gap-2 ai-glow transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Icon name="add" />
              {isCreating ? "Creating..." : "New Project"}
            </button>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-lg flex flex-col justify-between h-32 hover:shadow-level-2 transition-shadow relative overflow-hidden group"
              >
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-tertiary-container/10 rounded-full blur-xl group-hover:bg-tertiary-container/20 transition-all" />
                <div className="flex justify-between items-start relative z-10">
                  <span className="text-label-md text-on-surface-variant uppercase tracking-wider">
                    {stat.label}
                  </span>
                  <Icon name={stat.icon} className={stat.tone} />
                </div>
                <div className="text-display text-on-surface relative z-10">
                  {stat.value}
                  {stat.suffix ? (
                    <span className="text-headline-md text-on-surface-variant ml-1">
                      {stat.suffix}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-md pb-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-headline-md text-on-surface">Recent Projects</h2>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-xl flex flex-col items-center justify-center text-center gap-md py-xxl">
                <Icon name="account_tree" className="text-[48px] text-outline mb-2" />
                <div>
                  <h3 className="text-headline-sm text-on-surface">No projects found</h3>
                  <p className="text-body-md text-on-surface-variant mt-1 max-w-sm">
                    {searchQuery ? "Try adjusting your search query." : "Create your first mind map manually or let AI generate one for you."}
                  </p>
                </div>
                {!searchQuery && (
                  <button
                    onClick={() => handleCreateProject()}
                    disabled={isCreating}
                    className="bg-primary-container text-white text-label-md rounded-xl py-2.5 px-6 flex items-center gap-2 ai-glow transition-all hover:-translate-y-0.5 mt-sm disabled:opacity-50"
                  >
                    <Icon name="add" />
                    {isCreating ? "Creating..." : "New Project"}
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
                {filteredProjects.map((project, i) => (
                  <Link
                    key={project.id}
                    to="/workspace"
                    search={{ mindMapId: project.mind_maps?.[0]?.id, topic: undefined }}
                    className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 overflow-hidden hover:shadow-level-2 transition-all group relative flex flex-col"
                  >
                    {project.description?.includes("AI") || project.description?.includes("Auto-generated") ? (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-violet z-10" />
                    ) : null}
                    <div className="h-40 bg-surface-container-low border-b border-outline-variant/30 relative overflow-hidden shrink-0">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:scale-105 transition-transform duration-500"
                        style={{ backgroundImage: `url('${PROJECT_THUMBS[i % PROJECT_THUMBS.length]}')` }}
                        role="img"
                        aria-label={`${project.title} mind map preview`}
                      />
                      {project.description?.includes("AI") || project.description?.includes("Auto-generated") ? (
                        <div className="absolute top-2 left-2 bg-surface/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1.5 border border-outline-variant/50">
                          <Icon name="auto_awesome" className="text-[14px] text-accent-violet" />
                          <span className="text-[10px] font-semibold text-on-surface uppercase tracking-wider">
                            AI Gen
                          </span>
                        </div>
                      ) : null}
                      
                      {/* Overflow Menu positioned top-right over image */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <button className="bg-surface/90 backdrop-blur-sm p-1.5 rounded-lg border border-outline-variant/50 text-on-surface hover:bg-surface hover:text-primary transition-colors">
                              <Icon name="more_vert" className="text-[18px]" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 z-50">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate({ to: "/workspace", search: { mindMapId: project.mind_maps?.[0]?.id, topic: undefined } }); }}>
                              <Icon name="open_in_new" className="mr-2 text-[18px]" /> Open Workspace
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameValue(project.title); setIsRenaming(project.id); }}>
                              <Icon name="edit" className="mr-2 text-[18px]" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); alert("Duplication coming soon (Phase K)"); }}>
                              <Icon name="content_copy" className="mr-2 text-[18px]" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); alert("Sharing coming soon (Phase K)"); }}>
                              <Icon name="share" className="mr-2 text-[18px]" /> Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-error focus:text-error focus:bg-error-container/30"
                              onClick={(e) => handleDeleteProject(project.id, e as any)}
                            >
                              <Icon name="delete" className="mr-2 text-[18px]" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="p-md flex flex-col flex-1">
                      {isRenaming === project.id ? (
                        <div 
                          className="mb-2"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        >
                          <form onSubmit={(e) => handleRenameSubmit(project.id, e)} className="flex items-center gap-2">
                            <input
                              autoFocus
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={(e) => handleRenameSubmit(project.id, e)}
                              onKeyDown={(e) => { if (e.key === 'Escape') setIsRenaming(null); }}
                              className="w-full bg-surface border border-primary rounded px-2 py-1 text-body-lg font-semibold focus:outline-none"
                            />
                          </form>
                        </div>
                      ) : (
                        <h3 className="text-body-lg text-on-surface font-semibold mb-2 truncate" title={project.title}>
                          {project.title}
                        </h3>
                      )}
                      
                      <div className="flex items-center gap-4 text-label-sm text-on-surface-variant mt-auto">
                        <span className="flex items-center gap-1 shrink-0" title="Created on">
                          <Icon name="calendar_today" className="text-[14px]" /> {new Date(project.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 shrink-0" title="Nodes inside">
                          <Icon name="account_tree" className="text-[14px]" /> {(project.mind_maps as any)?.[0]?.node_count || 1} Nodes
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col border border-outline-variant/50 rounded-xl overflow-hidden bg-surface-container-lowest">
                <div className="grid grid-cols-12 gap-4 p-md border-b border-outline-variant/50 bg-surface-container-low text-label-md font-semibold text-on-surface-variant">
                  <div className="col-span-6 md:col-span-5">Project Name</div>
                  <div className="col-span-3 hidden md:block">Type</div>
                  <div className="col-span-3">Nodes</div>
                  <div className="col-span-3 md:col-span-2 text-right">Created</div>
                  <div className="col-span-3 md:col-span-2 text-right md:hidden">Actions</div>
                </div>
                {filteredProjects.map((project) => (
                  <Link
                    key={project.id}
                    to="/workspace"
                    search={{ mindMapId: project.mind_maps?.[0]?.id, topic: undefined }}
                    className="grid grid-cols-12 gap-4 p-md items-center border-b border-outline-variant/30 last:border-0 hover:bg-surface-container-low/50 transition-colors group"
                  >
                    <div className="col-span-6 md:col-span-5 flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-surface-container border border-outline-variant/50 flex items-center justify-center shrink-0">
                        <Icon name="schema" className="text-primary text-[20px]" />
                      </div>
                      {isRenaming === project.id ? (
                        <form 
                          onSubmit={(e) => handleRenameSubmit(project.id, e)} 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          className="flex-1 w-full mr-4"
                        >
                          <input
                            autoFocus
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={(e) => handleRenameSubmit(project.id, e)}
                            onKeyDown={(e) => { if (e.key === 'Escape') setIsRenaming(null); }}
                            className="w-full bg-surface border border-primary rounded px-2 py-1 text-body-md font-semibold focus:outline-none"
                          />
                        </form>
                      ) : (
                        <span className="text-body-md font-semibold text-on-surface truncate">
                          {project.title}
                        </span>
                      )}
                    </div>
                    
                    <div className="col-span-3 hidden md:block">
                      {project.description?.includes("AI") || project.description?.includes("Auto-generated") ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-violet/10 text-accent-violet text-label-sm">
                          <Icon name="auto_awesome" className="text-[14px]" /> AI Gen
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-label-sm">
                          <Icon name="edit" className="text-[14px]" /> Manual
                        </span>
                      )}
                    </div>
                    
                    <div className="col-span-3 text-label-sm text-on-surface-variant flex items-center gap-1">
                      <Icon name="account_tree" className="text-[16px]" />
                      {(project.mind_maps as any)?.[0]?.node_count || 1}
                    </div>
                    
                    <div className="col-span-3 md:col-span-2 text-right text-label-sm text-on-surface-variant relative flex justify-end items-center">
                      <span className="group-hover:opacity-0 transition-opacity">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                      
                      {/* Hover Actions in List View */}
                      <div className="absolute right-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity bg-surface-container-lowest md:bg-transparent">
                        <button 
                          className="p-1.5 text-on-surface-variant hover:text-primary rounded"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRenameValue(project.title); setIsRenaming(project.id); }}
                          title="Rename"
                        >
                          <Icon name="edit" className="text-[18px]" />
                        </button>
                        <button 
                          className="p-1.5 text-on-surface-variant hover:text-error rounded"
                          onClick={(e) => handleDeleteProject(project.id, e as any)}
                          title="Delete"
                        >
                          <Icon name="delete" className="text-[18px]" />
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
