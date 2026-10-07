import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Icon } from "@/components/Icon";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  getTemplates,
  instantiateTemplate,
  type TemplateSummary,
} from "@/api/templates";

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = ["All", "Engineering", "Product", "AI & Data", "Productivity"] as const;

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  indigo: {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/30",
    glow: "group-hover:border-indigo-500/50",
  },
  violet: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
    glow: "group-hover:border-purple-500/50",
  },
  cyan: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/30",
    glow: "group-hover:border-cyan-500/50",
  },
  emerald: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    glow: "group-hover:border-emerald-500/50",
  },
  rose: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
    glow: "group-hover:border-rose-500/50",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    glow: "group-hover:border-amber-500/50",
  },
};

export function TemplatesModal({ isOpen, onClose }: TemplatesModalProps) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [instantiatingId, setInstantiatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    getTemplates()
      .then((data) => setTemplates(data))
      .catch((err) => {
        console.error("Failed to load templates:", err);
        toast.error("Failed to load templates catalog.");
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCategory =
        selectedCategory === "All" || tpl.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tpl.title.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.badge.toLowerCase().includes(q) ||
        tpl.topics_preview.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  const handleUseTemplate = async (template: TemplateSummary) => {
    try {
      setInstantiatingId(template.id);
      toast.info(`Creating "${template.title}"...`);
      const result = await instantiateTemplate(template.id);
      toast.success(`Template loaded! Opening workspace...`);
      onClose();
      navigate({
        to: "/workspace/$mindMapId",
        params: { mindMapId: result.mind_map_id },
      });
    } catch (err) {
      console.error("Failed to instantiate template:", err);
      toast.error("Failed to create template. Please try again.");
    } finally {
      setInstantiatingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-4xl max-h-[88vh] bg-surface border border-outline-variant/30 text-on-surface shadow-level-3 p-0 rounded-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="p-6 border-b border-outline-variant/20 bg-surface-container-low shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 text-primary">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon name="auto_awesome_motion" className="text-[24px] text-primary" />
              </div>
              <div>
                <DialogTitle className="text-headline-sm font-bold text-on-surface">
                  Smart Templates Gallery
                </DialogTitle>
                <DialogDescription className="text-body-sm text-on-surface-variant">
                  Jumpstart your thinking with curated, production-ready knowledge maps.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Controls Bar: Search & Categories */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
              />
              <input
                type="text"
                placeholder="Search architecture, product, ML roadmaps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface border border-outline-variant/40 rounded-xl text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-0.5"
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-surface text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-outline-variant/30"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates Grid Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface-container-lowest">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
              <Icon name="progress_activity" className="text-[32px] animate-spin text-primary" />
              <p className="text-body-sm">Loading curated templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-on-surface-variant gap-3">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
                <Icon name="search_off" className="text-[24px]" />
              </div>
              <h4 className="text-body-lg font-semibold text-on-surface">No templates found</h4>
              <p className="text-body-sm max-w-sm">
                No templates matched "{searchQuery}". Try selecting another category or clearing your search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((tpl) => {
                const colors = COLOR_MAP[tpl.color] || COLOR_MAP.indigo;
                const isSelected = instantiatingId === tpl.id;

                return (
                  <div
                    key={tpl.id}
                    className={`group flex flex-col justify-between p-5 rounded-2xl bg-surface border border-outline-variant/30 hover:shadow-level-2 transition-all duration-200 ${colors.glow}`}
                  >
                    <div>
                      {/* Top Row: Icon, Badges, Node Count */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text} border ${colors.border}`}
                        >
                          <Icon name={tpl.icon} className="text-[22px]" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/30">
                            {tpl.category}
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}
                          >
                            {tpl.badge}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-body-lg font-bold text-on-surface mb-1.5 group-hover:text-primary transition-colors">
                        {tpl.title}
                      </h3>
                      <p className="text-body-sm text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                        {tpl.description}
                      </p>

                      {/* Topics Preview Chips */}
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {tpl.topics_preview.slice(0, 4).map((topic, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-surface-container-low text-on-surface-variant border border-outline-variant/20 truncate max-w-[140px]"
                            title={topic}
                          >
                            {topic}
                          </span>
                        ))}
                        {tpl.topics_preview.length > 4 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-surface-container-low text-outline">
                            +{tpl.topics_preview.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Row: Node Count & CTA */}
                    <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between mt-auto">
                      <span className="flex items-center gap-1 text-label-xs text-on-surface-variant">
                        <Icon name="account_tree" className="text-[15px] text-outline" />
                        <span className="font-semibold text-on-surface">{tpl.node_count}</span> nodes
                      </span>

                      <button
                        onClick={() => handleUseTemplate(tpl)}
                        disabled={isSelected || instantiatingId !== null}
                        className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-label-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-[1.02]"
                      >
                        {isSelected ? (
                          <>
                            <Icon name="progress_activity" className="text-[16px] animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Icon name="add" className="text-[16px]" />
                            Use Template
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
