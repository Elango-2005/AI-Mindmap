import re

def rewrite_projects():
    with open("frontend/src/routes/projects.tsx", "r", encoding="utf-8") as f:
        content = f.read()
        
    old_card_code = """<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project, i) => (
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
                  
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                        <button className="bg-surface/90 backdrop-blur-sm p-1.5 rounded-lg border border-outline-variant/50 text-on-surface hover:bg-surface hover:text-primary transition-colors">
                          <Icon name="more_vert" className="text-[18px]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 z-50">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate({ to: "/workspace/$mindMapId", params: { mindMapId: project.mind_maps?.[0]?.id || "" } }); }}>
                          <Icon name="open_in_new" className="mr-2 text-[18px]" /> Open Workspace
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameValue(project.title); setIsRenaming(project.id); }}>
                          <Icon name="edit" className="mr-2 text-[18px]" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); alert("Duplication coming soon"); }}>
                          <Icon name="content_copy" className="mr-2 text-[18px]" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); alert("Sharing coming soon"); }}>
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
          </div>"""

    content = re.sub(r'<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">.*?</div>\s*</div>\s*</AppLayout>', old_card_code + '\n        </div>\n      </AppLayout>', content, flags=re.DOTALL)
    
    with open("frontend/src/routes/projects.tsx", "w", encoding="utf-8") as f:
        f.write(content)
        
def rewrite_dashboard():
    with open("frontend/src/routes/dashboard.tsx", "r", encoding="utf-8") as f:
        content = f.read()

    dashboard_card_code = """<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              </div>"""

    content = re.sub(r'<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">.*?</section>\s*</div>\s*</div>\s*</AppLayout>', dashboard_card_code + '\n            </section>\n          </div>\n        </div>\n      </AppLayout>', content, flags=re.DOTALL)
    
    with open("frontend/src/routes/dashboard.tsx", "w", encoding="utf-8") as f:
        f.write(content)

rewrite_projects()
rewrite_dashboard()
print("Restored old style cards")
