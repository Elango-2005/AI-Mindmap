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

const TITLE = "Templates - MindVault AI";
const DESCRIPTION = "Your recent mind maps, AI generation stats, and workspace shortcuts.";

export const Route = createFileRoute("/templates")({
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
      <AppLayout activeRoute="Templates">
        <div className="flex-1 overflow-y-auto w-full p-4 sm:p-xl">
          <header className="mb-8">
            <h1 className="text-headline-md sm:text-headline-lg text-on-surface">Template Gallery</h1>
            <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl">
              Choose a template below to instantly generate a complete, structured mind map.
            </p>
          </header>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-slide-up">
            {[
              { id: "brainstorm", title: "Brainstorming", desc: "Free-form ideation and concept mapping.", icon: "lightbulb", bg: "bg-blue-500/10", text: "text-blue-500" },
              { id: "planning", title: "Project Planning", desc: "Break down tasks, milestones, and deliverables.", icon: "task", bg: "bg-purple-500/10", text: "text-purple-500" },
              { id: "arch", title: "Architecture", desc: "System design and component relationships.", icon: "architecture", bg: "bg-emerald-500/10", text: "text-emerald-500" },
              { id: "meeting", title: "Meeting Notes", desc: "Structured agendas and action items.", icon: "groups", bg: "bg-orange-500/10", text: "text-orange-500" },
              { id: "org", title: "Org Chart", desc: "Team structure and reporting lines.", icon: "account_tree", bg: "bg-pink-500/10", text: "text-pink-500" },
              { id: "swot", title: "SWOT Analysis", desc: "Strengths, weaknesses, opportunities, threats.", icon: "analytics", bg: "bg-cyan-500/10", text: "text-cyan-500" },
            ].map(t => (
              <div key={t.id} className="bg-surface border border-outline-variant/30 rounded-2xl p-6 hover:border-primary/50 hover:shadow-level-1 transition-all flex flex-col group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${t.bg} ${t.text}`}>
                  <Icon name={t.icon} className="text-[24px]" />
                </div>
                <h3 className="text-title-lg font-bold text-on-surface mb-2 group-hover:text-primary transition-colors">{t.title}</h3>
                <p className="text-body-sm text-on-surface-variant mb-6 flex-1">{t.desc}</p>
                <button
                  onClick={() => setIsTemplatesOpen(true)}
                  className="w-full bg-surface-container hover:bg-primary/10 text-primary font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Use Template <Icon name="arrow_forward" className="text-[18px]" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <TemplatesModal isOpen={isTemplatesOpen} onClose={() => setIsTemplatesOpen(false)} />
      </AppLayout>
  );
}
