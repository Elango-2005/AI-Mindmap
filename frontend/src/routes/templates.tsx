import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";

const TITLE = "Templates - MindVault AI";
const DESCRIPTION = "Start faster with pre-built knowledge map templates.";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
    ],
  }),
  component: TemplatesPage,
});

const CATEGORIES = [
  "All",
  "Brainstorm",
  "Study",
  "Research",
  "Project",
  "Product",
  "Engineering",
  "Business",
  "Meeting"
];

const TEMPLATES = [
  { 
    id: "brainstorm-idea", 
    category: "Brainstorm", 
    name: "Idea Generation", 
    description: "Quickly map out ideas and connect concepts.", 
    thumb: "/templates/idea-generation.webp", 
    alt: "Idea generation mind map illustration",
    prompt: "Create a brainstorming mind map for: " 
  },
  { 
    id: "study-guide", 
    category: "Study", 
    name: "Exam Study Guide", 
    description: "Structure your syllabus and key learning points.", 
    thumb: "/templates/exam-study-guide.webp", 
    alt: "Exam study guide knowledge map illustration",
    prompt: "Create a comprehensive study guide for: " 
  },
  { 
    id: "research-paper", 
    category: "Research", 
    name: "Research Outline", 
    description: "Break down a research paper or topic into structured findings.", 
    thumb: "/templates/research-outline.webp", 
    alt: "Research outline hierarchy illustration",
    prompt: "Outline research findings for: " 
  },
  { 
    id: "project-plan", 
    category: "Project", 
    name: "Project Plan", 
    description: "Map out tasks, milestones, and deliverables.", 
    thumb: "/templates/project-plan.webp", 
    alt: "Project planning workflow and milestones illustration",
    prompt: "Create a project plan for: " 
  },
  { 
    id: "product-strategy", 
    category: "Product", 
    name: "Product Strategy", 
    description: "Define vision, features, and target audience.", 
    thumb: "/templates/product-strategy.webp", 
    alt: "Product strategy and roadmap illustration",
    prompt: "Outline a product strategy for: " 
  },
  { 
    id: "system-arch", 
    category: "Engineering", 
    name: "System Architecture", 
    description: "Visualize components, databases, and APIs.", 
    thumb: "/templates/system-architecture.webp", 
    alt: "System architecture technical diagram illustration",
    prompt: "Map out the system architecture for: " 
  },
  { 
    id: "swot-analysis", 
    category: "Business", 
    name: "SWOT Analysis", 
    description: "Analyze strengths, weaknesses, opportunities, and threats.", 
    thumb: "/templates/swot-analysis.webp", 
    alt: "SWOT analysis strategic matrix illustration",
    prompt: "Perform a SWOT analysis on: " 
  },
  { 
    id: "meeting-notes", 
    category: "Meeting", 
    name: "Meeting Notes", 
    description: "Structure discussions, decisions, and action items.", 
    thumb: "/templates/meeting-notes.webp", 
    alt: "Meeting notes and collaboration illustration",
    prompt: "Structure meeting notes for: " 
  },
];

function TemplatesPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const filteredTemplates = activeCategory === "All" 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === activeCategory);

  const handleUseTemplate = (prompt: string) => {
    navigate({ to: "/projects/new", search: { prompt } });
  };

  return (
    <AppLayout activeRoute="Templates">
      <div className="flex-1 overflow-y-auto w-full bg-background p-6 md:p-10">
        <div className="max-w-6xl mx-auto flex flex-col gap-8">
          
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-on-surface tracking-tight">Start faster.</h1>
            <p className="text-on-surface-variant text-ui">
              Choose a template to jumpstart your knowledge map.
            </p>
          </header>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat 
                    ? "bg-primary text-on-primary" 
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
            {filteredTemplates.map((template) => (
              <div 
                key={template.id} 
                className="flex flex-col bg-surface border border-outline-variant/30 rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-level-1 transition-all group"
              >
                <div className="h-40 w-full bg-surface-container-lowest overflow-hidden relative border-b border-outline-variant/20 flex items-center justify-center">
                  {!failedImages[template.id] ? (
                    <img 
                      src={template.thumb} 
                      alt={template.alt}
                      onError={() => setFailedImages(prev => ({ ...prev, [template.id]: true }))}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container text-on-surface-variant/60 gap-1.5 p-4 text-center">
                      <Icon name="auto_awesome" className="text-[24px] text-primary/40" />
                      <span className="text-label-xs font-medium text-outline">{template.name}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1 gap-2">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider">{template.category}</div>
                  <h3 className="text-title-md font-semibold text-on-surface">{template.name}</h3>
                  <p className="text-body-sm text-on-surface-variant flex-1 line-clamp-2">
                    {template.description}
                  </p>
                  <button 
                    onClick={() => handleUseTemplate(template.prompt)}
                    className="mt-4 w-full py-2 bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    Use template <Icon name="arrow_forward" className="text-[16px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
