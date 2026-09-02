import { Link, useNavigate } from "@tanstack/react-router";
import { Icon } from "@/components/Icon";
import { LOGO_URL } from "@/lib/assets";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { createProject } from "@/api/projects";
import { createMindMap } from "@/api/mindmaps";

type NavItem = { label: string; icon: string; to: string };

const NAV: NavItem[] = [
  { label: "Projects", icon: "folder_open", to: "/dashboard" },
  { label: "Templates", icon: "auto_awesome_motion", to: "/dashboard" },
  { label: "History", icon: "history", to: "/dashboard" },
  { label: "Settings", icon: "settings", to: "/settings" },
];

export function AppSidebar({
  active = "Projects",
  showBrand = true,
  ctaVariant = "primary",
}: {
  active?: string;
  showBrand?: boolean;
  ctaVariant?: "primary" | "muted";
}) {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      const project = await createProject("Untitled Project", "Auto-generated project");
      const mindMap = await createMindMap(project.id, "Untitled Project", "{}");
      navigate({ to: "/workspace", search: { mindMapId: mindMap.id } });
    } catch (e) {
      console.error(e);
      alert("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className="hidden md:flex w-[280px] shrink-0 flex-col h-full bg-surface border-r border-outline-variant/20 p-md gap-sm">
      {showBrand ? (
        <div className="flex items-center gap-md px-md py-sm mb-lg">
          <img alt="MindVault AI logo" className="w-10 h-10 rounded-lg" src={LOGO_URL} />
          <div>
            <h2 className="text-headline-md text-on-surface">Knowledge Hub</h2>
            <p className="text-label-sm text-on-surface-variant">Premium AI Workspace</p>
          </div>
        </div>
      ) : (
        <div className="mb-lg px-sm pt-sm">
          <h2 className="text-headline-md text-on-surface">Knowledge Hub</h2>
          <p className="text-label-sm text-on-surface-variant">Premium AI Workspace</p>
        </div>
      )}

      {ctaVariant === "muted" ? (
        <button 
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full bg-surface-container text-on-surface py-sm px-md rounded-lg mb-md flex items-center justify-center gap-sm text-label-md hover:bg-surface-container-highest transition-all disabled:opacity-50"
        >
          <Icon name="add" className="text-[18px]" />
          {isCreating ? "Creating..." : "New MindMap"}
        </button>
      ) : null}

      <nav className="flex-1 flex flex-col gap-xs">
        {NAV.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className={cn(
              "flex items-center gap-md px-md py-sm rounded-xl transition-all duration-200 text-label-md",
              active === item.label
                ? "bg-secondary-fixed text-on-secondary-fixed font-bold shadow-sm translate-x-1"
                : "text-on-surface-variant hover:bg-surface-container-low",
            )}
          >
            <Icon name={item.icon} filled={active === item.label} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-sm">
        {ctaVariant === "primary" ? (
          <button 
            onClick={handleCreate}
            disabled={isCreating}
            className="bg-primary-container text-white text-label-md rounded-xl py-sm px-md flex items-center justify-center gap-sm ai-glow transition-all mb-md disabled:opacity-50"
          >
            <Icon name="add" />
            {isCreating ? "Creating..." : "New MindMap"}
          </button>
        ) : null}
        <a
          href="#help"
          className="text-on-surface-variant flex items-center gap-md px-md py-sm rounded-xl hover:bg-surface-container-low transition-all duration-200 text-label-md"
        >
          <Icon name="help_outline" />
          <span>Help Center</span>
        </a>
        <a
          href="#account"
          className="text-on-surface-variant flex items-center gap-md px-md py-sm rounded-xl hover:bg-surface-container-low transition-all duration-200 text-label-md"
        >
          <Icon name="person" />
          <span>Account</span>
        </a>
      </div>
    </aside>
  );
}
