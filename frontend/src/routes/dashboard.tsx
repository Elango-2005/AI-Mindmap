import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";
import { PROJECT_THUMBS } from "@/lib/assets";
import { getProjects, type Project } from "@/api/projects";
import { getCurrentUser } from "@/api/auth";

const TITLE = "Dashboard - MindVault AI";
const DESCRIPTION = "Your recent mind maps and workspace shortcuts.";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<{ full_name: string } | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      navigate({ to: "/login" });
      return;
    }
    getCurrentUser().then(setUser).catch(console.error);
    getProjects().then(setProjects).catch(console.error);
  }, [navigate]);

  return (
    <AppLayout activeRoute="Dashboard">
      <div className="flex-1 overflow-y-auto w-full p-8 md:p-12 lg:p-16 max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-semibold text-on-surface tracking-tight mb-2">
            Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ""}
          </h1>
          <p className="text-lg text-on-surface-variant">
            What would you like to map out today?
          </p>
        </header>

        <section className="mb-16">
          <div className="relative max-w-3xl">
            <div className="relative flex items-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm focus-within:border-primary/50 focus-within:shadow-md transition-all overflow-hidden cursor-text" onClick={() => navigate({ to: "/projects/new" })}>
              <div className="pl-6 pr-3 py-4 text-on-surface-variant">
                <Icon name="auto_awesome" className="text-[24px]" />
              </div>
              <input
                type="text"
                readOnly
                placeholder="Describe a topic to map out, or leave blank for an empty canvas..."
                className="flex-1 bg-transparent border-none text-body-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none py-5 pr-4 cursor-pointer"
              />
              <div className="pr-3 pl-2">
                <Link
                  to="/projects/new"
                  className="bg-primary text-on-primary px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  Create
                </Link>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm text-on-surface-variant">
              <span>Or start with:</span>
              <Link 
                to="/projects/new"
                className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
              >
                <Icon name="add" className="text-[16px]" /> Blank Canvas
              </Link>
              <span className="text-outline-variant/50">•</span>
              <Link to="/templates" className="hover:text-primary transition-colors flex items-center gap-1 font-medium">
                <Icon name="auto_awesome_motion" className="text-[16px]" /> Templates
              </Link>
            </div>
          </div>
        </section>

        {projects.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-on-surface tracking-tight">Recent Projects</h2>
              <Link to="/projects" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                View all <Icon name="arrow_forward" className="text-[16px]" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.slice(0, 3).map((project, i) => (
                <Link
                  key={project.id}
                  to="/workspace/$mindMapId"
                  params={{ mindMapId: project.mind_maps?.[0]?.id || "" }}
                  className="group relative flex flex-col bg-transparent rounded-2xl transition-all"
                >
                  <div className="h-48 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden relative mb-4 group-hover:border-primary/30 group-hover:shadow-sm transition-all">
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                      style={{ backgroundImage: `url('${PROJECT_THUMBS[i % PROJECT_THUMBS.length]}')` }}
                      role="img"
                      aria-label={`${project.title} preview`}
                    />
                    {(project.description?.includes("AI") || project.description?.includes("Auto-generated")) && (
                      <div className="absolute top-3 left-3 bg-surface/90 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5 border border-outline-variant/20 shadow-sm">
                        <Icon name="auto_awesome" className="text-[14px] text-accent-violet" />
                        <span className="text-xs font-medium text-on-surface">AI Generated</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="px-1 flex flex-col">
                    <h3 className="text-base text-on-surface font-medium mb-1 truncate group-hover:text-primary transition-colors" title={project.title}>
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        {new Date(project.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
