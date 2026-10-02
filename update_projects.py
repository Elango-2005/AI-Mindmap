import os
path = "frontend/src/routes/projects.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('export const Route = createFileRoute("/dashboard")({', 'export const Route = createFileRoute("/projects")({')
content = content.replace('const TITLE = "Dashboard - MindVault AI";', 'const TITLE = "Projects - MindVault AI";')
content = content.replace('import { AppSidebar } from "@/components/AppSidebar";', 'import { AppLayout } from "@/components/AppLayout";\nimport { Link } from "@tanstack/react-router";')

import re
content = re.sub(
    r'return \(\s*<div className="flex h-screen w-full bg-background overflow-hidden relative">.*?</main>\s*(<TemplatesModal[^>]+>)?\s*</div>\s*\);',
    '''return (
      <AppLayout activeRoute="Projects">
        <div className="flex-1 overflow-y-auto w-full">
          <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-xl border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md sticky top-0 z-40 hidden md:flex">
            <div className="flex items-center gap-2 text-on-surface">
              <h1 className="text-title-lg font-medium">Projects</h1>
            </div>
            
            <div className="relative w-full max-w-md hidden lg:block">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" />
              <input
                type="text"
                placeholder="Search maps or projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant/30 rounded-xl text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center bg-surface-container-low rounded-lg p-1 border border-outline-variant/30">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-surface shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"}`}
                >
                  <Icon name="grid_view" className="text-[18px]" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-surface shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"}`}
                >
                  <Icon name="view_list" className="text-[18px]" />
                </button>
              </div>
              <button
                onClick={() => handleCreateProject()}
                disabled={isCreating}
                className="bg-primary text-on-primary text-label-md rounded-xl py-2 px-4 flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Icon name="add" />
                New Project
              </button>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 sm:px-xl py-6 sm:py-xl">
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
                <Icon name="folder_open" className="text-on-surface-variant/50 text-4xl mb-2" />
                <p className="text-body-md text-on-surface-variant">No projects found.</p>
              </div>
            ) : (
              <div className={`grid gap-4 animate-slide-up ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {filteredProjects.map((project) => (
                  <div key={project.id} className="group relative bg-surface border border-outline-variant/30 rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-level-1 transition-all flex flex-col cursor-pointer">
                    {viewMode === 'grid' && (
                      <div className="h-32 bg-surface-container-lowest border-b border-outline-variant/30 relative overflow-hidden flex items-center justify-center">
                        <Icon name="account_tree" className="text-outline-variant/30 text-[64px]" />
                      </div>
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between mb-2">
                        {isRenaming === project.id ? (
                          <div className="flex-1 mr-2 flex items-center gap-2">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit(project.id);
                                if (e.key === 'Escape') setIsRenaming(null);
                              }}
                              className="w-full bg-surface-container border border-primary/50 rounded px-2 py-1 text-title-md font-bold text-on-surface focus:outline-none"
                              autoFocus
                            />
                            <button onClick={() => handleRenameSubmit(project.id)} className="text-primary hover:bg-primary/10 p-1 rounded">
                              <Icon name="check" className="text-[18px]" />
                            </button>
                            <button onClick={() => setIsRenaming(null)} className="text-on-surface-variant hover:bg-surface-container p-1 rounded">
                              <Icon name="close" className="text-[18px]" />
                            </button>
                          </div>
                        ) : (
                          <h3 className="text-title-md font-bold text-on-surface truncate pr-2 group-hover:text-primary transition-colors">{project.title}</h3>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="p-1 -mr-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                              <Icon name="more_vert" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startRename(project); }}>
                              <Icon name="edit" className="mr-2 text-[18px]" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-error focus:bg-error/10 focus:text-error" onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}>
                              <Icon name="delete" className="mr-2 text-[18px]" /> Delete Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                          Open Map <Icon name="arrow_forward" className="inline text-[14px]" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    );''',
    content,
    flags=re.DOTALL
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated projects")
