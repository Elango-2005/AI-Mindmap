import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Icon } from "@/components/Icon";
import {
  getTemplates,
  instantiateTemplate,
  type TemplateSummary,
  type TemplateDetail,
  getTemplate,
} from "@/api/templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const TITLE = "Templates - MindVault AI";
const DESCRIPTION = "Start faster with pre-built knowledge map blueprints.";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
    ],
  }),
  component: TemplatesPage,
});

export interface BlueprintNode {
  label: string;
  type?: "root" | "topic" | "concept" | "task" | "insight";
  children?: BlueprintNode[];
}

export interface TemplateBlueprint {
  id: string;
  name: string;
  title?: string;
  category: string;
  description: string;
  thumb: string;
  alt: string;
  icon: string;
  node_count: number;
  recommended_layout: "radial" | "horizontal" | "vertical";
  recommended_theme: "modern" | "minimal" | "colorful";
  topics_preview: string[];
  roots?: BlueprintNode[];
}

const CATEGORIES = [
  "All",
  "Brainstorm",
  "Study",
  "Research",
  "Project",
  "Product",
  "Engineering",
  "Business",
  "Meeting",
  "Productivity",
];

// Rich Curated Template Blueprints Catalog
const FALLBACK_TEMPLATES: TemplateBlueprint[] = [
  {
    id: "brainstorm-idea",
    category: "Brainstorm",
    name: "Idea Generation",
    description: "Quickly map out ideas, divergent concepts, and action plans across diverse domains.",
    thumb: "/templates/idea-generation.webp",
    alt: "Idea generation mind map blueprint",
    icon: "lightbulb",
    node_count: 17,
    recommended_layout: "radial",
    recommended_theme: "colorful",
    topics_preview: ["Problem Definition", "Divergent Ideas", "Feasibility Matrix", "Next Steps"],
    roots: [
      {
        label: "Idea Generation & Brainstorming",
        type: "root",
        children: [
          {
            label: "Problem Definition",
            type: "topic",
            children: [
              { label: "Core Pain Points", type: "concept" },
              { label: "Target Persona Needs", type: "concept" },
              { label: "Current Inefficiencies", type: "concept" },
            ],
          },
          {
            label: "Divergent Ideas",
            type: "topic",
            children: [
              { label: "Zero-Constraint Solutions", type: "concept" },
              { label: "Inverted Perspectives", type: "concept" },
              { label: "Cross-Industry Analogies", type: "concept" },
            ],
          },
          {
            label: "Feasibility Matrix",
            type: "topic",
            children: [
              { label: "Quick Wins (High Impact, Low Effort)", type: "task" },
              { label: "Strategic Bets (High Impact, High Effort)", type: "insight" },
              { label: "Resource Constraints", type: "concept" },
            ],
          },
          {
            label: "Next Steps",
            type: "topic",
            children: [
              { label: "Rapid Prototyping", type: "task" },
              { label: "User Validation Interviews", type: "task" },
              { label: "Action Plan", type: "task" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "study-guide",
    category: "Study",
    name: "Exam Study Guide",
    description: "Structure your syllabus, core concepts, and key learning points for effective revision.",
    thumb: "/templates/exam-study-guide.webp",
    alt: "Exam study guide knowledge map blueprint",
    icon: "school",
    node_count: 17,
    recommended_layout: "horizontal",
    recommended_theme: "minimal",
    topics_preview: ["Foundational Concepts", "Deep-Dive Modules", "Practice & Self-Assessment", "Exam Strategy"],
    roots: [
      {
        label: "Exam Study Guide",
        type: "root",
        children: [
          {
            label: "Foundational Concepts",
            type: "topic",
            children: [
              { label: "Key Terminology & Definitions", type: "concept" },
              { label: "Core Principles & Formulas", type: "concept" },
              { label: "Historical Context", type: "concept" },
            ],
          },
          {
            label: "Deep-Dive Modules",
            type: "topic",
            children: [
              { label: "Module 1: Theoretical Foundations", type: "concept" },
              { label: "Module 2: Practical Applications", type: "concept" },
              { label: "Module 3: Case Studies", type: "concept" },
            ],
          },
          {
            label: "Practice & Self-Assessment",
            type: "topic",
            children: [
              { label: "Sample Questions & Exercises", type: "task" },
              { label: "Past Exam Papers", type: "task" },
              { label: "Flashcard Memory Drills", type: "task" },
            ],
          },
          {
            label: "Exam Strategy",
            type: "topic",
            children: [
              { label: "Time Allocation Plan", type: "insight" },
              { label: "High-Yield Topics Review", type: "insight" },
              { label: "Common Pitfalls & Mistakes", type: "insight" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "research-paper",
    category: "Research",
    name: "Research Outline",
    description: "Break down a research inquiry into structured findings, methodology, and conclusions.",
    thumb: "/templates/research-outline.webp",
    alt: "Research outline hierarchy blueprint",
    icon: "science",
    node_count: 18,
    recommended_layout: "radial",
    recommended_theme: "minimal",
    topics_preview: ["Abstract & Introduction", "Literature Review", "Methodology", "Results & Discussion", "Conclusion"],
    roots: [
      {
        label: "Research Paper Outline",
        type: "root",
        children: [
          {
            label: "Abstract & Introduction",
            type: "topic",
            children: [
              { label: "Problem Statement & Significance", type: "concept" },
              { label: "Primary Research Question", type: "concept" },
              { label: "Hypothesis & Thesis Statement", type: "concept" },
            ],
          },
          {
            label: "Literature Review",
            type: "topic",
            children: [
              { label: "Foundational Historical Works", type: "concept" },
              { label: "Current State of the Art", type: "concept" },
              { label: "Identified Knowledge Gap", type: "concept" },
            ],
          },
          {
            label: "Methodology",
            type: "topic",
            children: [
              { label: "Experimental Design & Setup", type: "concept" },
              { label: "Data Collection Procedures", type: "concept" },
              { label: "Analytical Frameworks", type: "concept" },
            ],
          },
          {
            label: "Results & Discussion",
            type: "topic",
            children: [
              { label: "Empirical Observations", type: "insight" },
              { label: "Statistical Significance", type: "insight" },
              { label: "Implications & Limitations", type: "concept" },
            ],
          },
          {
            label: "Conclusion & Outlook",
            type: "topic",
            children: [
              { label: "Summary of Contributions", type: "concept" },
              { label: "Directions for Future Research", type: "insight" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "project-plan",
    category: "Project",
    name: "Project Plan",
    description: "Map out goals, phases, deliverables, milestones, and risk mitigations.",
    thumb: "/templates/project-plan.webp",
    alt: "Project planning workflow and milestones blueprint",
    icon: "task_alt",
    node_count: 18,
    recommended_layout: "horizontal",
    recommended_theme: "modern",
    topics_preview: ["Discovery & Scope", "Execution & Build", "QA & Testing", "Launch & Rollout", "Risk Management"],
    roots: [
      {
        label: "Master Project Plan",
        type: "root",
        children: [
          {
            label: "Discovery & Scope",
            type: "topic",
            children: [
              { label: "Stakeholder Alignment", type: "task" },
              { label: "Requirements Gathering", type: "task" },
              { label: "Feasibility Review", type: "task" },
            ],
          },
          {
            label: "Execution & Build",
            type: "topic",
            children: [
              { label: "Core Architecture Setup", type: "task" },
              { label: "Feature Sprint Cycles", type: "task" },
              { label: "Mid-Project Review", type: "task" },
            ],
          },
          {
            label: "QA & Verification",
            type: "topic",
            children: [
              { label: "Integration Testing", type: "task" },
              { label: "User Acceptance Testing (UAT)", type: "task" },
              { label: "Security & Compliance Audit", type: "task" },
            ],
          },
          {
            label: "Launch & Rollout",
            type: "topic",
            children: [
              { label: "Production Deployment", type: "task" },
              { label: "Customer Onboarding", type: "task" },
              { label: "Post-Launch Monitoring", type: "task" },
            ],
          },
          {
            label: "Risk Management",
            type: "topic",
            children: [
              { label: "Technical Debt Tracking", type: "insight" },
              { label: "Contingency Buffers", type: "insight" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "product-strategy",
    category: "Product",
    name: "Product Strategy",
    description: "Define vision, strategic pillars, feature roadmap, and monetization models.",
    thumb: "/templates/product-strategy.webp",
    alt: "Product strategy and roadmap blueprint",
    icon: "rocket_launch",
    node_count: 18,
    recommended_layout: "radial",
    recommended_theme: "modern",
    topics_preview: ["Vision & Mission", "Customer Personas", "Strategic Pillars", "Roadmap Horizons", "Monetization"],
    roots: [
      {
        label: "Product Strategy & Vision",
        type: "root",
        children: [
          {
            label: "Vision & Value Proposition",
            type: "topic",
            children: [
              { label: "Core North Star Metric", type: "insight" },
              { label: "Unique Value Proposition", type: "concept" },
              { label: "Target Market Sizing (TAM/SAM)", type: "concept" },
            ],
          },
          {
            label: "Target Personas",
            type: "topic",
            children: [
              { label: "Primary User Profile", type: "concept" },
              { label: "Buyer vs End-User Dynamics", type: "concept" },
              { label: "Jobs To Be Done (JTBD)", type: "concept" },
            ],
          },
          {
            label: "Strategic Pillars",
            type: "topic",
            children: [
              { label: "Pillar 1: World-Class UX", type: "concept" },
              { label: "Pillar 2: AI Automation", type: "concept" },
              { label: "Pillar 3: Enterprise Scale", type: "concept" },
            ],
          },
          {
            label: "Roadmap Horizons",
            type: "topic",
            children: [
              { label: "Horizon 1: Core Foundation", type: "task" },
              { label: "Horizon 2: Expansion & Collab", type: "task" },
              { label: "Horizon 3: Ecosystem Platform", type: "task" },
            ],
          },
          {
            label: "Growth & Monetization",
            type: "topic",
            children: [
              { label: "Freemium Conversion Funnel", type: "insight" },
              { label: "Seat-Based Pricing Tier", type: "concept" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "system-arch",
    category: "Engineering",
    name: "System Architecture",
    description: "Visualize distributed components, databases, API gateways, and resilience layers.",
    thumb: "/templates/system-architecture.webp",
    alt: "System architecture technical diagram blueprint",
    icon: "memory",
    node_count: 19,
    recommended_layout: "horizontal",
    recommended_theme: "modern",
    topics_preview: ["Client Layer", "API Gateway & Edge", "Microservices", "Data & Persistence", "Observability"],
    roots: [
      {
        label: "Distributed System Architecture",
        type: "root",
        children: [
          {
            label: "Client Layer",
            type: "topic",
            children: [
              { label: "Web Single-Page App (SPA)", type: "concept" },
              { label: "Mobile Native Client", type: "concept" },
              { label: "Third-Party Webhooks / CLI", type: "concept" },
            ],
          },
          {
            label: "API Gateway & Ingress",
            type: "topic",
            children: [
              { label: "JWT / OAuth2 Auth Service", type: "concept" },
              { label: "Rate Limiting & Throttling", type: "concept" },
              { label: "Reverse Proxy & Load Balancer", type: "concept" },
            ],
          },
          {
            label: "Core Services",
            type: "topic",
            children: [
              { label: "Graph Engine & CRDT Sync", type: "concept" },
              { label: "AI RAG Pipeline & Embeddings", type: "concept" },
              { label: "Async Task Worker (Celery/Redis)", type: "concept" },
            ],
          },
          {
            label: "Data & Storage Tier",
            type: "topic",
            children: [
              { label: "PostgreSQL Relational DB", type: "concept" },
              { label: "Redis Memory Cache", type: "concept" },
              { label: "Vector Database (Chroma/pgvector)", type: "concept" },
              { label: "S3 Object Store for Blobs", type: "concept" },
            ],
          },
          {
            label: "Observability & CI/CD",
            type: "topic",
            children: [
              { label: "Structured Logging & Tracing", type: "insight" },
              { label: "Prometheus & Grafana Metrics", type: "insight" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "swot-analysis",
    category: "Business",
    name: "SWOT Analysis",
    description: "Evaluate Strengths, Weaknesses, Opportunities, and Threats for strategic decisions.",
    thumb: "/templates/swot-analysis.webp",
    alt: "SWOT analysis matrix blueprint",
    icon: "analytics",
    node_count: 17,
    recommended_layout: "radial",
    recommended_theme: "colorful",
    topics_preview: ["Strengths (Internal)", "Weaknesses (Internal)", "Opportunities (External)", "Threats (External)"],
    roots: [
      {
        label: "Strategic SWOT Analysis",
        type: "root",
        children: [
          {
            label: "Strengths (Internal)",
            type: "topic",
            children: [
              { label: "Proprietary AI Graph Engine", type: "insight" },
              { label: "High User Retention & NPS", type: "insight" },
              { label: "Agile Engineering Velocity", type: "insight" },
            ],
          },
          {
            label: "Weaknesses (Internal)",
            type: "topic",
            children: [
              { label: "Limited Brand Awareness", type: "concept" },
              { label: "Mobile Experience Gaps", type: "concept" },
              { label: "Customer Success Capacity", type: "concept" },
            ],
          },
          {
            label: "Opportunities (External)",
            type: "topic",
            children: [
              { label: "Enterprise Knowledge Base Integrations", type: "insight" },
              { label: "Educational & University Partnerships", type: "insight" },
              { label: "AI Copilot Ecosystem Growth", type: "insight" },
            ],
          },
          {
            label: "Threats (External)",
            type: "topic",
            children: [
              { label: "Entrenched Incumbent Tools", type: "concept" },
              { label: "LLM Provider API Cost Volatility", type: "concept" },
              { label: "Data Privacy & Governance Shifts", type: "concept" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "meeting-notes",
    category: "Meeting",
    name: "Meeting Notes",
    description: "Capture attendees, discussion topics, decisions made, and assigned action items.",
    thumb: "/templates/meeting-notes.webp",
    alt: "Meeting notes and collaboration blueprint",
    icon: "groups",
    node_count: 17,
    recommended_layout: "vertical",
    recommended_theme: "minimal",
    topics_preview: ["Agenda & Context", "Key Discussion Points", "Decisions Made", "Action Items & Ownership"],
    roots: [
      {
        label: "Team Sync Meeting Notes",
        type: "root",
        children: [
          {
            label: "Agenda & Context",
            type: "topic",
            children: [
              { label: "Review Previous Action Items", type: "task" },
              { label: "Q4 Roadmap Priorities", type: "concept" },
              { label: "Release Blocker Triage", type: "concept" },
            ],
          },
          {
            label: "Key Discussion Points",
            type: "topic",
            children: [
              { label: "Frontend State Management", type: "concept" },
              { label: "Theme Abstraction Layer", type: "concept" },
              { label: "Template Separation Architecture", type: "concept" },
            ],
          },
          {
            label: "Decisions Made",
            type: "topic",
            children: [
              { label: "Approved Phase 5 Blueprint Decoupling", type: "insight" },
              { label: "Retain 3 Canonical Map Themes", type: "insight" },
              { label: "Scheduled Integration Release", type: "insight" },
            ],
          },
          {
            label: "Action Items & Ownership",
            type: "topic",
            children: [
              { label: "Update Template Blueprint Schemas", type: "task" },
              { label: "Wire Automatic Layout on Creation", type: "task" },
              { label: "Run Verification Suite", type: "task" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "cloud_system_architecture",
    category: "Engineering",
    name: "Cloud System Architecture",
    description: "Production-grade cloud architecture blueprint with multi-region CDN, microservices, and auto-scaling.",
    thumb: "/templates/system-architecture.webp",
    alt: "Cloud system architecture blueprint",
    icon: "cloud",
    node_count: 19,
    recommended_layout: "horizontal",
    recommended_theme: "modern",
    topics_preview: ["Global CDN & Edge", "API Gateway", "Microservices Cluster", "Data & Persistence", "Observability"],
  },
  {
    id: "product_strategy_roadmap",
    category: "Product",
    name: "Product Strategy & Q4 Roadmap",
    description: "Executive-level product roadmap with OKRs, customer validation funnels, and milestone gates.",
    thumb: "/templates/product-strategy.webp",
    alt: "Product strategy and Q4 roadmap blueprint",
    icon: "route",
    node_count: 18,
    recommended_layout: "radial",
    recommended_theme: "modern",
    topics_preview: ["Strategic OKRs", "Target Customers", "Core Pillars", "Release Horizons", "Monetization"],
  },
  {
    id: "machine_learning_roadmap",
    category: "AI & Data",
    name: "Machine Learning & AI Engineering",
    description: "End-to-end AI/ML workflow blueprint: data ingestion, feature engineering, model training, and RAG evaluation.",
    thumb: "/templates/system-architecture.webp",
    alt: "Machine learning engineering roadmap blueprint",
    icon: "psychology",
    node_count: 18,
    recommended_layout: "horizontal",
    recommended_theme: "modern",
    topics_preview: ["Data Ingestion", "Feature Engineering", "Model Training", "RAG Pipeline", "MLOps & Monitoring"],
  },
  {
    id: "fullstack_web_app",
    category: "Engineering",
    name: "Modern Full-Stack Application",
    description: "Full-stack application blueprint covering client-side rendering, REST/tRPC APIs, ORM, and cloud CI/CD.",
    thumb: "/templates/system-architecture.webp",
    alt: "Full-stack application engineering blueprint",
    icon: "layers",
    node_count: 18,
    recommended_layout: "horizontal",
    recommended_theme: "modern",
    topics_preview: ["Frontend SPA", "Backend Services", "Database & Caching", "DevOps & CI/CD"],
  },
  {
    id: "gtm_launch_strategy",
    category: "Product",
    name: "Go-To-Market (GTM) Launch",
    description: "Multi-channel marketing, beta customer acquisition, content calendar, and sales enablement blueprint.",
    thumb: "/templates/project-plan.webp",
    alt: "Go-to-market launch blueprint",
    icon: "rocket_launch",
    node_count: 18,
    recommended_layout: "horizontal",
    recommended_theme: "modern",
    topics_preview: ["Positioning & Messaging", "Pre-Launch Beta", "Launch Day Campaign", "Post-Launch Retention"],
  },
  {
    id: "agile_sprint_retro",
    category: "Productivity",
    name: "Agile Sprint & Retrospective",
    description: "High-velocity sprint cycle blueprint: backlog grooming, daily standups, sprint goals, and continuous retro improvements.",
    thumb: "/templates/meeting-notes.webp",
    alt: "Agile sprint and retrospective blueprint",
    icon: "view_kanban",
    node_count: 18,
    recommended_layout: "vertical",
    recommended_theme: "colorful",
    topics_preview: ["Sprint Goals", "What Went Well", "What Could Improve", "Action Commitments"],
  },
];

function TemplatesPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<TemplateBlueprint[]>(FALLBACK_TEMPLATES);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [instantiatingId, setInstantiatingId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateBlueprint | null>(null);
  const [previewRoots, setPreviewRoots] = useState<BlueprintNode[] | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Load live catalog from backend if available, merging with enriched local metadata
  useEffect(() => {
    getTemplates()
      .then((serverTemplates) => {
        if (!serverTemplates || serverTemplates.length === 0) return;
        setTemplates((prev) => {
          const map = new Map<string, TemplateBlueprint>();
          // Put fallbacks first
          for (const fb of prev) {
            map.set(fb.id, fb);
          }
          // Merge server templates
          for (const st of serverTemplates) {
            const existing = map.get(st.id);
            map.set(st.id, {
              id: st.id,
              name: st.title || existing?.name || st.id,
              title: st.title,
              category: st.category || existing?.category || "General",
              description: st.description || existing?.description || "",
              thumb: existing?.thumb || st.preview || "/templates/idea-generation.webp",
              alt: existing?.alt || `${st.title} knowledge blueprint`,
              icon: st.icon || existing?.icon || "auto_awesome",
              node_count: st.node_count || existing?.node_count || 16,
              recommended_layout: (st.recommended_layout as any) || existing?.recommended_layout || "radial",
              recommended_theme: (st.recommended_theme as any) || existing?.recommended_theme || "modern",
              topics_preview: st.topics_preview || existing?.topics_preview || [],
              roots: existing?.roots,
            });
          }
          return Array.from(map.values());
        });
      })
      .catch((err) => {
        console.warn("Using offline fallback template catalog:", err);
      });
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCategory = activeCategory === "All" || tpl.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q) ||
        tpl.topics_preview.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [templates, activeCategory, searchQuery]);

  // Open Preview Modal
  const handleOpenPreview = async (template: TemplateBlueprint) => {
    setPreviewTemplate(template);
    if (template.roots && template.roots.length > 0) {
      setPreviewRoots(template.roots);
      return;
    }
    // Attempt to fetch detailed blueprint tree from backend
    try {
      setIsLoadingPreview(true);
      const detail = await getTemplate(template.id);
      if (detail && detail.roots && detail.roots.length > 0) {
        setPreviewRoots(detail.roots);
      } else {
        // Construct fallback tree from topics_preview
        setPreviewRoots([
          {
            label: template.name,
            type: "root",
            children: template.topics_preview.map((topic) => ({
              label: topic,
              type: "topic",
              children: [
                { label: "Core Principles", type: "concept" },
                { label: "Key Considerations", type: "concept" },
              ],
            })),
          },
        ]);
      }
    } catch {
      // Offline fallback
      setPreviewRoots([
        {
          label: template.name,
          type: "root",
          children: template.topics_preview.map((topic) => ({
            label: topic,
            type: "topic",
            children: [
              { label: "Key Milestone", type: "task" },
              { label: "Action Item", type: "concept" },
            ],
          })),
        },
      ]);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Instantiate Template & Open Workspace
  const handleUseTemplate = async (template: TemplateBlueprint) => {
    if (instantiatingId) return;
    try {
      setInstantiatingId(template.id);
      toast.info(`Creating "${template.name}" mind map from blueprint...`);
      const result = await instantiateTemplate(template.id);

      // Store initial recommended theme, layout, and force layout flag
      const layoutToApply = result.recommended_layout || template.recommended_layout || "radial";
      const themeToApply = result.recommended_theme || template.recommended_theme || "modern";
      localStorage.setItem(`mindmap_layout_${result.mind_map_id}`, layoutToApply);
      localStorage.setItem(`mindmap_theme_${result.mind_map_id}`, themeToApply);
      localStorage.setItem(`mindmap_force_layout_${result.mind_map_id}`, "true");

      toast.success(`Template created! Opening workspace...`);
      setPreviewTemplate(null);
      navigate({
        to: "/workspace/$mindMapId",
        params: { mindMapId: result.mind_map_id },
      });
    } catch (err: any) {
      console.error("Failed to instantiate template:", err);
      toast.error("Failed to create template mind map. Please try again.");
    } finally {
      setInstantiatingId(null);
    }
  };

  return (
    <AppLayout activeRoute="Templates">
      <div className="flex-1 overflow-y-auto w-full bg-background p-6 md:p-10">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-outline-variant/20">
            <div>
              <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-1">
                <Icon name="auto_awesome_motion" className="text-[16px]" />
                <span>Reusable Knowledge Blueprints</span>
              </div>
              <h1 className="text-3xl font-semibold text-on-surface tracking-tight">Templates</h1>
              <p className="text-on-surface-variant text-ui mt-1 max-w-xl">
                Choose a structured starting blueprint. Layouts and themes remain 100% customizable in your canvas.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]" />
              <input
                type="text"
                placeholder="Search blueprints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors shadow-xs"
              />
            </div>
          </header>

          {/* Categories Tab Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-on-primary shadow-xs"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Template Blueprints Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-outline-variant/40 rounded-2xl">
              <Icon name="search_off" className="text-[32px] text-on-surface-variant mb-2" />
              <h3 className="text-title-md font-semibold text-on-surface">No matching templates found</h3>
              <p className="text-body-sm text-on-surface-variant mt-1">Try selecting another category or clear your search query.</p>
              <button
                onClick={() => {
                  setActiveCategory("All");
                  setSearchQuery("");
                }}
                className="mt-4 px-4 py-1.5 text-xs font-semibold bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg transition-colors"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredTemplates.map((template) => {
                const layoutLabel =
                  template.recommended_layout === "horizontal"
                    ? "Horizontal Tree"
                    : template.recommended_layout === "vertical"
                    ? "Vertical Outline"
                    : "Radial Mind Map";

                const themeLabel =
                  template.recommended_theme === "minimal"
                    ? "Minimal"
                    : template.recommended_theme === "colorful"
                    ? "Colorful"
                    : "Modern";

                return (
                  <div
                    key={template.id}
                    className="flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-level-2 transition-all duration-200 group flex-1"
                  >
                    {/* Visual Preview Banner */}
                    <div
                      onClick={() => handleOpenPreview(template)}
                      className="h-44 w-full bg-surface-container-low overflow-hidden relative border-b border-outline-variant/20 flex items-center justify-center cursor-pointer"
                    >
                      {!failedImages[template.id] ? (
                        <img
                          src={template.thumb}
                          alt={template.alt}
                          loading="lazy"
                          onError={() => setFailedImages((prev) => ({ ...prev, [template.id]: true }))}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 to-surface-container p-4 text-center">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                            <Icon name={template.icon} className="text-[24px] text-primary" />
                          </div>
                          <span className="text-label-sm font-semibold text-on-surface">{template.name}</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="bg-surface/90 backdrop-blur-md rounded-full px-2 py-0.5 text-[11px] font-semibold text-on-surface border border-outline-variant/20 shadow-xs uppercase tracking-wider">
                          {template.category}
                        </span>
                      </div>

                      {/* Quick Preview Hover Trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreview(template);
                        }}
                        className="absolute bottom-3 right-3 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold text-on-surface border border-outline-variant/20 shadow-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 hover:bg-surface"
                      >
                        <Icon name="visibility" className="text-[13px]" />
                        <span>Inspect</span>
                      </button>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex flex-col flex-1 gap-2.5">
                      <div>
                        <h3 className="text-base font-semibold text-on-surface group-hover:text-primary transition-colors leading-snug">
                          {template.name}
                        </h3>
                        <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                          {template.description}
                        </p>
                      </div>

                      {/* Blueprint Specifications Pill Bar */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-medium flex items-center gap-1">
                          <Icon name="account_tree" className="text-[12px] text-primary" />
                          <span>{template.node_count} nodes</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-medium flex items-center gap-1">
                          <Icon
                            name={
                              template.recommended_layout === "horizontal"
                                ? "align_horizontal_left"
                                : template.recommended_layout === "vertical"
                                ? "align_vertical_top"
                                : "hub"
                            }
                            className="text-[12px] text-outline"
                          />
                          <span>{layoutLabel}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant font-medium flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              template.recommended_theme === "colorful"
                                ? "bg-rose-500"
                                : template.recommended_theme === "minimal"
                                ? "bg-slate-400"
                                : "bg-indigo-500"
                            }`}
                          />
                          <span>{themeLabel}</span>
                        </span>
                      </div>

                      {/* Topics Preview Chips */}
                      {template.topics_preview && template.topics_preview.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.topics_preview.slice(0, 3).map((topic, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-low text-outline border border-outline-variant/20 truncate max-w-[150px]"
                            >
                              {topic}
                            </span>
                          ))}
                          {template.topics_preview.length > 3 && (
                            <span className="text-[10px] px-1 py-0.5 text-outline">
                              +{template.topics_preview.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions: Secondary Preview + Primary Use Template */}
                      <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-outline-variant/15">
                        <button
                          onClick={() => handleOpenPreview(template)}
                          className="w-full py-2 px-3 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Icon name="visibility" className="text-[14px]" />
                          <span>Preview</span>
                        </button>

                        <button
                          onClick={() => handleUseTemplate(template)}
                          disabled={instantiatingId !== null}
                          className="w-full py-2 px-3 bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {instantiatingId === template.id ? (
                            <>
                              <Icon name="progress_activity" className="text-[14px] animate-spin" />
                              <span>Creating...</span>
                            </>
                          ) : (
                            <>
                              <span>Use Template</span>
                              <Icon name="arrow_forward" className="text-[14px]" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Blueprint Preview Dialog / Modal */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        {previewTemplate && (
          <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] bg-surface border border-outline-variant/30 text-on-surface shadow-level-3 p-0 rounded-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-outline-variant/20 bg-surface-container-low shrink-0 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Icon name={previewTemplate.icon} className="text-[24px]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                      {previewTemplate.category}
                    </span>
                    <span className="text-xs text-outline font-medium">Blueprint</span>
                  </div>
                  <DialogTitle className="text-xl font-bold text-on-surface">
                    {previewTemplate.name}
                  </DialogTitle>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <DialogDescription className="text-body-sm text-on-surface-variant leading-relaxed">
                  {previewTemplate.description}
                </DialogDescription>
              </div>

              {/* Specifications Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/25">
                  <div className="text-[11px] font-semibold text-outline uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Icon name="account_tree" className="text-[13px] text-primary" />
                    Starting Blueprint
                  </div>
                  <div className="text-sm font-bold text-on-surface">{previewTemplate.node_count} Nodes</div>
                  <div className="text-[11px] text-on-surface-variant/80 mt-0.5">Pre-structured hierarchy</div>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/25">
                  <div className="text-[11px] font-semibold text-outline uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Icon name="layers" className="text-[13px] text-primary" />
                    Recommended Structure
                  </div>
                  <div className="text-sm font-bold text-on-surface capitalize">
                    {previewTemplate.recommended_layout} Layout
                  </div>
                  <div className="text-[11px] text-on-surface-variant/80 mt-0.5">Customizable on canvas</div>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/25">
                  <div className="text-[11px] font-semibold text-outline uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Icon name="palette" className="text-[13px] text-primary" />
                    Recommended Theme
                  </div>
                  <div className="text-sm font-bold text-on-surface capitalize">
                    {previewTemplate.recommended_theme} Theme
                  </div>
                  <div className="text-[11px] text-on-surface-variant/80 mt-0.5">Theme swappable anytime</div>
                </div>
              </div>

              {/* Semantic Blueprint Hierarchy Tree */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-outline uppercase tracking-wider flex items-center gap-1.5">
                    <Icon name="schema" className="text-[14px] text-primary" />
                    Blueprint Structure Preview
                  </span>
                  <span className="text-[11px] text-on-surface-variant">Hierarchical Starting Nodes</span>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 max-h-64 overflow-y-auto font-mono text-xs space-y-1.5 leading-relaxed">
                  {isLoadingPreview ? (
                    <div className="flex items-center justify-center py-8 text-on-surface-variant gap-2">
                      <Icon name="progress_activity" className="text-[16px] animate-spin" />
                      <span>Loading blueprint hierarchy...</span>
                    </div>
                  ) : previewRoots && previewRoots.length > 0 ? (
                    previewRoots.map((root, rIdx) => (
                      <div key={rIdx} className="space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-primary font-sans text-sm">
                          <Icon name="radio_button_checked" className="text-[14px]" />
                          <span>{root.label}</span>
                        </div>
                        {root.children && (
                          <div className="pl-4 border-l-2 border-primary/20 space-y-2 mt-1">
                            {root.children.map((topic, tIdx) => (
                              <div key={tIdx} className="space-y-1">
                                <div className="flex items-center gap-1.5 font-semibold text-on-surface font-sans text-xs">
                                  <span className="text-outline">├─</span>
                                  <Icon name="folder" className="text-[13px] text-blue-500" />
                                  <span>{topic.label}</span>
                                </div>
                                {topic.children && (
                                  <div className="pl-6 border-l border-outline-variant/20 space-y-0.5">
                                    {topic.children.map((sub, sIdx) => (
                                      <div key={sIdx} className="flex items-center gap-1 text-[11px] text-on-surface-variant font-sans py-0.5">
                                        <span className="text-outline/60">└─</span>
                                        <span>{sub.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-on-surface-variant">No structure preview available.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-outline-variant/20 bg-surface-container-low shrink-0 flex items-center justify-between">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={() => handleUseTemplate(previewTemplate)}
                disabled={instantiatingId !== null}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {instantiatingId === previewTemplate.id ? (
                  <>
                    <Icon name="progress_activity" className="text-[14px] animate-spin" />
                    <span>Creating Mind Map...</span>
                  </>
                ) : (
                  <>
                    <Icon name="auto_awesome" className="text-[14px]" />
                    <span>Use This Template</span>
                  </>
                )}
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </AppLayout>
  );
}
