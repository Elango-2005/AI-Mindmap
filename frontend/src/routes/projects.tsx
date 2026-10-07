import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";
import { PROJECT_THUMBS } from "@/lib/assets";
import { getProjects, deleteProject, updateProject, type Project } from "@/api/projects";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const TITLE = "Projects - MindVault AI";
const DESCRIPTION = "All your knowledge maps.";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
    ],
  }),
  component: Projects,
});

type SortOption = "updated_desc" | "created_desc" | "name_asc" | "name_desc";
type FilterOption = "all" | "ai" | "manual";
type ViewMode = "grid" | "list";

function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Filtering & Sorting
  const [sortBy, setSortBy] = useState<SortOption>("updated_desc");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

  // View Mode (Persisted)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem("projects_view_mode") as ViewMode) || "grid";
  });

  // Rename state
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      navigate({ to: "/login" });
      return;
    }
    getProjects().then(setProjects).catch(console.error);
  }, [navigate]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    localStorage.setItem("projects_view_mode", viewMode);
  }, [viewMode]);

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

  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects];

    // 1. Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // 2. Filter
    if (filterBy === "ai") {
      result = result.filter(p => p.description?.includes("Auto-generated") || p.description?.includes("AI"));
    } else if (filterBy === "manual") {
      result = result.filter(p => !p.description?.includes("Auto-generated") && !p.description?.includes("AI"));
    }

    // 3. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "updated_desc":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case "created_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "name_asc":
          return a.title.localeCompare(b.title);
        case "name_desc":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return result;
  }, [projects, debouncedSearch, filterBy, sortBy]);

  return (
    <AppLayout activeRoute="Projects">
      <div className="flex-1 overflow-y-auto w-full p-6 md:p-10 lg:p-12 max-w-[1400px] mx-auto">
        <header className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-semibold text-on-surface tracking-tight mb-2">Projects</h1>
              <p className="text-lg text-on-surface-variant">
                Your maps, research and ideas in one place.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors shadow-sm"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors shadow-sm">
                    <Icon name="filter_list" className="text-[18px]" />
                    Filter
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Project Type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={filterBy} onValueChange={(v) => setFilterBy(v as FilterOption)}>
                    <DropdownMenuRadioItem value="all">All Maps</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="ai">AI Generated</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="manual">Manually Created</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors shadow-sm">
                    <Icon name="sort" className="text-[18px]" />
                    Sort
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <DropdownMenuRadioItem value="updated_desc">Recently updated</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="created_desc">Recently created</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_asc">Name A–Z</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_desc">Name Z–A</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex bg-surface-container-lowest border border-outline-variant/40 rounded-lg shadow-sm overflow-hidden p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}
                  title="Grid View"
                >
                  <Icon name="grid_view" className="text-[18px]" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}
                  title="List View"
                >
                  <Icon name="view_list" className="text-[18px]" />
                </button>
              </div>

              <Link
                to="/projects/new"
                className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm ml-auto sm:ml-0"
              >
                <Icon name="add" className="text-[18px]" />
                New Project
              </Link>
            </div>
          </div>
        </header>
        
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
            <div className="w-16 h-16 bg-surface-container-low flex items-center justify-center rounded-2xl mb-6 shadow-sm border border-outline-variant/20">
              <Icon name="map" className="text-[32px] text-on-surface-variant" />
            </div>
            <h3 className="text-2xl font-medium text-on-surface mb-3 tracking-tight">Your workspace is empty.</h3>
            <p className="text-on-surface-variant mb-8 max-w-md text-base">
              Create your first mind map from an idea, document or template.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
               <Link
                  to="/projects/new"
                  className="bg-primary text-on-primary px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="auto_awesome" className="text-[18px]" /> Create with AI
                </Link>
                <Link
                  to="/templates"
                  className="bg-surface-container-lowest border border-outline-variant/40 text-on-surface px-6 py-3 rounded-xl font-medium hover:bg-surface-container-low transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Icon name="auto_awesome_motion" className="text-[18px]" /> Start from template
                </Link>
            </div>
          </div>
        ) : filteredAndSortedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-outline-variant/50 rounded-2xl bg-surface-container-lowest/50">
            <Icon name="search_off" className="text-[48px] text-on-surface-variant mb-4" />
            <h3 className="text-xl font-medium text-on-surface mb-2">No projects found</h3>
            <p className="text-on-surface-variant max-w-md">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredAndSortedProjects.map((project, i) => {
              const isAiGen = project.description?.includes("Auto-generated") || project.description?.includes("AI");
              return (
                <Link
                  key={project.id}
                  to="/workspace/$mindMapId"
                  params={{ mindMapId: project.mind_maps?.[0]?.id || "" }}
                  className="group relative flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-2xl hover:border-primary/30 hover:shadow-level-1 transition-all"
                >
                  <div className="h-44 rounded-t-2xl bg-surface-container-low border-b border-outline-variant/20 overflow-hidden relative shrink-0">
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                      style={{ backgroundImage: `url('${PROJECT_THUMBS[i % PROJECT_THUMBS.length]}')` }}
                      role="img"
                    />
                    {isAiGen && (
                      <div className="absolute top-3 left-3 bg-surface/95 backdrop-blur-md rounded-full px-2 py-1 flex items-center gap-1 border border-outline-variant/20 shadow-sm">
                        <Icon name="auto_awesome" className="text-[12px] text-accent-violet" />
                        <span className="text-[10px] font-semibold text-on-surface uppercase tracking-wider">AI Gen</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                          <button className="bg-surface/95 backdrop-blur-md p-1.5 rounded-lg border border-outline-variant/20 text-on-surface hover:text-primary hover:shadow-sm transition-all">
                            <Icon name="more_vert" className="text-[20px]" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-level-2">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate({ to: "/workspace/$mindMapId", params: { mindMapId: project.mind_maps?.[0]?.id || "" } }); }}>
                            <Icon name="open_in_new" className="mr-2 text-[18px]" /> Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameValue(project.title); setIsRenaming(project.id); }}>
                            <Icon name="edit" className="mr-2 text-[18px]" /> Rename
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
                  
                  <div className="p-4 flex flex-col flex-1">
                    {isRenaming === project.id ? (
                      <div className="mb-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <form onSubmit={(e) => handleRenameSubmit(project.id, e)} className="flex items-center gap-2">
                          <input
                            autoFocus
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={(e) => handleRenameSubmit(project.id, e)}
                            onKeyDown={(e) => { if (e.key === 'Escape') setIsRenaming(null); }}
                            className="w-full bg-surface border border-primary/50 rounded-md px-2 py-1 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                          />
                        </form>
                      </div>
                    ) : (
                      <h3 className="text-base text-on-surface font-semibold mb-1 truncate group-hover:text-primary transition-colors" title={project.title}>
                        {project.title}
                      </h3>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-on-surface-variant mt-auto pt-3 border-t border-outline-variant/10">
                      <span className="flex items-center gap-1.5" title="Last modified">
                        <Icon name="update" className="text-[14px]" />
                        {new Date(project.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 p-4 border-b border-outline-variant/30 bg-surface-container-low text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              <div>Name</div>
              <div className="w-32 hidden sm:block">Type</div>
              <div className="w-32 hidden md:block">Last Modified</div>
              <div className="w-10"></div>
            </div>
            <div className="divide-y divide-outline-variant/20">
              {filteredAndSortedProjects.map((project) => {
                const isAiGen = project.description?.includes("Auto-generated") || project.description?.includes("AI");
                return (
                  <Link
                    key={project.id}
                    to="/workspace/$mindMapId"
                    params={{ mindMapId: project.mind_maps?.[0]?.id || "" }}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-4 p-4 items-center hover:bg-surface-container/30 transition-colors group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded bg-surface-container-high shrink-0 flex items-center justify-center text-on-surface-variant">
                        <Icon name="account_tree" className="text-[20px]" />
                      </div>
                      <div className="min-w-0">
                        {isRenaming === project.id ? (
                          <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <form onSubmit={(e) => handleRenameSubmit(project.id, e)}>
                              <input
                                autoFocus
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={(e) => handleRenameSubmit(project.id, e)}
                                onKeyDown={(e) => { if (e.key === 'Escape') setIsRenaming(null); }}
                                className="w-full bg-surface border border-primary/50 rounded px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                            </form>
                          </div>
                        ) : (
                          <h3 className="text-sm font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                            {project.title}
                          </h3>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-32 hidden sm:flex items-center text-sm text-on-surface-variant">
                      {isAiGen ? (
                        <span className="flex items-center gap-1.5"><Icon name="auto_awesome" className="text-[14px]" /> AI Gen</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><Icon name="edit" className="text-[14px]" /> Manual</span>
                      )}
                    </div>
                    
                    <div className="w-32 hidden md:flex items-center text-sm text-on-surface-variant">
                      {new Date(project.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    
                    <div className="w-10 flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                          <button className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors opacity-0 group-hover:opacity-100">
                            <Icon name="more_vert" className="text-[20px]" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-level-2">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate({ to: "/workspace/$mindMapId", params: { mindMapId: project.mind_maps?.[0]?.id || "" } }); }}>
                            <Icon name="open_in_new" className="mr-2 text-[18px]" /> Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameValue(project.title); setIsRenaming(project.id); }}>
                            <Icon name="edit" className="mr-2 text-[18px]" /> Rename
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
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
