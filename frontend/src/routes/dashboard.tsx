import { createFileRoute, Link } from "@tanstack/react-router";
import { AppSidebar } from "@/components/AppSidebar";
import { Icon } from "@/components/Icon";
import { SiteFooter } from "@/components/SiteFooter";
import { LOGO_URL, PROJECT_THUMBS } from "@/lib/assets";

const TITLE = "Dashboard — MindVault AI";
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

const STATS = [
  { label: "Total Maps", icon: "account_tree", value: "24", tone: "text-secondary" },
  { label: "Nodes Generated", icon: "auto_awesome", value: "1.2k", tone: "text-tertiary" },
  { label: "Hours Saved", icon: "timer", value: "15", suffix: "h", tone: "text-secondary" },
];

const PROJECTS = [
  {
    title: "Q4 Product Strategy Architecture",
    when: "2 hrs ago",
    nodes: "142 Nodes",
    thumb: PROJECT_THUMBS[0],
    ai: true,
  },
  {
    title: "User Research Synthesis",
    when: "Yesterday",
    nodes: "68 Nodes",
    thumb: PROJECT_THUMBS[1],
    ai: false,
  },
  {
    title: "Marketing Campaign Brainstorm",
    when: "Oct 12",
    nodes: "34 Nodes",
    thumb: PROJECT_THUMBS[2],
    ai: false,
  },
];

function Dashboard() {
  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden dot-matrix">
      {/* Mobile top bar */}
      <div className="md:hidden flex justify-between items-center w-full px-lg py-md bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 sticky top-0 z-50">
        <div className="flex items-center gap-sm">
          <img src={LOGO_URL} alt="MindForge AI logo" className="w-8 h-8 rounded-lg" />
          <span className="text-headline-md font-bold text-primary tracking-tight">
            MindForge AI
          </span>
        </div>
        <button
          aria-label="Open menu"
          className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high/50 transition-all"
        >
          <Icon name="menu" />
        </button>
      </div>

      <AppSidebar active="Projects" />

      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <div className="sticky top-0 z-30 px-lg py-md glass-panel flex flex-col md:flex-row justify-between items-center gap-md border-b border-outline-variant/30">
          <div className="relative w-full md:w-96">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]"
            />
            <input
              type="text"
              aria-label="Search mind maps"
              placeholder="Search mind maps, nodes, or tags..."
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-full py-2 pl-10 pr-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center gap-sm w-full md:w-auto justify-between md:justify-end">
            <button className="flex items-center gap-xs px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors text-label-sm">
              <Icon name="filter_list" className="text-[18px]" />
              Filters
            </button>
            <div className="flex items-center gap-xs border-l border-outline-variant/50 pl-sm ml-sm">
              <button
                aria-label="Grid view"
                className="p-1.5 rounded-lg bg-surface-container text-primary"
              >
                <Icon name="grid_view" className="text-[18px]" />
              </button>
              <button
                aria-label="List view"
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low"
              >
                <Icon name="view_list" className="text-[18px]" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-lg md:p-xxl max-w-[1400px] mx-auto w-full flex flex-col gap-xl">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
            <div>
              <p className="text-body-lg text-on-surface-variant mb-1">Welcome back, Alex.</p>
              <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
                Ready to map something new?
              </h1>
            </div>
            <Link
              to="/workspace"
              className="bg-primary-container text-on-primary text-label-md rounded-xl py-2.5 px-6 flex items-center gap-2 ai-glow transition-all hover:-translate-y-0.5"
            >
              <Icon name="add" />
              New Project
            </Link>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-lg flex flex-col justify-between h-32 hover:shadow-level-2 transition-shadow relative overflow-hidden group"
              >
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-tertiary-container/10 rounded-full blur-xl group-hover:bg-tertiary-container/20 transition-all" />
                <div className="flex justify-between items-start relative z-10">
                  <span className="text-label-md text-on-surface-variant uppercase tracking-wider">
                    {stat.label}
                  </span>
                  <Icon name={stat.icon} className={stat.tone} />
                </div>
                <div className="text-display text-on-surface relative z-10">
                  {stat.value}
                  {stat.suffix ? (
                    <span className="text-headline-md text-on-surface-variant ml-1">
                      {stat.suffix}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-md">
            <div className="flex justify-between items-center">
              <h2 className="text-headline-md text-on-surface">Recent Projects</h2>
              <button className="text-primary text-label-md hover:underline flex items-center gap-1">
                View All <Icon name="arrow_forward" className="text-[16px]" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
              {PROJECTS.map((project) => (
                <Link
                  key={project.title}
                  to="/workspace"
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 overflow-hidden hover:shadow-level-2 transition-all group relative block"
                >
                  {project.ai ? (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-violet z-10" />
                  ) : null}
                  <div className="h-40 bg-surface-container-low border-b border-outline-variant/30 relative overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:scale-105 transition-transform duration-500"
                      style={{ backgroundImage: `url('${project.thumb}')` }}
                      role="img"
                      aria-label={`${project.title} mind map preview`}
                    />
                    {project.ai ? (
                      <div className="absolute top-2 right-2 bg-surface/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 border border-outline-variant/50">
                        <Icon name="auto_awesome" className="text-[14px] text-accent-violet" />
                        <span className="text-[10px] font-semibold text-on-surface uppercase">
                          AI Gen
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="p-md">
                    <h3 className="text-body-lg text-on-surface font-semibold mb-1 truncate">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-4 text-label-sm text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <Icon name="calendar_today" className="text-[14px]" /> {project.when}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="account_tree" className="text-[14px]" /> {project.nodes}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <SiteFooter compact />
      </main>
    </div>
  );
}
