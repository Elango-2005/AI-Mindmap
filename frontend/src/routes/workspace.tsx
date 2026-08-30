import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import {
  useEffect,
  useState,
  type MouseEvent,
} from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  type NodeChange,
  type NodeDragHandler,
  type Node as FlowNode,
  type Edge as FlowEdge,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { generateAIMindMap, getMindMap } from "@/api/mindmaps";
import {
  getMindMapNodes,
  updateNode,
  summarizeNode,
} from "@/api/nodes";
import { getMindMapEdges } from "@/api/edges";
import { AppSidebar } from "@/components/AppSidebar";
import { Icon } from "@/components/Icon";
import { EditableNode } from "@/components/EditableNode";
import { LOGO_URL } from "@/lib/assets";

const TITLE = "Neural Networking 101 — MindVault AI Workspace";

const DESCRIPTION =
  "Explore and expand the Neural Networking 101 mind map with AI-assisted node generation.";

export const Route = createFileRoute("/workspace")({
  validateSearch: (search: Record<string, unknown>) => ({
    mindMapId:
      typeof search.mindMapId === "string"
        ? search.mindMapId
        : undefined,
  }),

  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),

  component: Workspace,
});

const AI_ACTIONS = [
  {
    id: "expand",
    icon: "expand_content",
    title: "Expand Concept",
    body: "Generate sub-nodes exploring this concept.",
  },
  {
    id: "summarize",
    icon: "summarize",
    title: "Summarize Node",
    body: "Create a concise technical summary of this node.",
  },
  {
    id: "connect",
    icon: "conversion_path",
    title: "Find Connections",
    body: "Discover hidden links to other map sectors.",
  },
];

const nodeTypes = {
  editable: EditableNode,
};

function Workspace() {
  const { mindMapId } = useSearch({
    from: "/workspace",
  });

  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);

  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>(null);

  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);

  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [generationError, setGenerationError] =
    useState<string | null>(null);

  const [generationSuccess, setGenerationSuccess] =
    useState(false);

  const [mindMapTitle, setMindMapTitle] = useState("Loading...");

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [nodeSummary, setNodeSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Clear summary when selected node changes
  useEffect(() => {
    setNodeSummary(null);
    setSummaryError(null);
  }, [selectedNodeId]);

  async function loadGraph() {
    if (!mindMapId) {
      return;
    }

    setIsLoadingGraph(true);
    setGraphError(null);

    try {
      const [nodes, edges, mindMapData] = await Promise.all([
        getMindMapNodes(mindMapId),
        getMindMapEdges(mindMapId),
        getMindMap(mindMapId),
      ]);

      setMindMapTitle(mindMapData.title);

      const columns = 4;
      const spacingX = 300;
      const spacingY = 220;

      /*
       * Nodes with non-zero coordinates already have a saved
       * position. We must preserve those positions.
       */
      const nodesWithStoredPositions = nodes.filter(
        (node) =>
          node.position_x !== 0 ||
          node.position_y !== 0,
      );

      /*
       * Nodes at (0, 0) are treated as newly generated/
       * uninitialized nodes.
       */
      const nodesWithoutPositions = nodes.filter(
        (node) =>
          node.position_x === 0 &&
          node.position_y === 0,
      );

      /*
       * Find the lowest safe Y position below the existing
       * graph. This prevents newly positioned nodes from
       * overlapping nodes that already have saved positions.
       */
      let nextY = 0;

      if (nodesWithStoredPositions.length > 0) {
        const maxStoredY = Math.max(
          ...nodesWithStoredPositions.map(
            (node) => node.position_y,
          ),
        );

        nextY = maxStoredY + spacingY;
      }

      /*
       * Convert backend nodes into React Flow nodes.
       */
      const mappedNodes: FlowNode[] = nodes.map(
        (node) => {
          const hasStoredPosition =
            node.position_x !== 0 ||
            node.position_y !== 0;

          if (hasStoredPosition) {
            return {
              id: node.id,
              position: {
                x: node.position_x,
                y: node.position_y,
              },
              data: {
                label: node.label,
              },
              type: "editable",
            };
          }

          /*
           * This position will be replaced for the
           * uninitialized nodes below.
           */
          return {
            id: node.id,
            position: {
              x: 0,
              y: 0,
            },
            data: {
              label: node.label,
            },
            type: "editable",
          };
        },
      );

      /*
       * Assign deterministic positions to nodes that don't
       * have saved coordinates yet.
       */
      const nodesToPersist: Array<{
        id: string;
        position_x: number;
        position_y: number;
      }> = [];

      nodesWithoutPositions.forEach(
        (node, index) => {
          const column = index % columns;
          const row = Math.floor(index / columns);

          const positionX =
            column * spacingX;

          const positionY =
            nextY + row * spacingY;

          const flowNode = mappedNodes.find(
            (item) => item.id === node.id,
          );

          if (flowNode) {
            flowNode.position = {
              x: positionX,
              y: positionY,
            };
          }

          nodesToPersist.push({
            id: node.id,
            position_x: positionX,
            position_y: positionY,
          });
        },
      );

      /*
       * Convert backend edges into React Flow edges.
       */
      const mappedEdges: FlowEdge[] = edges.map(
        (edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label ?? undefined,
          type: edge.type || "default",
          animated: edge.animated,
        }),
      );

      /*
       * Update the UI immediately.
       */
      setFlowNodes(mappedNodes);
      setFlowEdges(mappedEdges);

      /*
       * Persist the generated initial positions so that
       * subsequent reloads use the database coordinates.
       */
      if (nodesToPersist.length > 0) {
        await Promise.all(
          nodesToPersist.map((node) =>
            updateNode(node.id, {
              position_x: node.position_x,
              position_y: node.position_y,
            }),
          ),
        );
      }
    } catch (error) {
      console.error(
        "Failed to load mind map graph:",
        error,
      );

      setGraphError(
        "Failed to load the mind map graph.",
      );
    } finally {
      setIsLoadingGraph(false);
    }
  }

  useEffect(() => {
    loadGraph();
  }, [mindMapId]);

  async function handleGenerateAI(fallbackTopic?: string) {
    // Determine root node to use as fallback topic if input is empty
    const rootNode = flowNodes.find(node => !flowEdges.some(edge => edge.target === node.id)) || flowNodes[0];
    const rootTopic = rootNode ? (rootNode.data.label as string) : "";
    
    const finalTopic = (topic.trim() || (typeof fallbackTopic === 'string' ? fallbackTopic : '') || rootTopic || mindMapTitle).trim();
    
    if (
      !mindMapId ||
      !finalTopic ||
      isGenerating
    ) {
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(false);

    try {
      await generateAIMindMap(mindMapId, {
        topic: finalTopic,
      });

      await loadGraph();

      setGenerationSuccess(true);
    } catch (error) {
      console.error(
        "AI mind map generation failed:",
        error,
      );

      setGenerationError(
        "Failed to generate the mind map. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSummarizeNode() {
    if (!selectedNodeId) return;

    setIsSummarizing(true);
    setNodeSummary(null);
    setSummaryError(null);

    try {
      const response = await summarizeNode(selectedNodeId);
      setNodeSummary(response.summary);
    } catch (error) {
      console.error("Failed to summarize node:", error);
      setSummaryError("Failed to summarize node. Please try again.");
    } finally {
      setIsSummarizing(false);
    }
  }

  /*
   * React Flow calls this whenever a node changes.
   *
   * This keeps the local React state synchronized with
   * React Flow while dragging, selecting, etc.
   */
  function handleNodesChange(
    changes: NodeChange[],
  ) {
    setFlowNodes((currentNodes) =>
      applyNodeChanges(
        changes,
        currentNodes,
      ),
    );
  }

  /*
   * Save the final node position to the backend
   * after the user finishes dragging the node.
   */
  const handleNodeDragStop: NodeDragHandler =
    async (_event, node) => {
      try {
        await updateNode(node.id, {
          position_x: node.position.x,
          position_y: node.position.y,
        });
      } catch (error) {
        console.error(
          "Failed to save node position:",
          error,
        );
      }
    };

  const handleNodeClick = (_event: React.MouseEvent, node: FlowNode) => {
    setSelectedNodeId(node.id);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
  };

  const selectedNode = selectedNodeId ? flowNodes.find(n => n.id === selectedNodeId) : null;
  const incomingEdges = selectedNodeId ? flowEdges.filter(e => e.target === selectedNodeId) : [];
  const outgoingEdges = selectedNodeId ? flowEdges.filter(e => e.source === selectedNodeId) : [];

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <nav className="bg-surface/70 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm flex justify-between items-center w-full px-lg py-md sticky top-0 z-50">
        <div className="flex items-center gap-md">
          <img
            src={LOGO_URL}
            alt="MindVault AI logo"
            className="w-8 h-8 rounded-lg object-cover"
          />

          <span className="text-headline-md font-bold text-primary tracking-tight">
            MindVault AI
          </span>
        </div>

        <div className="hidden md:flex items-center gap-lg">
          <Link
            to="/dashboard"
            className="text-on-surface-variant hover:text-primary transition-colors text-label-md"
          >
            Dashboard
          </Link>

          <span className="text-primary font-bold border-b-2 border-primary pb-1 text-label-md">
            Workspace
          </span>

          <Link
            to="/present"
            className="text-on-surface-variant hover:text-primary transition-colors text-label-md"
          >
            Explore
          </Link>
        </div>

        <div className="flex items-center gap-sm">
          <span className="text-label-md text-on-surface-variant mr-md hidden md:inline">
            {mindMapTitle}
          </span>

          <button
            aria-label="Share"
            className="text-on-surface-variant hover:bg-surface-container-high/50 p-sm rounded-lg transition-all"
          >
            <Icon name="share" />
          </button>

          <button
            aria-label="Download"
            className="text-on-surface-variant hover:bg-surface-container-high/50 p-sm rounded-lg transition-all"
          >
            <Icon name="download" />
          </button>

          <button className="hidden md:block px-md py-sm rounded-lg text-primary bg-surface-container-high/50 text-label-md hover:bg-surface-container-high transition-all">
            Upgrade
          </button>

          <button
            onClick={() => handleGenerateAI()}
            disabled={isGenerating || !mindMapId}
            className="bg-primary text-on-primary px-md py-sm rounded-lg text-label-md hover:bg-on-primary-fixed-variant transition-all flex items-center gap-xs ai-glow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon
              name={isGenerating ? "progress_activity" : "autorenew"}
              className={`text-[18px] ${isGenerating ? "animate-spin" : ""}`}
            />
            Regenerate
          </button>

          <button
            aria-label="Notifications"
            className="text-on-surface-variant hover:bg-surface-container-high/50 p-sm rounded-lg transition-all ml-sm"
          >
            <Icon name="notifications" />
          </button>

          <button
            aria-label="Help"
            className="text-on-surface-variant hover:bg-surface-container-high/50 p-sm rounded-lg transition-all"
          >
            <Icon name="help" />
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <AppSidebar
          active="Projects"
          showBrand={false}
          ctaVariant="muted"
        />

        <main className="flex-1 relative dot-grid overflow-hidden bg-background">
          {mindMapId && (
            <div className="absolute top-4 left-4 z-40 bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-2 text-label-sm">
              Mind Map: {mindMapId}
            </div>
          )}

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-6">
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-2 shadow-level-2 flex items-center gap-2">
              <Icon
                name="auto_awesome"
                className="text-tertiary text-[24px] ml-4"
              />
              
              <input
                type="text"
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  setGenerationError(null);
                  setGenerationSuccess(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateAI();
                }}
                placeholder="Message AI to generate a mind map..."
                disabled={isGenerating}
                className="flex-1 bg-transparent border-none px-2 py-3 text-body-lg text-on-surface focus:outline-none disabled:opacity-60"
              />

              <button
                onClick={() => handleGenerateAI()}
                disabled={
                  !mindMapId ||
                  !topic.trim() ||
                  isGenerating
                }
                className="bg-primary text-on-primary w-12 h-12 rounded-full hover:bg-on-primary-fixed-variant transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 mr-1"
                title="Generate Mind Map"
              >
                <Icon
                  name={
                    isGenerating
                      ? "progress_activity"
                      : "arrow_upward"
                  }
                  className="text-[24px]"
                />
              </button>
            </div>

            {generationError && (
              <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-error-container text-on-error-container px-4 py-2 rounded-lg text-label-sm whitespace-nowrap shadow-sm border border-error/20">
                {generationError}
              </div>
            )}

            {generationSuccess && (
              <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-surface-container-high text-tertiary px-4 py-2 rounded-lg text-label-sm whitespace-nowrap shadow-sm border border-tertiary/20">
                Mind map generated successfully.
              </div>
            )}
          </div>

          <div className="absolute inset-0 z-[1]">
            {isLoadingGraph && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-md py-sm shadow-sm">
                  Loading mind map...
                </div>
              </div>
            )}

            {graphError && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-error-container text-on-error-container border border-error/30 rounded-lg px-md py-sm">
                {graphError}
              </div>
            )}

            {!isLoadingGraph &&
              flowNodes.length > 0 && (
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  nodeTypes={nodeTypes}
                  fitView
                  attributionPosition="bottom-left"
                  nodesDraggable={true}
                  nodesConnectable={false}
                  elementsSelectable={true}
                  onNodesChange={handleNodesChange}
                  onNodeDragStop={handleNodeDragStop}
                  onNodeClick={handleNodeClick}
                  onPaneClick={handlePaneClick}
                >
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>
              )}
          </div>
        </main>

        <aside className="hidden lg:flex w-[320px] bg-surface-container-lowest border-l border-outline-variant/30 shadow-sm flex-col z-20 overflow-y-auto">
          <div className="p-lg border-b border-outline-variant/20 flex items-center gap-sm sticky top-0 bg-surface-container-lowest">
            <Icon
              name="psychology"
              className="text-tertiary text-[24px]"
            />

            <h3 className="text-headline-md text-on-surface">
              AI Intelligence
            </h3>
          </div>

          <div className="p-lg flex flex-col gap-md">
            {selectedNode ? (
              <>
                <div>
                  <p className="text-label-md text-on-surface-variant mb-xs">
                    Selected Node
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    Node details and real-time intelligence.
                  </p>
                </div>

                <div className="flex flex-col gap-sm bg-surface p-md rounded-xl border border-outline-variant/20">
                  <div>
                    <span className="text-label-sm text-on-surface-variant">Label</span>
                    <p className="text-body-md font-semibold text-on-surface">{selectedNode.data.label as string}</p>
                  </div>
                  <div>
                    <span className="text-label-sm text-on-surface-variant">Type</span>
                    <p className="text-body-md text-on-surface capitalize">{selectedNode.type}</p>
                  </div>
                  <div className="flex gap-md">
                    <div>
                      <span className="text-label-sm text-on-surface-variant">Position X</span>
                      <p className="text-body-md text-on-surface">{Math.round(selectedNode.position.x)}</p>
                    </div>
                    <div>
                      <span className="text-label-sm text-on-surface-variant">Position Y</span>
                      <p className="text-body-md text-on-surface">{Math.round(selectedNode.position.y)}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-label-sm text-on-surface-variant">Connections</span>
                    <div className="flex gap-md mt-xs">
                      <div className="bg-surface-container-high px-sm py-xs rounded-md">
                        <span className="text-label-sm font-semibold">{incomingEdges.length} Incoming</span>
                      </div>
                      <div className="bg-surface-container-high px-sm py-xs rounded-md">
                        <span className="text-label-sm font-semibold">{outgoingEdges.length} Outgoing</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-sm">
                  <p className="text-label-md text-on-surface-variant mb-sm">Node Actions</p>
                  {AI_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => {
                        if (action.id === "summarize") {
                          handleSummarizeNode();
                        }
                      }}
                      disabled={isSummarizing && action.id === "summarize"}
                      className="w-full text-left bg-surface p-md rounded-xl border border-outline-variant/20 hover:border-tertiary/50 transition-colors group mb-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-sm mb-xs">
                        <Icon
                          name={action.icon}
                          className="text-tertiary text-[18px] group-hover:scale-110 transition-transform"
                        />
                        <h4 className="text-label-md font-semibold text-on-surface">
                          {action.title}
                        </h4>
                      </div>
                      <p className="text-label-sm text-on-surface-variant">
                        {action.body}
                      </p>
                    </button>
                  ))}

                  {/* Display Summary for Selected Node */}
                  {isSummarizing && (
                    <div className="mt-md p-md rounded-xl bg-surface-container flex items-center justify-center text-label-sm text-on-surface-variant">
                      <Icon name="progress_activity" className="animate-spin mr-sm" />
                      Generating summary...
                    </div>
                  )}
                  
                  {summaryError && (
                    <div className="mt-md p-md rounded-xl bg-error-container text-on-error-container text-label-sm">
                      {summaryError}
                    </div>
                  )}
                  
                  {nodeSummary && (
                    <div className="mt-md p-md rounded-xl bg-tertiary-container/30 border border-tertiary/20 text-body-sm text-on-surface">
                      <div className="flex items-center gap-xs mb-xs text-tertiary">
                        <Icon name="auto_awesome" className="text-[16px]" />
                        <span className="font-semibold text-label-sm">AI Summary</span>
                      </div>
                      {nodeSummary}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-label-md text-on-surface-variant mb-xs">
                    Graph Overview
                  </p>
                  <p className="text-label-sm text-on-surface-variant mb-sm">
                    Select a node to analyze or edit its content.
                  </p>
                </div>

                <div className="flex gap-md mb-md">
                  <div className="flex-1 bg-surface p-md rounded-xl border border-outline-variant/20 flex flex-col items-center justify-center">
                    <span className="text-headline-md font-bold text-primary">{flowNodes.length}</span>
                    <span className="text-label-sm text-on-surface-variant">Nodes</span>
                  </div>
                  <div className="flex-1 bg-surface p-md rounded-xl border border-outline-variant/20 flex flex-col items-center justify-center">
                    <span className="text-headline-md font-bold text-tertiary">{flowEdges.length}</span>
                    <span className="text-label-sm text-on-surface-variant">Connections</span>
                  </div>
                </div>

                <p className="text-label-md text-on-surface-variant mb-sm">Map Actions</p>
                {AI_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="text-left bg-surface p-md rounded-xl border border-outline-variant/20 hover:border-tertiary/50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed opacity-50"
                  >
                    <div className="flex items-center gap-sm mb-xs">
                      <Icon
                        name={action.icon}
                        className="text-tertiary text-[18px] group-hover:scale-110 transition-transform"
                      />
                      <h4 className="text-label-md font-semibold text-on-surface">
                        {action.title}
                      </h4>
                    </div>
                    <p className="text-label-sm text-on-surface-variant">
                      Select a node first to use this action.
                    </p>
                  </button>
                ))}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}