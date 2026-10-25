from typing import List, Dict, Any, Tuple
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.project import Project
from app.models.mind_map import MindMap
from app.schemas.project import ProjectCreate
from app.schemas.mind_map import MindMapCreate
from app.schemas.template import TemplateSummary, TemplateDetail
from app.services.project_service import ProjectService
from app.services.mind_map_service import MindMapService
from app.services.node_service import NodeService
from app.services.edge_service import EdgeService
from app.services.import_service import ImportService
from app.repositories.project_repository import ProjectRepository
from app.repositories.mind_map_repository import MindMapRepository
from app.repositories.node_repository import NodeRepository
from app.repositories.edge_repository import EdgeRepository


TEMPLATES_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "brainstorm-idea",
        "title": "Idea Generation",
        "category": "Brainstorm",
        "icon": "lightbulb",
        "badge": "Brainstorm",
        "color": "amber",
        "description": "Quickly map out ideas and connect concepts across diverse domains.",
        "topics_preview": ["Problem Definition", "Divergent Ideas", "Feasibility Matrix", "Next Steps"],
        "recommended_layout": "radial",
        "recommended_theme": "colorful",
        "preview": "/templates/idea-generation.webp",
        "roots": [
            {
                "label": "Idea Generation & Brainstorming",
                "children": [
                    {
                        "label": "Problem Definition",
                        "children": [
                            {"label": "Core Pain Points"},
                            {"label": "Target Persona Needs"},
                            {"label": "Current Inefficiencies"},
                        ],
                    },
                    {
                        "label": "Divergent Ideas",
                        "children": [
                            {"label": "Zero-Constraint Solutions"},
                            {"label": "Inverted / Opposite Perspectives"},
                            {"label": "Cross-Industry Analogies"},
                        ],
                    },
                    {
                        "label": "Feasibility Matrix",
                        "children": [
                            {"label": "Quick Wins (High Impact, Low Effort)"},
                            {"label": "Strategic Bets (High Impact, High Effort)"},
                            {"label": "Resource Constraints"},
                        ],
                    },
                    {
                        "label": "Next Steps",
                        "children": [
                            {"label": "Rapid Prototyping"},
                            {"label": "User Validation Interviews"},
                            {"label": "Action Plan"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "study-guide",
        "title": "Exam Study Guide",
        "category": "Study",
        "icon": "school",
        "badge": "Study",
        "color": "indigo",
        "description": "Structure your syllabus, core concepts, and key learning points for effective revision.",
        "topics_preview": ["Foundational Concepts", "Deep-Dive Modules", "Practice & Self-Assessment", "Exam Strategy"],
        "recommended_layout": "horizontal",
        "recommended_theme": "minimal",
        "preview": "/templates/exam-study-guide.webp",
        "roots": [
            {
                "label": "Exam Study Guide",
                "children": [
                    {
                        "label": "Foundational Concepts",
                        "children": [
                            {"label": "Key Terminology & Definitions"},
                            {"label": "Core Principles & Formulas"},
                            {"label": "Historical Context"},
                        ],
                    },
                    {
                        "label": "Deep-Dive Modules",
                        "children": [
                            {"label": "Module 1: Theoretical Foundations"},
                            {"label": "Module 2: Practical Applications"},
                            {"label": "Module 3: Case Studies & Analyses"},
                        ],
                    },
                    {
                        "label": "Practice & Self-Assessment",
                        "children": [
                            {"label": "Sample Questions & Exercises"},
                            {"label": "Past Exam Papers"},
                            {"label": "Flashcard Memory Drills"},
                        ],
                    },
                    {
                        "label": "Exam Strategy",
                        "children": [
                            {"label": "Time Allocation Plan"},
                            {"label": "High-Yield Topics Review"},
                            {"label": "Common Pitfalls & Mistakes"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "research-paper",
        "title": "Research Outline",
        "category": "Research",
        "icon": "science",
        "badge": "Research",
        "color": "cyan",
        "description": "Break down a research paper or topic into structured findings, methodology, and conclusions.",
        "topics_preview": ["Abstract & Intro", "Literature Review", "Methodology", "Results & Discussion", "Conclusion"],
        "recommended_layout": "radial",
        "recommended_theme": "minimal",
        "preview": "/templates/research-outline.webp",
        "roots": [
            {
                "label": "Research Paper Outline",
                "children": [
                    {
                        "label": "Abstract & Introduction",
                        "children": [
                            {"label": "Problem Statement & Significance"},
                            {"label": "Primary Research Question"},
                            {"label": "Hypothesis & Thesis Statement"},
                        ],
                    },
                    {
                        "label": "Literature Review",
                        "children": [
                            {"label": "Foundational Historical Works"},
                            {"label": "Current State of the Art"},
                            {"label": "Identified Knowledge Gap"},
                        ],
                    },
                    {
                        "label": "Methodology",
                        "children": [
                            {"label": "Data Collection & Sampling"},
                            {"label": "Experimental Design & Framework"},
                            {"label": "Evaluation Metrics & Controls"},
                        ],
                    },
                    {
                        "label": "Results & Discussion",
                        "children": [
                            {"label": "Key Quantitative Findings"},
                            {"label": "Interpretation & Implications"},
                            {"label": "Limitations of the Study"},
                        ],
                    },
                    {
                        "label": "Conclusion & Future Work",
                        "children": [
                            {"label": "Summary of Contributions"},
                            {"label": "Recommended Open Research Areas"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "project-plan",
        "title": "Project Plan",
        "category": "Project",
        "icon": "task_alt",
        "badge": "Project",
        "color": "emerald",
        "description": "Map out tasks, milestones, deliverables, and team responsibilities.",
        "topics_preview": ["Phase 1: Discovery", "Phase 2: Architecture", "Phase 3: Sprints", "Phase 4: Release"],
        "recommended_layout": "horizontal",
        "recommended_theme": "modern",
        "preview": "/templates/project-plan.webp",
        "roots": [
            {
                "label": "Project Execution Plan",
                "children": [
                    {
                        "label": "Phase 1: Discovery & Scoping",
                        "children": [
                            {"label": "Stakeholder Requirements"},
                            {"label": "Technical Feasibility Analysis"},
                            {"label": "PRD & Success Metrics Finalization"},
                        ],
                    },
                    {
                        "label": "Phase 2: Design & Prototyping",
                        "children": [
                            {"label": "System Architecture & Schema"},
                            {"label": "UX Wireframes & Component Specs"},
                            {"label": "Interactive Prototype Review"},
                        ],
                    },
                    {
                        "label": "Phase 3: Implementation Sprints",
                        "children": [
                            {"label": "Sprint 1: Core API & DB Migrations"},
                            {"label": "Sprint 2: UI Integration & State"},
                            {"label": "Sprint 3: Polish, QA & Edge Cases"},
                        ],
                    },
                    {
                        "label": "Phase 4: Release & Handover",
                        "children": [
                            {"label": "Staging Acceptance Testing"},
                            {"label": "Production Rollout & Monitoring"},
                            {"label": "User Documentation & Training"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "product-strategy",
        "title": "Product Strategy",
        "category": "Product",
        "icon": "rocket_launch",
        "badge": "Strategy",
        "color": "violet",
        "description": "Define vision, target audience, competitive moat, and measurable OKRs.",
        "topics_preview": ["Vision & North Star", "Target Personas", "Strategic Pillars", "Measurable OKRs"],
        "recommended_layout": "radial",
        "recommended_theme": "modern",
        "preview": "/templates/product-strategy.webp",
        "roots": [
            {
                "label": "Product Strategy & Roadmap",
                "children": [
                    {
                        "label": "Vision & Value Proposition",
                        "children": [
                            {"label": "North Star Metric"},
                            {"label": "Core Customer Pain Points"},
                            {"label": "Differentiating Value Proposition"},
                        ],
                    },
                    {
                        "label": "Target Personas & ICP",
                        "children": [
                            {"label": "Primary User Profiles"},
                            {"label": "Customer Journey & Touchpoints"},
                            {"label": "Key Jobs-to-be-Done (JTBD)"},
                        ],
                    },
                    {
                        "label": "Strategic Pillars & Roadmap",
                        "children": [
                            {"label": "Pillar 1: Core User Experience"},
                            {"label": "Pillar 2: Performance & Scalability"},
                            {"label": "Pillar 3: Integrations & Ecosystem"},
                        ],
                    },
                    {
                        "label": "Measurable OKRs",
                        "children": [
                            {"label": "Acquisition & Conversion Targets"},
                            {"label": "User Retention & Engagement"},
                            {"label": "Customer Satisfaction (NPS)"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "system-arch",
        "title": "System Architecture",
        "category": "Engineering",
        "icon": "memory",
        "badge": "Architecture",
        "color": "indigo",
        "description": "Visualize components, databases, network boundaries, and APIs.",
        "topics_preview": ["Client Tier", "API Gateway", "Application Services", "Persistence & Storage"],
        "recommended_layout": "horizontal",
        "recommended_theme": "modern",
        "preview": "/templates/system-architecture.webp",
        "roots": [
            {
                "label": "System Architecture Blueprint",
                "children": [
                    {
                        "label": "Client Tier",
                        "children": [
                            {"label": "Web Single-Page App (React / TS)"},
                            {"label": "Mobile Clients (iOS / Android)"},
                            {"label": "CDN & Asset Edge Cache"},
                        ],
                    },
                    {
                        "label": "API Gateway & Security",
                        "children": [
                            {"label": "Reverse Proxy & TLS Termination"},
                            {"label": "Authentication & JWT Verification"},
                            {"label": "Rate Limiting & Threat Protection"},
                        ],
                    },
                    {
                        "label": "Application Services",
                        "children": [
                            {"label": "Core Business Logic Services"},
                            {"label": "Background Job Queue & Workers"},
                            {"label": "AI & Vector Search Pipelines"},
                        ],
                    },
                    {
                        "label": "Persistence & Storage",
                        "children": [
                            {"label": "PostgreSQL (Transactional Data)"},
                            {"label": "Redis (In-Memory Caching & Sessions)"},
                            {"label": "Cloud Object Store (Assets & Files)"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "swot-analysis",
        "title": "SWOT Analysis",
        "category": "Business",
        "icon": "analytics",
        "badge": "Analysis",
        "color": "rose",
        "description": "Analyze strengths, weaknesses, opportunities, and threats to inform decision-making.",
        "topics_preview": ["Strengths", "Weaknesses", "Opportunities", "Threats"],
        "recommended_layout": "radial",
        "recommended_theme": "colorful",
        "preview": "/templates/swot-analysis.webp",
        "roots": [
            {
                "label": "SWOT Strategic Analysis",
                "children": [
                    {
                        "label": "Strengths (Internal)",
                        "children": [
                            {"label": "Proprietary Core Technology & IP"},
                            {"label": "High Team Velocity & Expertise"},
                            {"label": "Strong Brand Loyalty & Advocacy"},
                        ],
                    },
                    {
                        "label": "Weaknesses (Internal)",
                        "children": [
                            {"label": "Limited Early Marketing Budget"},
                            {"label": "Resource Constraints in Engineering"},
                            {"label": "Single Revenue Channel Reliance"},
                        ],
                    },
                    {
                        "label": "Opportunities (External)",
                        "children": [
                            {"label": "Unaddressed Niche Market Segments"},
                            {"label": "Strategic Enterprise Partnerships"},
                            {"label": "Rapid Adoption of AI Workflows"},
                        ],
                    },
                    {
                        "label": "Threats (External)",
                        "children": [
                            {"label": "Well-Funded Legacy Competitors"},
                            {"label": "Fast-Moving Industry Shifts"},
                            {"label": "Regulatory & Privacy Compliance"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "meeting-notes",
        "title": "Meeting Notes",
        "category": "Meeting",
        "icon": "groups",
        "badge": "Meeting",
        "color": "amber",
        "description": "Structure discussions, decisions, open blockers, and assigned action items.",
        "topics_preview": ["Meeting Context", "Discussion Points", "Decisions Made", "Action Items & Owners"],
        "recommended_layout": "vertical",
        "recommended_theme": "minimal",
        "preview": "/templates/meeting-notes.webp",
        "roots": [
            {
                "label": "Meeting Notes & Action Items",
                "children": [
                    {
                        "label": "Meeting Context & Goals",
                        "children": [
                            {"label": "Date, Time & Attendees"},
                            {"label": "Meeting Purpose & Desired Outcomes"},
                            {"label": "Key Background References"},
                        ],
                    },
                    {
                        "label": "Discussion Points",
                        "children": [
                            {"label": "Product Milestone Review"},
                            {"label": "Technical Architecture Tradeoffs"},
                            {"label": "Feedback from Stakeholders"},
                        ],
                    },
                    {
                        "label": "Decisions Made",
                        "children": [
                            {"label": "Approved Approach & Framework"},
                            {"label": "Timeline & Delivery Commitments"},
                            {"label": "Scope Boundaries Confirmed"},
                        ],
                    },
                    {
                        "label": "Action Items & Owners",
                        "children": [
                            {"label": "Task 1: Spec Review (Owner: Alex)"},
                            {"label": "Task 2: Migration Plan (Owner: Jordan)"},
                            {"label": "Task 3: Follow-Up Demo Next Week"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "cloud_system_architecture",
        "title": "Cloud System Architecture",
        "category": "Engineering",
        "icon": "cloud",
        "badge": "Architecture",
        "color": "indigo",
        "description": "Production-grade distributed system blueprint featuring client tier, API gateway, microservices, async message broker, cache & DB, and observability.",
        "topics_preview": ["Client Tier", "API Gateway & Security", "Core Microservices", "Async Event Broker", "Data & Storage Tier", "Observability"],
        "recommended_layout": "horizontal",
        "recommended_theme": "modern",
        "preview": "/templates/system-architecture.webp",
        "roots": [
            {
                "label": "Cloud System Architecture",
                "children": [
                    {
                        "label": "Client Tier",
                        "children": [
                            {"label": "Web SPA (React / Next.js)"},
                            {"label": "Mobile Apps (iOS & Android)"},
                            {"label": "Desktop Client (Electron)"},
                        ],
                    },
                    {
                        "label": "API Gateway & Security",
                        "children": [
                            {"label": "Reverse Proxy & SSL Termination"},
                            {"label": "OAuth2 & JWT Auth Service"},
                            {"label": "Distributed Rate Limiter"},
                        ],
                    },
                    {
                        "label": "Core Microservices",
                        "children": [
                            {"label": "User & Account Service"},
                            {"label": "Catalog & Search Service"},
                            {"label": "Payment & Checkout Service"},
                            {"label": "Notification & Email Service"},
                        ],
                    },
                    {
                        "label": "Async Event Broker",
                        "children": [
                            {"label": "Apache Kafka / RabbitMQ"},
                            {"label": "Async Event Consumers"},
                            {"label": "Dead Letter Queue & Retry Logic"},
                        ],
                    },
                    {
                        "label": "Data & Storage Tier",
                        "children": [
                            {"label": "PostgreSQL (ACID Primary Database)"},
                            {"label": "Redis (Distributed Cache & Sessions)"},
                            {"label": "Amazon S3 / Blob Storage"},
                        ],
                    },
                    {
                        "label": "Observability & Monitoring",
                        "children": [
                            {"label": "Prometheus & Grafana Metrics"},
                            {"label": "Distributed Tracing (OpenTelemetry)"},
                            {"label": "Centralized Log Aggregation (ELK)"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "product_strategy_roadmap",
        "title": "Product Strategy & Q4 Roadmap",
        "category": "Product",
        "icon": "route",
        "badge": "Strategy",
        "color": "violet",
        "description": "Comprehensive product planning framework from North Star vision and user personas down to feature releases and measurable OKR key results.",
        "topics_preview": ["Vision & North Star", "User Acquisition & Funnel", "Feature Deliverables", "Monetization & Packaging", "Measurable Key Results (OKRs)"],
        "recommended_layout": "radial",
        "recommended_theme": "modern",
        "preview": "/templates/product-strategy.webp",
        "roots": [
            {
                "label": "Q4 Product Strategy & Roadmap",
                "children": [
                    {
                        "label": "Vision & North Star",
                        "children": [
                            {"label": "Core Value Proposition"},
                            {"label": "Target Market & ICP Definition"},
                            {"label": "Competitive Advantage & Moat"},
                        ],
                    },
                    {
                        "label": "User Acquisition & Funnel",
                        "children": [
                            {"label": "Self-Serve Onboarding Flow"},
                            {"label": "Viral Collaborative Sharing"},
                            {"label": "Interactive Product Tour"},
                        ],
                    },
                    {
                        "label": "Feature Deliverables",
                        "children": [
                            {"label": "Real-Time Collaborative Co-Editing"},
                            {"label": "AI Context-Aware Semantic Search"},
                            {"label": "Third-Party Slack & Notion Sync"},
                        ],
                    },
                    {
                        "label": "Monetization & Packaging",
                        "children": [
                            {"label": "Free Tier Limits & Triggers"},
                            {"label": "Pro Team Subscriptions"},
                            {"label": "Enterprise Custom SSO & Audit Logs"},
                        ],
                    },
                    {
                        "label": "Measurable Key Results (OKRs)",
                        "children": [
                            {"label": "40% Increase in Weekly Active Users"},
                            {"label": "Sub-1.5s Canvas Initial Load Time"},
                            {"label": "25% Boost in Trial Conversions"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "machine_learning_roadmap",
        "title": "Machine Learning & AI Engineering",
        "category": "AI & Data",
        "icon": "psychology",
        "badge": "AI / ML",
        "color": "cyan",
        "description": "Holistic AI engineering pipeline spanning data ingestion, model training, transformer architectures, LLM fine-tuning, and production MLOps.",
        "topics_preview": ["Data & Feature Store", "Traditional Machine Learning", "Deep Learning Architectures", "Generative AI & LLMs", "Production MLOps & Serving"],
        "recommended_layout": "horizontal",
        "recommended_theme": "modern",
        "preview": "/templates/system-architecture.webp",
        "roots": [
            {
                "label": "Machine Learning & AI Engineering",
                "children": [
                    {
                        "label": "Data & Feature Store",
                        "children": [
                            {"label": "Data Cleaning & Normalization"},
                            {"label": "Feature Engineering & Embeddings"},
                            {"label": "Data Version Control (DVC)"},
                        ],
                    },
                    {
                        "label": "Traditional Machine Learning",
                        "children": [
                            {"label": "Supervised: Random Forest & XGBoost"},
                            {"label": "Unsupervised: K-Means & PCA"},
                            {"label": "Hyperparameter Optimization (Optuna)"},
                        ],
                    },
                    {
                        "label": "Deep Learning Architectures",
                        "children": [
                            {"label": "Convolutional Networks (Vision)"},
                            {"label": "Recurrent Networks (Time Series)"},
                            {"label": "Transformer & Multi-Head Attention"},
                        ],
                    },
                    {
                        "label": "Generative AI & LLMs",
                        "children": [
                            {"label": "Prompt Engineering & Few-Shot Prompting"},
                            {"label": "Retrieval Augmented Generation (RAG)"},
                            {"label": "Parameter-Efficient Fine-Tuning (LoRA)"},
                        ],
                    },
                    {
                        "label": "Production MLOps & Serving",
                        "children": [
                            {"label": "Model Registry & Tracking (MLflow)"},
                            {"label": "High-Throughput Inference (vLLM / Triton)"},
                            {"label": "Data Drift & Hallucination Guardrails"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "fullstack_web_app",
        "title": "Modern Full-Stack Application",
        "category": "Engineering",
        "icon": "layers",
        "badge": "Full-Stack",
        "color": "emerald",
        "description": "End-to-end modern stack blueprint covering frontend client state, backend REST/GraphQL API, database migrations, and CI/CD pipelines.",
        "topics_preview": ["Frontend Presentation", "Backend Application Layer", "Database & Storage", "Authentication & Security", "DevOps & CI/CD"],
        "recommended_layout": "horizontal",
        "recommended_theme": "modern",
        "preview": "/templates/system-architecture.webp",
        "roots": [
            {
                "label": "Modern Full-Stack Application",
                "children": [
                    {
                        "label": "Frontend Presentation",
                        "children": [
                            {"label": "React 19, TypeScript & Vite"},
                            {"label": "Tailwind CSS & Design Tokens"},
                            {"label": "TanStack Router & Query State"},
                        ],
                    },
                    {
                        "label": "Backend Application Layer",
                        "children": [
                            {"label": "FastAPI & Python 3.10+"},
                            {"label": "Pydantic v2 Strict Validation"},
                            {"label": "SQLAlchemy 2.0 Async ORM"},
                        ],
                    },
                    {
                        "label": "Database & Storage",
                        "children": [
                            {"label": "PostgreSQL with Alembic Migrations"},
                            {"label": "Redis Key-Value & Session Cache"},
                        ],
                    },
                    {
                        "label": "Authentication & Security",
                        "children": [
                            {"label": "JWT Bearer Tokens & Refresh Rotation"},
                            {"label": "Role-Based Access Control (RBAC)"},
                        ],
                    },
                    {
                        "label": "DevOps & CI/CD",
                        "children": [
                            {"label": "Multi-Stage Docker Containers"},
                            {"label": "GitHub Actions Automated Tests"},
                            {"label": "Zero-Downtime Deployment"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "gtm_launch_strategy",
        "title": "Go-To-Market (GTM) Launch",
        "category": "Product",
        "icon": "rocket_launch",
        "badge": "Launch",
        "color": "rose",
        "description": "Battle-tested market entry playbook covering positioning, customer segments, multichannel distribution, influencer outreach, and post-launch analytics.",
        "topics_preview": ["Positioning & Messaging", "Target Audience & Personas", "Marketing & Distribution Channels", "Sales Enablement & Demos", "Post-Launch Metrics & Feedback"],
        "recommended_layout": "horizontal",
        "recommended_theme": "modern",
        "preview": "/templates/project-plan.webp",
        "roots": [
            {
                "label": "Go-To-Market Launch Strategy",
                "children": [
                    {
                        "label": "Positioning & Messaging",
                        "children": [
                            {"label": "Unique Selling Proposition (USP)"},
                            {"label": "Problem-Solution Fit Statements"},
                            {"label": "Elevator Pitch & Hero Copy"},
                        ],
                    },
                    {
                        "label": "Target Audience & Personas",
                        "children": [
                            {"label": "Early Adopter Tech Enthusiasts"},
                            {"label": "Engineering & Product Team Leads"},
                            {"label": "Enterprise Knowledge Workers"},
                        ],
                    },
                    {
                        "label": "Marketing & Distribution Channels",
                        "children": [
                            {"label": "Product Hunt Launch Day Campaign"},
                            {"label": "Technical Deep-Dive Blog Posts"},
                            {"label": "Developer Community Outreach"},
                        ],
                    },
                    {
                        "label": "Sales Enablement & Demos",
                        "children": [
                            {"label": "Interactive Sandbox Demo"},
                            {"label": "One-Page Feature Sheets"},
                            {"label": "Customer FAQs & Objection Handling"},
                        ],
                    },
                    {
                        "label": "Post-Launch Metrics & Feedback",
                        "children": [
                            {"label": "Sign-Up & Activation Rate"},
                            {"label": "Net Promoter Score (NPS)"},
                            {"label": "Rapid Bug Fix & Triage Sprint"},
                        ],
                    },
                ],
            }
        ],
    },
    {
        "id": "agile_sprint_retro",
        "title": "Agile Sprint & Retrospective",
        "category": "Productivity",
        "icon": "view_kanban",
        "badge": "Agile",
        "color": "amber",
        "description": "High-velocity agile sprint review canvas to celebrate team wins, diagnose bottlenecks, clarify action items, and align on upcoming sprint velocity.",
        "topics_preview": ["Sprint Objectives & Goals", "What Went Well 🌟", "What Could Be Improved ⚠️", "Action Items & Owners 🎯", "Next Sprint Focus 🚀"],
        "recommended_layout": "vertical",
        "recommended_theme": "colorful",
        "preview": "/templates/meeting-notes.webp",
        "roots": [
            {
                "label": "Agile Sprint & Retrospective",
                "children": [
                    {
                        "label": "Sprint Objectives & Goals",
                        "children": [
                            {"label": "Shipped User Auth & Session Flow"},
                            {"label": "Reduced Canvas Graph Render Latency"},
                            {"label": "Resolved High-Priority Backlog Bugs"},
                        ],
                    },
                    {
                        "label": "What Went Well 🌟",
                        "children": [
                            {"label": "Seamless Cross-Functional Pair Programming"},
                            {"label": "Zero Downtime Database Schema Migration"},
                            {"label": "Automated E2E Tests Caught Early Regressions"},
                        ],
                    },
                    {
                        "label": "What Could Be Improved ⚠️",
                        "children": [
                            {"label": "Daily Standups Exceeded 15-Minute Cap"},
                            {"label": "Ambiguous Edge Cases in Export Spec"},
                            {"label": "Staging Environment Data Sync Delays"},
                        ],
                    },
                    {
                        "label": "Action Items & Owners 🎯",
                        "children": [
                            {"label": "Implement Timeboxed Standup Timer"},
                            {"label": "Create Formal PRD Edge-Case Checklist"},
                            {"label": "Automate Staging DB Reset Scripts"},
                        ],
                    },
                    {
                        "label": "Next Sprint Focus 🚀",
                        "children": [
                            {"label": "Real-Time Multiplayer Presence & Cursors"},
                            {"label": "Mobile Responsive Navigation Polish"},
                        ],
                    },
                ],
            }
        ],
    },
]


def _count_nodes_recursive(node: Dict[str, Any]) -> int:
    count = 1
    for child in node.get("children", []):
        count += _count_nodes_recursive(child)
    return count


class TemplateService:
    @staticmethod
    def get_all_templates() -> List[TemplateSummary]:
        summaries = []
        for t in TEMPLATES_CATALOG:
            node_count = sum(_count_nodes_recursive(root) for root in t["roots"])
            summaries.append(
                TemplateSummary(
                    id=t["id"],
                    title=t["title"],
                    description=t["description"],
                    category=t["category"],
                    icon=t["icon"],
                    badge=t["badge"],
                    color=t["color"],
                    node_count=node_count,
                    topics_preview=t["topics_preview"],
                    recommended_layout=t.get("recommended_layout", "radial"),
                    recommended_theme=t.get("recommended_theme", "modern"),
                    preview=t.get("preview", ""),
                )
            )
        return summaries

    @staticmethod
    def get_template_by_id(template_id: str) -> TemplateDetail:
        norm_id = template_id.lower().replace("-", "_")
        for t in TEMPLATES_CATALOG:
            cat_norm = t["id"].lower().replace("-", "_")
            if t["id"] == template_id or cat_norm == norm_id:
                node_count = sum(_count_nodes_recursive(root) for root in t["roots"])
                return TemplateDetail(
                    id=t["id"],
                    title=t["title"],
                    description=t["description"],
                    category=t["category"],
                    icon=t["icon"],
                    badge=t["badge"],
                    color=t["color"],
                    node_count=node_count,
                    topics_preview=t["topics_preview"],
                    recommended_layout=t.get("recommended_layout", "radial"),
                    recommended_theme=t.get("recommended_theme", "modern"),
                    preview=t.get("preview", ""),
                    roots=t["roots"],
                )

        ALIASES = {
            "system_arch": "cloud_system_architecture",
            "system_architecture": "system-arch",
            "product_strategy": "product-strategy",
            "product_strategy_roadmap": "product-strategy",
            "brainstorm": "brainstorm-idea",
            "brainstorming": "brainstorm-idea",
            "study": "study-guide",
            "exam_study": "study-guide",
            "research": "research-paper",
            "research_outline": "research-paper",
            "project": "project-plan",
            "project_planning": "project-plan",
            "swot": "swot-analysis",
            "meeting": "meeting-notes",
        }
        alias_target = ALIASES.get(norm_id)
        if alias_target:
            for t in TEMPLATES_CATALOG:
                cat_norm = t["id"].lower().replace("-", "_")
                if t["id"] == alias_target or cat_norm == alias_target.lower().replace("-", "_"):
                    node_count = sum(_count_nodes_recursive(root) for root in t["roots"])
                    return TemplateDetail(
                        id=t["id"],
                        title=t["title"],
                        description=t["description"],
                        category=t["category"],
                        icon=t["icon"],
                        badge=t["badge"],
                        color=t["color"],
                        node_count=node_count,
                        topics_preview=t["topics_preview"],
                        roots=t["roots"],
                    )

        raise ValueError(f"Template with id '{template_id}' not found.")

    @staticmethod
    def instantiate_template(
        template_id: str,
        current_user: User,
        db: Session,
    ) -> Tuple[Project, MindMap, int, int, str, str]:
        template = TemplateService.get_template_by_id(template_id)

        project_service = ProjectService(ProjectRepository(db))
        project = project_service.create_project(
            current_user,
            ProjectCreate(
                title=f"{template.title} (Template)",
                description=template.description,
            ),
        )

        mind_map_service = MindMapService(MindMapRepository(db), ProjectRepository(db))
        mind_map = mind_map_service.create_mind_map(
            project.id,
            current_user,
            MindMapCreate(title=template.title),
        )

        node_service = NodeService(NodeRepository(db), MindMapRepository(db))
        edge_service = EdgeService(EdgeRepository(db), MindMapRepository(db), NodeRepository(db))
        import_service = ImportService(node_service, edge_service, mind_map_service)

        import_service._create_tree(
            {"title": template.title, "roots": template.roots},
            current_user,
            mind_map.id,
            zero_positions=True,
        )

        created_nodes = node_service.get_mind_map_nodes(mind_map.id, current_user)
        created_edges = edge_service.get_mind_map_edges(mind_map.id, current_user)

        return project, mind_map, len(created_nodes), len(created_edges), template.recommended_layout, template.recommended_theme
