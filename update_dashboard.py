import os

path = "frontend/src/routes/dashboard.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('import { AppSidebar } from "@/components/AppSidebar";', 'import { AppLayout } from "@/components/AppLayout";\nimport { Link } from "@tanstack/react-router";')

# Replace the layout
import re
content = re.sub(
    r'return \(\s*<div className="flex h-screen w-full bg-background overflow-hidden relative">.*?</main>\s*(<TemplatesModal[^>]+>)?\s*</div>\s*\);',
    '''return (
      <AppLayout activeRoute="Dashboard">
        <div className="flex-1 overflow-y-auto w-full">
          <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-xl border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md sticky top-0 z-40 hidden md:flex">
            <h1 className="text-title-lg font-medium text-on-surface">Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-body-md text-on-surface-variant font-medium">
                {user?.name || "Loading..."}
              </span>
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-4 sm:px-xl py-6 sm:py-xl">
            <section className="mb-xl animate-slide-up" style={{ animationDelay: "100ms" }}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-md gap-4">
                <div>
                  <h2 className="text-headline-md sm:text-headline-lg text-on-surface">Smart Templates</h2>
                  <p className="text-body-sm sm:text-body-md text-on-surface-variant mt-0.5">Kickstart your thought mapping</p>
                </div>
                <div className="flex gap-3">
                  <Link
                    to="/templates"
                    className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-label-md rounded-xl py-2.5 px-6 flex items-center gap-2 transition-all hover:-translate-y-0.5 border border-outline-variant/30"
                  >
                    <Icon name="auto_awesome_motion" />
                    Explore Templates
                  </Link>
                  <button
                    onClick={() => handleCreateProject()}
                    disabled={isCreating}
                    className="bg-primary-container text-white text-label-md rounded-xl py-2.5 px-6 flex items-center gap-2 ai-glow transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <Icon name="add" />
                    {isCreating ? "Creating..." : "New Project"}
                  </button>
                </div>
              </div>

              <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {[
                  { id: "brainstorm", title: "Brainstorming", icon: "lightbulb", bg: "bg-blue-500/10", text: "text-blue-500" },
                  { id: "planning", title: "Project Planning", icon: "task", bg: "bg-purple-500/10", text: "text-purple-500" },
                  { id: "arch", title: "Architecture", icon: "architecture", bg: "bg-emerald-500/10", text: "text-emerald-500" },
                ].map(t => (
                  <Link
                    key={t.id}
                    to="/templates"
                    className="snap-start shrink-0 w-[240px] p-5 rounded-2xl bg-surface border border-outline-variant/30 hover:border-primary/50 hover:shadow-level-1 transition-all text-left group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${t.bg} ${t.text}`}>
                      <Icon name={t.icon} />
                    </div>
                    <h3 className="text-body-lg font-bold text-on-surface group-hover:text-primary transition-colors">{t.title}</h3>
                    <p className="text-body-sm text-on-surface-variant mt-1">Curated knowledge map</p>
                  </Link>
                ))}
                <Link
                  to="/templates"
                  className="snap-start shrink-0 w-[240px] p-5 rounded-2xl bg-surface-container-low border border-dashed border-outline-variant hover:border-primary/50 hover:bg-surface transition-all flex flex-col items-center justify-center text-center gap-2 group"
                >
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                    <Icon name="arrow_forward" />
                  </div>
                  <span className="text-body-md font-semibold text-on-surface-variant group-hover:text-primary">View all templates</span>
                </Link>
              </div>
            </section>

            <section className="flex flex-col gap-md pb-xl">
              <div className="flex justify-between items-center">
                <h2 className="text-headline-md text-on-surface">Recent Projects</h2>
                <Link to="/projects" className="text-primary text-label-md hover:underline font-semibold flex items-center gap-1">
                  View all <Icon name="arrow_forward" className="text-[16px]" />
                </Link>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
                  <Icon name="folder_open" className="text-on-surface-variant/50 text-4xl mb-2" />
                  <p className="text-body-md text-on-surface-variant">No projects yet. Create one to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: "150ms" }}>
                  {filteredProjects.slice(0, 4).map((project) => (
                    <div key={project.id} className="group relative bg-surface border border-outline-variant/30 rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-level-1 transition-all flex flex-col cursor-pointer">
                      <div className="h-32 bg-surface-container-lowest border-b border-outline-variant/30 relative overflow-hidden flex items-center justify-center">
                        <Icon name="account_tree" className="text-outline-variant/30 text-[64px]" />
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-title-md font-bold text-on-surface truncate pr-2 group-hover:text-primary transition-colors">{project.title}</h3>
                        </div>
                        <p className="text-body-sm text-on-surface-variant mb-4 line-clamp-2">{project.description}</p>
                        <div className="mt-auto flex justify-between items-center text-label-sm text-on-surface-variant">
                          <div className="flex items-center gap-1">
                            <Icon name="update" className="text-[14px]" />
                            {new Date(project.updated_at).toLocaleDateString()}
                          </div>
                          <Link
                            to="/workspace/$mindMapId"
                            params={{ mindMapId: project.mind_maps?.[0]?.id || "" }}
                            className="text-primary font-bold hover:underline"
                          >
                            Open
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </AppLayout>
    );''',
    content,
    flags=re.DOTALL
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated dashboard")
