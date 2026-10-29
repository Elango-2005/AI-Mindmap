import { toast } from "sonner";
import React, { useRef, useEffect } from "react";
import { Icon } from "@/components/Icon";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Node as FlowNode } from "@xyflow/react";
import type { GroundingSource } from "@/api/mindmaps";
import type { ProjectDocument } from "@/api/documents";
import type { SemanticNodeType } from "@/types/semanticGraph";

export interface SuggestedChangesItem {
  icon?: string;
  label: string;
}

export interface SuggestedChangesData {
  summary: string;
  items: SuggestedChangesItem[];
  suggestedNodes?: Array<{
    id: string;
    label: string;
    semanticType?: SemanticNodeType;
    parentId?: string;
  }>;
  suggestedEdges?: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
  }>;
  status?: "pending" | "previewing" | "applied" | "dismissed";
}

export interface AIChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  mapChanges?: {
    nodesAdded: number;
    nodesDeleted: number;
    snapshotId?: string;
    isUndone?: boolean;
  };
  sources?: GroundingSource[];
  isError?: boolean;
  failedPrompt?: string;
  suggestedChanges?: SuggestedChangesData;
}

interface AiAssistantPanelProps {
  messages: AIChatMessage[];
  isChatting: boolean;
  chatInput: string;
  onChatInputChange: (val: string) => void;
  onSendChat: (overrideMessage?: string) => void;
  selectedNode: FlowNode | null;
  aiScope: "entire_map" | "node" | "branch";
  onChangeScope: (scope: "entire_map" | "node" | "branch") => void;
  onPreviewChanges: (messageId: string) => void;
  onApplyChanges: (messageId: string) => void;
  onDismissChanges: (messageId: string) => void;
  onUndoAIChat: (messageId: string, snapshotId: string) => void;
  projectDocuments: ProjectDocument[];
  onOpenKnowledgeBase: () => void;
  onClearSelection: () => void;
  allNodes?: FlowNode[];
  onClose?: () => void;
}

export function AiAssistantPanel({
  messages,
  isChatting,
  chatInput,
  onChatInputChange,
  onSendChat,
  selectedNode,
  aiScope,
  onChangeScope,
  onPreviewChanges,
  onApplyChanges,
  onDismissChanges,
  onUndoAIChat,
  projectDocuments,
  onOpenKnowledgeBase,
  onClearSelection,
  allNodes = [],
  onClose,
}: AiAssistantPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatting]);

  const selectedNodeLabel = selectedNode ? (selectedNode.data?.label as string) : "";

  // Dynamic example prompt bank matching reference mockup
  const topicNodes = (allNodes || []).filter(n => n.data?.depth === 1 || n.data?.semanticType === "topic");
  const topicNames = topicNodes.map(n => (n.data?.label as string) || "").filter(Boolean);

  const defaultTopic1 = topicNames[2] || topicNames[0] || "Deep Learning Architectures";
  const defaultTopic2 = topicNames[0] || "ML";
  const defaultTopic3 = topicNames[1] || "MLOps";

  const promptBank = React.useMemo(() => {
    if (aiScope === "node" && selectedNode) {
      return [
        `Expand "${selectedNodeLabel}" with 3 deeper supporting concepts`,
        `Explain "${selectedNodeLabel}" clearly and concisely`,
        `How does "${selectedNodeLabel}" connect to other branches?`,
        `Find practical real-world applications for "${selectedNodeLabel}"`,
      ];
    } else if (aiScope === "branch" && selectedNode) {
      return [
        `Expand the entire "${selectedNodeLabel}" branch with sub-hierarchies`,
        `Reorganize the "${selectedNodeLabel}" branch for balanced depth`,
        `Identify missing concepts in the "${selectedNodeLabel}" domain`,
        `Summarize the "${selectedNodeLabel}" branch into key takeaways`,
      ];
    } else {
      return [
        `Expand the "${defaultTopic1}" branch with more details`,
        `Find connections between ${defaultTopic2} and ${defaultTopic3}`,
        "Make this mind map concise",
        "Improve structure and balance the branch depths",
        "Analyze coverage and identify domain gaps",
      ];
    }
  }, [aiScope, selectedNode, selectedNodeLabel, defaultTopic1, defaultTopic2, defaultTopic3]);

  const [promptOffset, setPromptOffset] = React.useState(0);
  const currentExamplePrompts = React.useMemo(() => {
    const list = [];
    const count = Math.min(3, promptBank.length);
    for (let i = 0; i < count; i++) {
      list.push(promptBank[(promptOffset + i) % promptBank.length]);
    }
    return list;
  }, [promptBank, promptOffset]);

  const handleShufflePrompts = () => {
    setPromptOffset(prev => (prev + 3) % promptBank.length);
  };


  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface-container-lowest">
      {/* 1. Sub-Header: Scope Indicator Matching Reference Image */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant/30 bg-surface select-none shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
            <Icon name="auto_awesome" className="text-[16px]" />
          </div>
          <div className="flex flex-col min-w-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 font-bold text-gray-900 dark:text-on-surface text-[14px] hover:text-primary transition-colors cursor-pointer text-left truncate"
                  title="Switch AI Assistant scope"
                >
                  <span>AI Assistant</span>
                  <Icon name="expand_more" className="text-[16px] text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => onChangeScope("entire_map")} className="cursor-pointer">
                  <Icon name="public" className="mr-2 text-[16px] text-primary" /> Entire map
                </DropdownMenuItem>
                {selectedNode && (
                  <>
                    <DropdownMenuItem onClick={() => onChangeScope("node")} className="cursor-pointer">
                      <Icon name="radio_button_checked" className="mr-2 text-[16px] text-blue-500" /> Selected node
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChangeScope("branch")} className="cursor-pointer">
                      <Icon name="account_tree" className="mr-2 text-[16px] text-emerald-500" /> Selected branch
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-[12px] text-gray-500 dark:text-on-surface-variant truncate">
              Working on:{" "}
              <strong className="text-gray-900 dark:text-on-surface font-semibold capitalize">
                {aiScope === "node" && selectedNode
                  ? `Node: ${selectedNodeLabel}`
                  : aiScope === "branch" && selectedNode
                  ? `Branch: ${selectedNodeLabel}`
                  : "Entire map"}
              </strong>
            </span>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 dark:text-on-surface-variant dark:hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
            title="Close panel"
            aria-label="Close panel"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        )}
      </div>

      {/* 2. Messages & Actions Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3.5 min-w-0">
        {messages.length === 0 ? (
          /* Empty State: Context-Sensitive Action Cards */
          <div className="flex flex-col gap-3 my-auto py-1 min-w-0">
            {/* Greeting Card */}
            <div className="bg-white dark:bg-surface border border-gray-200/70 dark:border-outline-variant/30 rounded-2xl p-4 shadow-2xs">
              <h4 className="text-[15px] font-bold text-gray-900 dark:text-on-surface">
                Hi! I can help you work with your map.
              </h4>
              <p className="text-[13px] text-gray-600 dark:text-on-surface-variant mt-1.5 leading-relaxed">
                {aiScope === "node" && selectedNode
                  ? `Working on "${selectedNodeLabel}". Ask me to expand, explain, or connect this concept.`
                  : aiScope === "branch" && selectedNode
                  ? `Targeting the "${selectedNodeLabel}" branch. I can reorganize, expand, or summarize it.`
                  : "You can ask me to improve, analyze, or summarize your ideas."}
              </p>
            </div>

            {/* Contextual 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {aiScope === "node" && selectedNode ? (
                <>
                  <button
                    onClick={() => onSendChat(`Expand node "${selectedNodeLabel}" with 3 deeper supporting concepts`)}
                    className="group flex flex-col items-start p-3.5 rounded-2xl bg-[#FAF8FF] dark:bg-purple-950/20 border border-[#EDE9FE] dark:border-purple-900/30 hover:border-[#C4B5FD] hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] dark:bg-purple-900/50 text-[#6D28D9] dark:text-purple-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Icon name="subdirectory_arrow_right" className="text-[18px]" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-on-surface leading-snug">
                      Expand node
                    </span>
                  </button>

                  <button
                    onClick={() => onSendChat(`Explain the concept "${selectedNodeLabel}" in detail`)}
                    className="group flex flex-col items-start p-3.5 rounded-2xl bg-[#F0F7FF] dark:bg-blue-950/20 border border-[#DBEAFE] dark:border-blue-900/30 hover:border-[#93C5FD] hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#DBEAFE] dark:bg-blue-900/50 text-[#1D4ED8] dark:text-blue-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Icon name="help" className="text-[18px]" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-on-surface leading-snug">
                      Explain concept
                    </span>
                  </button>

                  <button
                    onClick={() => onSendChat(`Make node "${selectedNodeLabel}" concise and clean`)}
                    className="group flex flex-col items-start p-3.5 rounded-2xl bg-[#F0FDF4] dark:bg-emerald-950/20 border border-[#DCFCE7] dark:border-emerald-900/30 hover:border-[#86EFAC] hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] dark:bg-emerald-900/50 text-[#15803D] dark:text-emerald-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Icon name="short_text" className="text-[18px]" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-on-surface leading-snug">
                      Make concise
                    </span>
                  </button>

                  <button
                    onClick={() => onSendChat(`Find connections for "${selectedNodeLabel}" across other topics`)}
                    className="group flex flex-col items-start p-3.5 rounded-2xl bg-[#FDF2F8] dark:bg-fuchsia-950/20 border border-[#FCE7F3] dark:border-fuchsia-900/30 hover:border-[#F472B6] hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#FCE7F3] dark:bg-fuchsia-900/50 text-[#BE185D] dark:text-fuchsia-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Icon name="hub" className="text-[18px]" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-on-surface leading-snug">
                      Find connections
                    </span>
                  </button>
                </>
              ) : aiScope === "branch" && selectedNode ? (
                <>
                  <button
                    onClick={() => onSendChat(`Expand the entire "${selectedNodeLabel}" branch with sub-hierarchies`)}
                    className="group flex flex-col items-start p-3.5 rounded-2xl bg-[#FAF8FF] dark:bg-purple-950/20 border border-[#EDE9FE] dark:border-purple-900/30 hover:border-[#C4B5FD] hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] dark:bg-purple-900/50 text-[#6D28D9] dark:text-purple-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Icon name="account_tree" className="text-[18px]" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-on-surface leading-snug">
                      Expand branch
                    </span>
                  </button>

                  <button
                    onClick={() => onSendChat(`Reorganize the "${selectedNodeLabel}" branch for balanced depth`)}
                    className="group flex flex-col items-start p-3.5 rounded-2xl bg-[#F0F7FF] dark:bg-blue-950/20 border border-[#DBEAFE] dark:border-blue-900/30 hover:border-[#93C5FD] hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#DBEAFE] dark:bg-blue-900/50 text-[#1D4ED8] dark:text-blue-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Icon name="alt_route" className="text-[18px]" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-on-surface leading-snug">
                      Reorganize branch
                    </span>
                  </button>

                  <button
                    onClick={() => onSendChat(`Identify missing concepts in the "${selectedNodeLabel}" domain`)}
                    className="group flex flex-col items-start p-3.5 rounded-2xl bg-[#F0FDF4] dark:bg-emerald-950/20 border border-[#DCFCE7] dark:border-emerald-900/30 hover:border-[#86EFAC] hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] dark:bg-emerald-900/50 text-[#15803D] dark:text-emerald-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Icon name="lightbulb" className="text-[18px]" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-on-surface leading-snug">
                      Missing concepts
                    </span>
                  </button>

                  <button
                    onClick={() => onSendChat(`Summarize the "${selectedNodeLabel}" branch into key takeaways`)}
                    className="group flex flex-col items-start p-3.5 rounded-2xl bg-[#FDF2F8] dark:bg-fuchsia-950/20 border border-[#FCE7F3] dark:border-fuchsia-900/30 hover:border-[#F472B6] hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#FCE7F3] dark:bg-fuchsia-900/50 text-[#BE185D] dark:text-fuchsia-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Icon name="summarize" className="text-[18px]" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-on-surface leading-snug">
                      Summarize branch
                    </span>
                  </button>
                </>
              ) : (
                /* Entire Map Context */
                <>
                  <button
                    onClick={() => onSendChat("Improve map structure")}
                    className="group flex flex-col items-start p-3.5 rounded-2xl bg-[#FAF8FF] dark:bg-purple-950/20 border border-[#EDE9FE] dark:border-purple-900/30 hover:border-[#C4B5FD] hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] dark:bg-purple-900/50 text-[#6D28D9] dark:text-purple-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Icon name="schema" className="text-[18px]" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-on-surface leading-snug">
                      Improve map structure
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-on-surface-variant mt-0.5 leading-snug">
                      Reorganize and enhance
                    </span>
                  </button>

                  <button
                    onClick={() => onSendChat("Summarize entire map")}
                    className="group flex flex-col items-start p-3.5 rounded-2xl bg-[#F0F7FF] dark:bg-blue-950/20 border border-[#DBEAFE] dark:border-blue-900/30 hover:border-[#93C5FD] hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#DBEAFE] dark:bg-blue-900/50 text-[#1D4ED8] dark:text-blue-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Icon name="description" className="text-[18px]" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-on-surface leading-snug">
                      Summarize map
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-on-surface-variant mt-0.5 leading-snug">
                      Get key insights
                    </span>
                  </button>

                  <button
                    onClick={() => onSendChat("Identify gaps and missing concepts")}
                    className="group flex flex-col items-start p-3.5 rounded-2xl bg-[#F0FDF4] dark:bg-emerald-950/20 border border-[#DCFCE7] dark:border-emerald-900/30 hover:border-[#86EFAC] hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] dark:bg-emerald-900/50 text-[#15803D] dark:text-emerald-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Icon name="lightbulb" className="text-[18px]" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-on-surface leading-snug">
                      Find gaps & suggestions
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-on-surface-variant mt-0.5 leading-snug">
                      Discover missing concepts
                    </span>
                  </button>

                  <button
                    onClick={() => onSendChat("Analyze this map for coverage, duplication, structure, missing concepts, and complexity")}
                    className="group flex flex-col items-start p-3.5 rounded-2xl bg-[#FDF2F8] dark:bg-fuchsia-950/20 border border-[#FCE7F3] dark:border-fuchsia-900/30 hover:border-[#F472B6] hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#FCE7F3] dark:bg-fuchsia-900/50 text-[#BE185D] dark:text-fuchsia-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Icon name="bar_chart" className="text-[18px]" />
                    </div>
                    <span className="text-[13px] font-semibold text-gray-900 dark:text-on-surface leading-snug">
                      Analyze map
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-on-surface-variant mt-0.5 leading-snug">
                      Deep analysis & insights
                    </span>
                  </button>
                </>
              )}
            </div>

            {/* More actions dropdown */}
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-[13px] text-gray-500 hover:text-gray-800 dark:text-on-surface-variant dark:hover:text-on-surface flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-surface-container transition-colors font-medium cursor-pointer">
                    <span>More actions</span>
                    <Icon name="expand_more" className="text-[14px]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => onSendChat("Convert this map into a comprehensive exam study guide")} className="cursor-pointer">
                    <Icon name="school" className="mr-2 text-[16px] text-primary" /> Create study guide
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSendChat("Convert this map into an actionable project plan with milestones")} className="cursor-pointer">
                    <Icon name="task_alt" className="mr-2 text-[16px] text-emerald-600" /> Create project plan
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSendChat("Conduct a SWOT analysis based on this mind map")} className="cursor-pointer">
                    <Icon name="grid_view" className="mr-2 text-[16px] text-amber-600" /> Generate SWOT analysis
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200 dark:bg-outline-variant/30" />
              <span className="text-[11px] font-semibold text-gray-400 dark:text-outline uppercase tracking-wider">OR</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-outline-variant/30" />
            </div>

            {/* Example prompts section matching reference mockup */}
            <div className="flex flex-col gap-2 pt-0.5">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-700 dark:text-on-surface">
                  <Icon name="lightbulb" className="text-[15px] text-amber-500" />
                  <span>Example prompts</span>
                </div>
                <button
                  type="button"
                  onClick={handleShufflePrompts}
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-on-surface rounded-md hover:bg-surface-container transition-colors cursor-pointer"
                  title="Refresh prompts"
                  aria-label="Refresh prompts"
                >
                  <Icon name="refresh" className="text-[14px]" />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {currentExamplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSendChat(prompt)}
                    className="group flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-surface border border-gray-200/80 dark:border-outline-variant/35 hover:border-[#5b50e6]/50 hover:bg-[#FAF8FF] dark:hover:bg-purple-950/20 text-left transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="text-[12px] text-gray-700 dark:text-on-surface-variant group-hover:text-[#5b50e6] dark:group-hover:text-purple-300 font-medium truncate pr-2">
                      {prompt}
                    </span>
                    <Icon name="chevron_right" className="text-[16px] text-gray-400 group-hover:text-[#5b50e6] shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Conversation */
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} gap-1.5`}
              >
                {/* Assistant Avatar & Header */}
                {msg.role === "ai" && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-on-surface pl-1">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                      <Icon name="psychology" className="text-[14px]" />
                    </div>
                    <span>MindVault AI</span>
                  </div>
                )}

                {/* Main Message Bubble */}
                <div
                  className={`text-[13px] leading-relaxed break-words ${
                    msg.role === "user"
                      ? "px-3.5 py-2 rounded-2xl rounded-tr-xs bg-primary text-on-primary max-w-[85%] shadow-2xs font-medium"
                      : "px-3.5 py-2.5 rounded-2xl rounded-tl-xs bg-white dark:bg-surface text-gray-900 dark:text-on-surface border border-gray-200/70 dark:border-outline-variant/30 max-w-[92%] shadow-2xs"
                  }`}
                >
                  {msg.content}
                </div>

                {/* 3. SUGGESTED CHANGES CARD (Matching Image 4) */}
                {msg.suggestedChanges && msg.suggestedChanges.status === "pending" && (
                  <div className="w-full max-w-[92%] bg-white dark:bg-surface border border-gray-200/80 dark:border-outline-variant/35 rounded-2xl p-4 shadow-2xs space-y-3 mt-1">
                    <div>
                      <h4 className="text-[14px] font-bold text-gray-900 dark:text-on-surface">
                        Suggested Changes
                      </h4>
                      <p className="text-[12px] text-gray-600 dark:text-on-surface-variant mt-0.5">
                        {msg.suggestedChanges.summary}
                      </p>
                    </div>

                    <div className="space-y-1.5 py-1">
                      {msg.suggestedChanges.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[12px] text-gray-800 dark:text-on-surface font-medium">
                          <Icon name={item.icon || "add"} className="text-[15px] text-[#5b50e6]" />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onPreviewChanges(msg.id)}
                        className="px-4 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42d8] text-white text-[12px] font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => onApplyChanges(msg.id)}
                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-outline-variant/40 hover:bg-gray-50 dark:hover:bg-surface-container text-gray-800 dark:text-on-surface text-[12px] font-semibold transition-colors cursor-pointer"
                      >
                        Apply All
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. VISUAL PREVIEW CARD WITH THUMBNAIL (Matching Mockup Follow-up) */}
                {msg.suggestedChanges && msg.suggestedChanges.status === "previewing" && (
                  <div className="w-full max-w-[92%] bg-white dark:bg-surface border border-purple-200 dark:border-purple-900/40 rounded-2xl p-3.5 shadow-2xs space-y-3 mt-1">
                    {/* Graphical Mini-Map Schematic Thumbnail */}
                    <div className="rounded-xl border border-outline-variant/30 bg-[#FAF8FF] dark:bg-purple-950/20 p-2.5 flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="w-full flex items-center justify-between text-[11px] font-bold text-purple-700 dark:text-purple-300 pb-1.5 border-b border-purple-200/50 dark:border-purple-900/30">
                        <span className="flex items-center gap-1">
                          <Icon name="visibility" className="text-[13px]" />
                          <span>Live Canvas Preview Active</span>
                        </span>
                        <span className="text-[10px] bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded">
                          Dashed Highlights
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-center gap-3">
                        <div className="px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-bold">
                          Data & Feature
                        </div>
                        <div className="h-px w-10 border-t-2 border-dashed border-purple-500 relative flex items-center justify-center">
                          <span className="absolute -top-2.5 bg-purple-100 text-purple-700 px-1 rounded text-[8px] font-bold">
                            Related
                          </span>
                        </div>
                        <div className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          Traditional ML
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => onApplyChanges(msg.id)}
                        className="px-4 py-2 rounded-xl bg-[#5b50e6] hover:bg-[#4d42d8] text-white text-[12px] font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        Apply Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismissChanges(msg.id)}
                        className="px-4 py-2 rounded-xl border border-gray-200 dark:border-outline-variant/40 hover:bg-gray-50 dark:hover:bg-surface-container text-gray-800 dark:text-on-surface text-[12px] font-semibold transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. APPLIED / REVERTED CONFIRMATION CARD */}
                {msg.mapChanges && !msg.mapChanges.isUndone && (
                  <div className="bg-white dark:bg-surface border border-outline-variant/40 rounded-xl p-2.5 flex items-center justify-between w-full max-w-[92%] shadow-2xs text-[12px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-on-surface">Map updated</span>
                      {msg.mapChanges.nodesAdded > 0 && (
                        <span className="text-emerald-700 bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded font-medium">
                          +{msg.mapChanges.nodesAdded} nodes
                        </span>
                      )}
                      {msg.mapChanges.nodesDeleted > 0 && (
                        <span className="text-error bg-error/10 px-2 py-0.5 rounded font-medium">
                          -{msg.mapChanges.nodesDeleted} nodes
                        </span>
                      )}
                    </div>
                    {msg.mapChanges.snapshotId && (
                      <button
                        onClick={() => onUndoAIChat(msg.id, msg.mapChanges!.snapshotId!)}
                        className="text-primary hover:bg-primary/10 px-2 py-1 rounded font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Icon name="undo" className="text-[14px]" /> Undo
                      </button>
                    )}
                  </div>
                )}

                {msg.mapChanges?.isUndone && (
                  <div className="text-[11px] text-on-surface-variant flex items-center gap-1 pl-1">
                    <Icon name="undo" className="text-[12px]" /> AI changes reverted
                  </div>
                )}

                {/* RAG Grounding Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <details className="w-full max-w-[92%] bg-surface border border-primary/20 rounded-xl p-2 text-[11px] group">
                    <summary className="cursor-pointer font-medium text-primary flex items-center justify-between list-none">
                      <span className="flex items-center gap-1.5">
                        <Icon name="verified" className="text-[14px] text-primary" />
                        Grounded in {msg.sources.length} document source{msg.sources.length > 1 ? "s" : ""}
                      </span>
                      <Icon name="expand_more" className="text-[14px] transition-transform group-open:rotate-180 text-outline" />
                    </summary>
                    <div className="mt-2 space-y-1.5 pt-1.5 border-t border-outline-variant/20">
                      {msg.sources.map((s, idx) => (
                        <div key={idx} className="bg-surface-container-low p-2 rounded-lg font-mono text-on-surface-variant text-[11px]">
                          <div className="flex items-center justify-between font-semibold text-primary mb-1">
                            <span className="truncate max-w-[180px]">
                              {s.filename} {s.page_number ? `(p. ${s.page_number})` : ""}
                            </span>
                            <span className="text-[10px] bg-primary/10 px-1.5 py-0.5 rounded">
                              {(s.score * 100).toFixed(0)}% match
                            </span>
                          </div>
                          <p className="line-clamp-2 font-sans text-on-surface">{s.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}

            {isChatting && (
              <div className="flex items-center gap-2 text-on-surface-variant text-xs p-2">
                <Icon name="sync" className="animate-spin text-primary text-[16px]" />
                <span>MindVault AI is analyzing and updating your map...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* 3. Bottom Composer */}
      <div className="p-3 border-t border-outline-variant/30 bg-surface shrink-0">
        <div className="bg-white dark:bg-surface border border-gray-200/80 dark:border-outline-variant/40 rounded-2xl p-2 shadow-2xs transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
          {/* Target Scope Pill inside composer matching reference mockup */}
          {selectedNode ? (
            <div className="flex items-center justify-between px-2 py-1 mb-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-900/30 text-[11px]">
              <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 truncate">
                <Icon name="radio_button_checked" className="text-[13px] text-purple-600" />
                <span>Targeting: <strong className="font-semibold">{selectedNodeLabel}</strong></span>
              </div>
              <button
                type="button"
                onClick={onClearSelection}
                className="text-purple-600/70 hover:text-purple-900 dark:hover:text-purple-200 p-0.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 cursor-pointer"
                title="Switch to Entire Map"
              >
                <Icon name="close" className="text-[12px]" />
              </button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#5b50e6] dark:text-purple-400 mb-1.5 px-1 hover:text-primary transition-colors cursor-pointer select-none"
                  title="Current scope: Entire Map"
                >
                  <Icon name="public" className="text-[14px]" />
                  <span>Entire Map</span>
                  <Icon name="expand_more" className="text-[14px] opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => onChangeScope("entire_map")} className="cursor-pointer">
                  <Icon name="public" className="mr-2 text-[14px] text-primary" /> Entire map
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Text Input */}
          <textarea
            ref={composerTextareaRef}
            value={chatInput}
            onChange={(e) => {
              onChatInputChange(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (chatInput.trim() && !isChatting) {
                  onSendChat();
                }
              }
            }}
            placeholder="Ask anything about your map..."
            rows={1}
            className="w-full bg-transparent resize-none text-[13px] outline-none px-1 text-on-surface placeholder:text-gray-400 dark:placeholder:text-outline-variant max-h-[120px] leading-relaxed"
            disabled={isChatting}
          />

          {/* Composer Footer Actions */}
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100 dark:border-outline-variant/15">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenKnowledgeBase}
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  projectDocuments.length > 0
                    ? "text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-400"
                    : "text-gray-400 hover:text-gray-700 dark:text-on-surface-variant hover:bg-surface-container"
                }`}
                title={
                  projectDocuments.length > 0
                    ? `Knowledge Base (${projectDocuments.length} document${projectDocuments.length > 1 ? "s" : ""})`
                    : "Attach Knowledge Base Documents (RAG)"
                }
              >
                <Icon name="attach_file" className="text-[18px]" />
                {projectDocuments.length > 0 && (
                  <span className="text-[10px] font-bold px-1">{projectDocuments.length}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => toast.info("Web research & semantic grounding active")}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                title="Web Search & Semantic Grounding"
                aria-label="Web search"
              >
                <Icon name="language" className="text-[18px]" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onSendChat()}
              disabled={!chatInput.trim() || isChatting}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                chatInput.trim() && !isChatting
                  ? "bg-[#5b50e6] text-white shadow-xs hover:bg-[#4d42d8]"
                  : "bg-gray-100 dark:bg-surface-container-high text-gray-400 cursor-not-allowed"
              }`}
              aria-label="Send message"
              title="Send message (Enter)"
            >
              <Icon name="arrow_upward" className="text-[16px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
