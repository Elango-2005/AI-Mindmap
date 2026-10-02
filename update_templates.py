import os
path = "frontend/src/routes/templates.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('export const Route = createFileRoute("/dashboard")({', 'export const Route = createFileRoute("/templates")({')
content = content.replace('const TITLE = "Dashboard - MindVault AI";', 'const TITLE = "Templates - MindVault AI";')
content = content.replace('import { AppSidebar } from "@/components/AppSidebar";', 'import { AppLayout } from "@/components/AppLayout";\nimport { Link } from "@tanstack/react-router";')

import re
content = re.sub(
    r'return \(\s*<div className="flex h-screen w-full bg-background overflow-hidden relative">.*?</main>\s*(<TemplatesModal[^>]+>)?\s*</div>\s*\);',
    '''return (
      <AppLayout activeRoute="Templates">
        <div className="flex-1 overflow-y-auto w-full p-4 sm:p-xl">
          <header className="mb-8">
            <h1 className="text-headline-md sm:text-headline-lg text-on-surface">Template Gallery</h1>
            <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl">
              Choose a template below to instantly generate a complete, structured mind map. Our AI models have curated these architectures based on industry best practices.
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
                  className="w-full bg-surface-container-low hover:bg-primary/10 text-primary font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Use Template <Icon name="arrow_forward" className="text-[18px]" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <TemplatesModal isOpen={isTemplatesOpen} onClose={() => setIsTemplatesOpen(false)} />
      </AppLayout>
    );''',
    content,
    flags=re.DOTALL
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated templates")
