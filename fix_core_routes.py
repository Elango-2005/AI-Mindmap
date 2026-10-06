import re
import os

def fix_route(path, new_return):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find where return ( starts
    return_idx = content.find("return (")
    if return_idx == -1: 
        print(f"return not found in {path}")
        return
    
    pre_return = content[:return_idx]
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(pre_return + new_return)

# DASHBOARD
dashboard_return = '''return (
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
                {projects.slice(0, 3).map(project => (
                  <Link
                    key={project.id}
                    to="/workspace/$mindMapId"
                    params={{ mindMapId: project.mind_maps?.[0]?.id || "" }}
                    className="bg-surface border border-outline-variant/30 rounded-xl p-6 hover:shadow-level-1 hover:border-primary/40 transition-all flex flex-col group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon name="account_tree" className="text-[20px]" />
                      </div>
                    </div>
                    <h3 className="text-title-md font-bold text-on-surface mb-2 group-hover:text-primary transition-colors line-clamp-1">{project.title}</h3>
                    <p className="text-body-sm text-on-surface-variant line-clamp-2 mb-4 flex-1">
                      {project.description || "No description"}
                    </p>
                    <div className="text-label-sm text-on-surface-variant flex items-center gap-2">
                      <Icon name="schedule" className="text-[14px]" />
                      {new Date(project.updated_at).toLocaleDateString()}
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
'''

# PROJECTS
projects_return = '''return (
      <AppLayout activeRoute="Projects">
        <div className="flex-1 overflow-y-auto w-full p-4 sm:p-xl">
          <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-headline-md sm:text-headline-lg text-on-surface">Projects</h1>
              <p className="text-body-md text-on-surface-variant mt-1">
                Manage all your knowledge maps.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-64 hidden md:block">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface-container border border-outline-variant/30 rounded-lg text-body-md focus:outline-none focus:border-primary/50"
                />
              </div>
              <button
                onClick={() => handleCreateProject()}
                disabled={isCreating}
                className="bg-primary text-on-primary px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Icon name="add" className="text-[18px]" />
                New Project
              </button>
            </div>
          </header>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map(project => (
              <div key={project.id} className="bg-surface border border-outline-variant/30 rounded-xl hover:shadow-level-1 hover:border-primary/40 transition-all flex flex-col group relative overflow-hidden">
                <Link
                  to="/workspace/$mindMapId"
                  params={{ mindMapId: project.mind_maps?.[0]?.id || "" }}
                  className="p-6 flex flex-col flex-1"
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-container text-primary flex items-center justify-center shrink-0 mb-4 border border-outline-variant/30">
                    <Icon name="folder" className="text-[20px]" />
                  </div>
                  <h3 className="text-title-md font-bold text-on-surface mb-2 group-hover:text-primary transition-colors line-clamp-1">{project.title}</h3>
                  <p className="text-body-sm text-on-surface-variant line-clamp-2 mb-4 flex-1">
                    {project.description || "No description"}
                  </p>
                  <div className="text-label-sm text-on-surface-variant flex items-center gap-2 mt-auto">
                    <Icon name="calendar_today" className="text-[14px]" />
                    {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </Link>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteProject(project.id, e as any); }}
                    className="p-1.5 text-on-surface-variant hover:text-error bg-surface rounded shadow-sm border border-outline-variant/30"
                    title="Delete Project"
                  >
                    <Icon name="delete" className="text-[16px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
  );
}
'''

# TEMPLATES
templates_return = '''return (
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
'''

fix_route("frontend/src/routes/dashboard.tsx", dashboard_return)
fix_route("frontend/src/routes/projects.tsx", projects_return)
fix_route("frontend/src/routes/templates.tsx", templates_return)
print("Fixed core routes")
