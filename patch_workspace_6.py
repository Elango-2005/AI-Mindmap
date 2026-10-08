import re

with open('frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add AI Panel State and snapshot APIs
content = content.replace(
    'import { generateAIMindMap, getMindMap, chatMindMap, updateMindMap } from "@/api/mindmaps";',
    'import { generateAIMindMap, getMindMap, chatMindMap, updateMindMap, createSnapshot, restoreSnapshot } from "@/api/mindmaps";'
)

state_vars = """
  const [aiPanelState, setAiPanelState] = useState<"collapsed" | "expanded" | "full">("expanded");
"""
content = content.replace(
    'const [rightPanelMode, setRightPanelMode] = useState<"ai" | "inspector">("ai");',
    'const [rightPanelMode, setRightPanelMode] = useState<"ai" | "inspector">("ai");\n' + state_vars
)

# 2. Update chatMessages interface
old_chat = "const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);"
new_chat = """const [chatMessages, setChatMessages] = useState<{
    id: string;
    role: 'user' | 'ai';
    content: string;
    mapChanges?: { nodesAdded: number; nodesDeleted: number; snapshotId?: string; isUndone?: boolean };
  }[]>([]);"""
content = content.replace(old_chat, new_chat)

# 3. Rewrite handleSendChat for snapshots and rich messages
old_send_chat = """  async function handleSendChat(overrideMessage?: string) {
    const userMessage = (typeof overrideMessage === "string" ? overrideMessage : chatInput).trim();
    if (!userMessage || !mindMapId) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatting(true);
    try {
      const response = await chatMindMap(mindMapId, userMessage, selectedNodeId);
      setChatMessages(prev => [...prev, { role: "ai", content: response.response_text }]);
      const existingNodeIds = new Set(flowNodes.map(n => n.id));
      const existingEdgeIds = new Set(flowEdges.map(e => e.id));
      
      const newNodes = response.nodes.filter(n => !existingNodeIds.has(n.id)).map(n => ({
        id: n.id,
        position: { x: n.position_x || (selectedNode ? selectedNode.position.x + 200 : 0), y: n.position_y || (selectedNode ? selectedNode.position.y + 150 : 0) },
        data: { label: n.label, mindMapId },
        type: "editable"
      }));
      const newEdges = response.edges.filter(e => !existingEdgeIds.has(e.id)).map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "editable",
        animated: true
      }));
      if (newNodes.length > 0 || newEdges.length > 0) {
        const mergedNodes = [...flowNodes, ...newNodes];
        const mergedEdges = [...flowEdges, ...newEdges];
        const { nodes: coloredNodes, edges: coloredEdges } = applyColorsToGraph(mergedNodes, mergedEdges);
        setFlowNodes(coloredNodes);
        setFlowEdges(coloredEdges);
      } else {
        await loadGraph();
      }
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: "ai", content: "Error modifying the map." }]);
    } finally {
      setIsChatting(false);
    }
  }"""

new_send_chat = """
  async function handleUndoAIChat(messageId: string, snapshotId: string) {
    if (!mindMapId) return;
    try {
      toast.info("Undoing AI changes...");
      await restoreSnapshot(mindMapId, snapshotId);
      setChatMessages(prev => prev.map(m => m.id === messageId ? { ...m, mapChanges: { ...m.mapChanges!, isUndone: true } } : m));
      await loadGraph();
      toast.success("AI changes undone");
    } catch (e) {
      console.error(e);
      toast.error("Failed to undo changes");
    }
  }

  async function handleSendChat(overrideMessage?: string) {
    const userMessage = (typeof overrideMessage === "string" ? overrideMessage : chatInput).trim();
    if (!userMessage || !mindMapId) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: "user", content: userMessage }]);
    setIsChatting(true);
    
    let snapshotId: string | undefined = undefined;
    try {
      const snap = await createSnapshot(mindMapId, `Pre-AI: ${userMessage.substring(0,20)}`);
      snapshotId = snap.id;
    } catch(e) { console.warn("Failed to snapshot", e); }

    try {
      const currentNodesIds = new Set(flowNodes.map(n => n.id));
      const response = await chatMindMap(mindMapId, userMessage, selectedNodeId);
      
      const newNodesIds = new Set(response.nodes.map(n => n.id));
      let added = 0; let deleted = 0;
      newNodesIds.forEach(id => { if (!currentNodesIds.has(id)) added++; });
      currentNodesIds.forEach(id => { if (!newNodesIds.has(id)) deleted++; });
      
      const mapChanges = (added > 0 || deleted > 0) ? { nodesAdded: added, nodesDeleted: deleted, snapshotId } : undefined;
      
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: "ai", content: response.response_text, mapChanges }]);
      await loadGraph(); // fully reload the graph based on new backend state
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: "ai", content: "Error modifying the map." }]);
    } finally {
      setIsChatting(false);
    }
  }
"""
content = content.replace(old_send_chat, new_send_chat)

# 4. Replace Right Panel UI
start_str = '        {/* 5. RIGHT PANEL (AI Copilot / Node Inspector) */}'
end_str = '      <ShareModal'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

new_panel_ui = """
        {/* 5. RIGHT PANEL (AI Copilot / Node Inspector) */}
        {flowNodes.length > 0 && aiPanelState === "collapsed" && (
           <div className="absolute bottom-6 right-6 z-20">
             <button onClick={() => setAiPanelState("expanded")} className="bg-surface shadow-level-3 text-primary p-4 rounded-full flex items-center gap-2 hover:bg-surface-container-low transition-colors">
                <Icon name="auto_awesome" className="text-[24px] text-accent-violet" />
             </button>
           </div>
        )}

        {flowNodes.length > 0 && aiPanelState !== "collapsed" && (
          <aside className={`${aiPanelState === "full" ? "w-[600px] absolute right-0 bottom-0 top-0 shadow-2xl" : "w-[360px]"} bg-surface border-l border-outline-variant/30 flex flex-col z-20 shrink-0 transition-all duration-300`}>
            {/* Panel Header */}
            <div className="flex items-center justify-between p-3 border-b border-outline-variant/30 bg-surface-container-lowest">
               <div className="flex items-center p-1 bg-surface-container-low rounded-lg gap-1">
                  <button onClick={() => setRightPanelMode("ai")} className={`px-3 py-1.5 rounded-md text-label-sm font-semibold transition-colors flex items-center gap-1 ${rightPanelMode === "ai" ? "bg-surface shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
                     <Icon name="auto_awesome" className="text-[16px]" /> AI Copilot
                  </button>
                  <button onClick={() => setRightPanelMode("inspector")} className={`px-3 py-1.5 rounded-md text-label-sm font-semibold transition-colors flex items-center gap-1 ${rightPanelMode === "inspector" ? "bg-surface shadow-sm text-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
                     <Icon name="tune" className="text-[16px]" /> Inspector
                  </button>
               </div>
               <div className="flex items-center gap-1">
                  <button onClick={() => setAiPanelState(aiPanelState === "full" ? "expanded" : "full")} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title={aiPanelState === "full" ? "Collapse to Sidebar" : "Expand to Full"}>
                     <Icon name={aiPanelState === "full" ? "close_fullscreen" : "open_in_full"} className="text-[18px]" />
                  </button>
                  <button onClick={() => setAiPanelState("collapsed")} className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" title="Hide AI Panel">
                     <Icon name="close" className="text-[18px]" />
                  </button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {rightPanelMode === "ai" ? (
                <div className="flex flex-col h-full bg-surface-container-lowest">
                  
                  {/* Chat History */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center mt-10 p-4">
                        <Icon name="forum" className="text-[32px] text-primary/40 mb-2" />
                        <h4 className="text-label-lg font-semibold">Ready to transform your map?</h4>
                        <p className="text-body-sm text-on-surface-variant mt-2">I can organize ideas, expand branches, and summarize concepts.</p>
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div className={`p-3 rounded-2xl text-body-sm ${msg.role === "user" ? "bg-primary text-on-primary max-w-[85%] rounded-br-sm" : "bg-surface-container-low text-on-surface border border-outline-variant/30 max-w-[90%] rounded-bl-sm"}`}>
                          {msg.content}
                        </div>
                        {msg.mapChanges && !msg.mapChanges.isUndone && (
                           <div className="mt-2 bg-surface border border-outline-variant/40 rounded-xl p-2.5 flex items-center justify-between w-full max-w-[90%] shadow-sm">
                              <div className="flex items-center gap-3 text-label-xs font-semibold">
                                 {msg.mapChanges.nodesAdded > 0 && <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">+{msg.mapChanges.nodesAdded} nodes</span>}
                                 {msg.mapChanges.nodesDeleted > 0 && <span className="text-error bg-error/10 px-2 py-0.5 rounded">-{msg.mapChanges.nodesDeleted} nodes</span>}
                              </div>
                              {msg.mapChanges.snapshotId && (
                                <button onClick={() => handleUndoAIChat(msg.id, msg.mapChanges!.snapshotId!)} className="text-primary hover:bg-primary/10 px-3 py-1 rounded text-label-xs font-bold transition-colors">
                                   Undo
                                </button>
                              )}
                           </div>
                        )}
                        {msg.mapChanges?.isUndone && (
                           <div className="mt-1 text-label-xs text-outline-variant flex items-center gap-1">
                              <Icon name="undo" className="text-[12px]" /> AI changes reverted
                           </div>
                        )}
                      </div>
                    ))}
                    {isChatting && (
                      <div className="p-3 rounded-2xl bg-surface-container-low flex items-center gap-2 text-label-sm self-start text-on-surface-variant">
                        <Icon name="sync" className="animate-spin text-primary" /> <span>Analyzing and modifying map...</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions (only if empty input) */}
                  {!chatInput && !isChatting && (
                    <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar snap-x">
                      {selectedNode ? (
                         <>
                            <button onClick={() => handleSendChat("Expand this branch in detail")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface">Expand branch</button>
                            <button onClick={() => handleSendChat("Simplify this branch")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface">Simplify</button>
                            <button onClick={() => handleSendChat("Find missing related concepts")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface">Find related</button>
                         </>
                      ) : (
                         <>
                            <button onClick={() => handleSendChat("Improve map structure")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface">Improve structure</button>
                            <button onClick={() => handleSendChat("Summarize entire map")} className="snap-start shrink-0 text-label-xs font-medium border border-outline-variant/50 hover:bg-surface-container rounded-full px-3 py-1.5 transition-colors text-on-surface">Summarize map</button>
                         </>
                      )}
                    </div>
                  )}

                  {/* AI Composer */}
                  <div className="p-3 border-t border-outline-variant/20 bg-surface">
                    <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-2 flex flex-col focus-within:border-primary focus-within:shadow-sm transition-all">
                      
                      {/* Context Chip */}
                      <div className="flex items-center gap-2 mb-2 px-2 pt-1 text-label-xs font-semibold text-primary">
                         <Icon name={selectedNode ? "my_location" : "public"} className="text-[14px]" />
                         <span className="truncate max-w-[250px]">
                            {selectedNode ? `Targeting: ${selectedNode.data.label}` : 'Scope: Entire Map'}
                         </span>
                      </div>
                      
                      <textarea
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                        placeholder="Ask AI to modify..."
                        className="w-full bg-transparent resize-none text-body-md outline-none min-h-[44px] px-2 text-on-surface placeholder:text-outline-variant"
                        disabled={isChatting}
                      />
                      
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex gap-1 ml-1 text-outline">
                           <button className="p-1.5 hover:bg-surface-container rounded-lg transition-colors tooltip-trigger" title="Attach file (Coming soon)" disabled><Icon name="attach_file" className="text-[18px]" /></button>
                        </div>
                        <button
                          onClick={() => handleSendChat()}
                          disabled={!chatInput.trim() || isChatting}
                          className="p-1.5 bg-primary text-on-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:bg-surface-container-high disabled:text-outline transition-colors"
                        >
                          <Icon name="arrow_upward" className="text-[20px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Inspector View */
                <div className="p-4 flex flex-col gap-6">
                  {!selectedNode ? (
                    <div className="text-center text-on-surface-variant mt-10">
                      <Icon name="touch_app" className="text-[32px] opacity-40 mb-2" />
                      <p className="text-body-sm">Select a node to inspect and edit details.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-label-xs font-bold text-outline uppercase tracking-wider mb-2 block">Node Label</label>
                        <textarea 
                          value={selectedNode.data.label as string}
                          onChange={(e) => {
                            const newLabel = e.target.value;
                            setFlowNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: newLabel } } : n));
                          }}
                          onBlur={() => updateNode(selectedNode.id, { label: selectedNode.data.label as string })}
                          className="w-full bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-3 text-body-md focus:border-primary outline-none resize-none min-h-[80px]"
                        />
                      </div>
                      <div className="h-px bg-outline-variant/30" />
                      <div>
                         <label className="text-label-xs font-bold text-outline uppercase tracking-wider mb-3 block">Quick Actions</label>
                         <div className="flex flex-col gap-2">
                            <button onClick={() => setConfirmAction({ type: 'regenerate', nodeId: selectedNode.id, nodeLabel: selectedNode.data.label as string })} className="flex items-center gap-3 p-2 hover:bg-surface-container-low rounded-lg text-left text-body-sm">
                               <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary"><Icon name="auto_awesome" /></div>
                               <div><div className="font-semibold text-on-surface">AI Regenerate</div><div className="text-on-surface-variant text-[11px]">Replace descendants</div></div>
                            </button>
                            <button onClick={() => setConfirmAction({ type: 'delete', nodeId: selectedNode.id, nodeLabel: selectedNode.data.label as string })} className="flex items-center gap-3 p-2 hover:bg-error-container/30 rounded-lg text-left text-body-sm text-error">
                               <div className="w-8 h-8 rounded bg-error/10 flex items-center justify-center text-error"><Icon name="delete" /></div>
                               <div><div className="font-semibold">Delete Node</div><div className="opacity-70 text-[11px]">Remove node & children</div></div>
                            </button>
                         </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
"""

content = content[:start_idx] + new_panel_ui + content[end_idx:]

with open('frontend/src/routes/workspace.$mindMapId.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patch applied for Phase 6.")
