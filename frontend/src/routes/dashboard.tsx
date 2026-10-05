import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";

import { Icon } from "@/components/Icon";
import { LOGO_URL, PROJECT_THUMBS } from "@/lib/assets";
import { getProjects, createProject, deleteProject, updateProject, type Project } from "@/api/projects";
import { createMindMap } from "@/api/mindmaps";
import { getCurrentUser } from "@/api/auth";
import { TemplatesModal } from "@/components/TemplatesModal";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";

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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

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
      <AppLayout activeRoute="Dashboard">
        <div className="flex-1 overflow-y-auto w-full p-4 sm:p-xl">
          <header className="mb-8">
            <h1 className="text-headline-md sm:text-headline-lg text-on-surface">Dashboard</h1>
            <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl">
              Welcome back to your workspace.
            </p>
          </header>
          
          <div className="flex flex-col gap-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title-lg font-bold text-on-surface">Quick Actions</h2>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => handleCreateProject()}
                  disabled={isCreating}
                  className="bg-primary text-on-primary px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Icon name="add" className="text-[20px]" />
                  {isCreating ? "Creating..." : "New Mind Map"}
                </button>
                <Link
                  to="/templates"
                  className="bg-surface-container text-on-surface px-6 py-3 rounded-xl font-medium hover:bg-surface-container-high transition-colors flex items-center gap-2 border border-outline-variant/30"
                >
                  <Icon name="auto_awesome_motion" className="text-[20px]" />
                  Explore Templates
                </Link>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title-lg font-bold text-on-surface">Recent Projects</h2>
                <Link to="/projects" className="text-primary font-medium hover:underline flex items-center gap-1">
                  View all <Icon name="arrow_forward" className="text-[16px]" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.slice(0, 3).map((project, i) => (
                  <Link
                    key={project.id}
                    to="/workspace/$mindMapId"
                    params={{ mindMapId: project.mind_maps?.[0]?.id || "" }}
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
                    </div>
                    
                    <div className="p-md flex flex-col flex-1">
                      <h3 className="text-body-lg text-on-surface font-semibold mb-2 truncate" title={project.title}>
                        {project.title}
                      </h3>
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
            </section>
          </div>
        </div>
      </AppLayout>
  );
}
