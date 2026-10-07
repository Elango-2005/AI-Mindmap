import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";
import { createProject } from "@/api/projects";
import { createMindMap } from "@/api/mindmaps";
import { PROJECT_THUMBS } from "@/lib/assets";

const TITLE = "New Project - MindVault AI";
const DESCRIPTION = "Create a new knowledge map with AI or from a template.";

export const Route = createFileRoute("/projects/new")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
    ],
  }),
  component: NewProject,
});

const SUGGESTIONS = [
  "Explain machine learning",
  "Plan a software project",
  "Summarize a research paper",
  "Prepare an exam study map",
  "Break down a business idea"
];

const TEMPLATES = [
  { id: "brainstorm", name: "Brainstorm", icon: "lightbulb", thumb: PROJECT_THUMBS[0], prompt: "Create a brainstorming mind map for: " },
  { id: "planning", name: "Project Planning", icon: "task", thumb: PROJECT_THUMBS[1], prompt: "Create a project plan for: " },
  { id: "architecture", name: "Architecture", icon: "architecture", thumb: PROJECT_THUMBS[2], prompt: "Map out the system architecture for: " },
  { id: "meeting", name: "Meeting Notes", icon: "groups", thumb: PROJECT_THUMBS[3], prompt: "Structure meeting notes for: " },
  { id: "study", name: "Study Guide", icon: "school", thumb: PROJECT_THUMBS[4], prompt: "Create a comprehensive study guide for: " },
  { id: "swot", name: "SWOT", icon: "grid_view", thumb: PROJECT_THUMBS[5], prompt: "Perform a SWOT analysis on: " },
  { id: "product", name: "Product Strategy", icon: "rocket_launch", thumb: PROJECT_THUMBS[0], prompt: "Outline a product strategy for: " },
];

const GENERATION_STATES = [
  "Understanding your topic...",
  "Structuring key ideas...",
  "Building relationships...",
  "Creating your map..."
];

function NewProject() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: number;
    if (isGenerating && generationStep < GENERATION_STATES.length - 1) {
      interval = window.setInterval(() => {
        setGenerationStep((prev) => Math.min(prev + 1, GENERATION_STATES.length - 1));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isGenerating, generationStep]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    try {
      setIsGenerating(true);
      setError(null);
      setGenerationStep(0);
      
      const projectTitle = prompt.length > 30 ? prompt.substring(0, 30) + "..." : prompt;
      
      const project = await createProject({ 
        title: projectTitle, 
        description: "Auto-generated project" 
      });
      
      const mindMap = await createMindMap(project.id, {
        title: projectTitle,
        graph_data: "{}",
        ai_prompt: prompt
      });
      
      navigate({ to: "/workspace/$mindMapId", params: { mindMapId: mindMap.id } });
    } catch (err) {
      console.error(err);
      setError("Something went wrong while creating your map.");
      setIsGenerating(false);
    }
  };

  const applyTemplate = (templatePrompt: string) => {
    setPrompt(templatePrompt);
    document.getElementById("ai-composer")?.focus();
  };

  return (
    <AppLayout activeRoute="Projects">
      <div className="flex-1 overflow-y-auto w-full h-full flex flex-col items-center pt-16 md:pt-24 px-6 relative">
        
        {!isGenerating && !error && (
          <div className="w-full max-w-3xl flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl md:text-5xl font-semibold text-on-surface tracking-tight mb-4 text-center">
              Create a new knowledge map
            </h1>
            <p className="text-lg text-on-surface-variant text-center mb-12">
              Start with an idea, question, document or template.
            </p>

            {/* Composer */}
            <form onSubmit={handleGenerate} className="w-full relative group">
              <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-level-1 focus-within:border-primary/50 focus-within:shadow-level-2 transition-all flex flex-col overflow-hidden">
                <textarea
                  id="ai-composer"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What do you want to map?&#10;&#10;e.g. &quot;Create a mind map explaining the history of Rome...&quot;"
                  className="w-full bg-transparent border-none text-body-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none p-6 resize-none min-h-[140px]"
                  autoFocus
                />
                
                <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low/50 border-t border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <button type="button" className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-2 text-sm font-medium" title="Attach file (Coming Soon)">
                      <Icon name="attach_file" className="text-[18px]" /> Attach
                    </button>
                    <div className="w-px h-4 bg-outline-variant/30" />
                    <button type="button" className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-2 text-sm font-medium" title="Search web (Coming Soon)">
                      <Icon name="travel_explore" className="text-[18px]" /> Search
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={!prompt.trim()}
                    className="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:hover:bg-primary"
                  >
                    <Icon name="auto_awesome" className="text-[18px]" /> Generate
                  </button>
                </div>
              </div>
            </form>

            {/* Suggested Prompts */}
            <div className="w-full mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-on-surface-variant mr-2">Suggested:</span>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPrompt(s);
                    document.getElementById("ai-composer")?.focus();
                  }}
                  className="px-3 py-1.5 rounded-full border border-outline-variant/30 bg-surface-container-lowest text-sm text-on-surface hover:border-primary/50 hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Templates */}
            <div className="w-full mt-16 pb-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-on-surface">Start from a template</h3>
                <Link to="/templates" className="text-sm font-medium text-primary hover:underline">View all</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.prompt)}
                    className="flex flex-col items-center text-center p-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest hover:border-primary/40 hover:bg-surface-container-low transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Icon name={t.icon} className="text-[20px] text-on-surface-variant group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-xs font-medium text-on-surface">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isGenerating && !error && (
          <div className="flex flex-col items-center justify-center w-full max-w-md my-auto animate-in fade-in duration-500">
            <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-surface-container-high" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <Icon name="auto_awesome" className="text-[32px] text-primary animate-pulse" />
            </div>
            
            <div className="h-8 relative w-full flex justify-center overflow-hidden">
              {GENERATION_STATES.map((state, i) => (
                <div 
                  key={i}
                  className={`absolute transition-all duration-500 flex items-center justify-center ${i === generationStep ? 'opacity-100 transform-none' : i < generationStep ? 'opacity-0 -translate-y-8' : 'opacity-0 translate-y-8'}`}
                >
                  <h3 className="text-xl font-medium text-on-surface">{state}</h3>
                </div>
              ))}
            </div>
            <p className="text-on-surface-variant mt-4 text-center text-sm max-w-xs">
              This might take a few seconds depending on the complexity of your topic.
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center w-full max-w-md my-auto animate-in fade-in duration-500 text-center">
            <div className="w-16 h-16 rounded-full bg-error-container/30 flex items-center justify-center mb-6">
              <Icon name="error_outline" className="text-[32px] text-error" />
            </div>
            <h3 className="text-2xl font-medium text-on-surface mb-3">{error}</h3>
            <p className="text-on-surface-variant mb-8">We couldn't generate your map. Please try again or edit your prompt.</p>
            <div className="flex gap-4">
              <button
                onClick={() => setError(null)}
                className="px-6 py-2.5 rounded-xl border border-outline-variant/50 text-on-surface font-medium hover:bg-surface-container-low transition-colors"
              >
                Edit prompt
              </button>
              <button
                onClick={handleGenerate}
                className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Icon name="refresh" className="text-[18px]" /> Try again
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
