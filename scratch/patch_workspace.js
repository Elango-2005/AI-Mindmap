const fs = require('fs');

const wsPath = 'frontend/src/routes/workspace.$mindMapId.tsx';
let wsContent = fs.readFileSync(wsPath, 'utf8');

// 1. Add handleExportJSON right after handleExportPDF
const pdfTarget = `  const handleExportPDF = () => exportMindMapToPdf({ nodes: flowNodes, title: mindMapTitle });`;
const jsonExportCode = `  const handleExportPDF = () => exportMindMapToPdf({ nodes: flowNodes, title: mindMapTitle });

  const handleExportJSON = () => {
    const data = {
      title: mindMapTitle,
      nodes: flowNodes,
      edges: flowEdges,
      layout: layoutDirection,
      theme: currentTheme,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = \`\${mindMapTitle || "mindmap"}.json\`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Exported as JSON");
  };`;

if (!wsContent.includes('const handleExportJSON') && wsContent.includes(pdfTarget)) {
  wsContent = wsContent.replace(pdfTarget, jsonExportCode);
  console.log('Added handleExportJSON function');
}

// 2. Update Export Dropdown to match Image 6
const exportDropdownTarget = `          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant/60 bg-surface hover:bg-surface-container text-on-surface text-label-sm font-medium rounded-lg transition-colors cursor-pointer shadow-2xs">
                <Icon name="ios_share" className="text-[16px]" />
                <span>Export</span>
                <Icon name="arrow_drop_down" className="text-[16px] text-on-surface-variant -mr-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-outline font-medium px-2 py-1">Image & PDF</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportImage} className="cursor-pointer"><Icon name="image" className="mr-2 text-[16px]" /> Export as PNG</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer"><Icon name="picture_as_pdf" className="mr-2 text-[16px]" /> Export as PDF</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-outline font-medium px-2 py-1">Text</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("markdown")} className="cursor-pointer"><Icon name="description" className="mr-2 text-[16px]" /> Export as Markdown</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("html")} className="cursor-pointer"><Icon name="code" className="mr-2 text-[16px]" /> Export as HTML</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-outline font-medium px-2 py-1">Project Data</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("xmind")} className="cursor-pointer"><Icon name="account_tree" className="mr-2 text-[16px]" /> Export as XMind</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("freemind")} className="cursor-pointer"><Icon name="account_tree" className="mr-2 text-[16px]" /> Export as FreeMind</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("opml")} className="cursor-pointer"><Icon name="account_tree" className="mr-2 text-[16px]" /> Export as OPML</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs text-outline font-medium px-2 py-1">Cloud Sync</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setIsMindMeisterModalOpen(true)} className="cursor-pointer text-primary font-medium">
                  <Icon name="cloud_sync" className="mr-2 text-[16px]" /> MindMeister Cloud...
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCoggleModalOpen(true)} className="cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium">
                  <Icon name="share" className="mr-2 text-[16px]" /> Coggle Cloud...
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>`;

const exportDropdownReplacement = `          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant/60 bg-surface hover:bg-surface-container text-on-surface text-label-sm font-medium rounded-lg transition-colors cursor-pointer shadow-2xs">
                <Icon name="ios_share" className="text-[16px]" />
                <span>Export</span>
                <Icon name="arrow_drop_down" className="text-[16px] text-on-surface-variant -mr-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl border border-outline-variant/60 bg-surface">
              <DropdownMenuItem onClick={handleExportPDF} className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
                <Icon name="picture_as_pdf" className="text-[17px] text-red-500" />
                <span>Export as PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportImage} className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
                <Icon name="image" className="text-[17px] text-blue-500" />
                <span>Export as Image (PNG)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("markdown")} className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
                <Icon name="description" className="text-[17px] text-indigo-500" />
                <span>Export as Markdown</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("xmind")} className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
                <Icon name="account_tree" className="text-[17px] text-purple-500" />
                <span>Export as XMind</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} className="flex items-center gap-2.5 px-3 py-2 text-label-sm rounded-lg cursor-pointer hover:bg-surface-container transition-colors">
                <Icon name="data_object" className="text-[17px] text-slate-600 dark:text-slate-300" />
                <span>Export as JSON</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-outline-variant/40" />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[11px] font-semibold text-outline px-3 py-1 uppercase tracking-wider">More Formats & Cloud</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("html")} className="flex items-center gap-2 px-3 py-1.5 text-label-xs rounded-lg cursor-pointer hover:bg-surface-container">
                  <Icon name="code" className="text-[15px] text-teal-500" />
                  <span>Export as HTML</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("freemind")} className="flex items-center gap-2 px-3 py-1.5 text-label-xs rounded-lg cursor-pointer hover:bg-surface-container">
                  <Icon name="device_hub" className="text-[15px] text-orange-500" />
                  <span>Export as FreeMind</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("opml")} className="flex items-center gap-2 px-3 py-1.5 text-label-xs rounded-lg cursor-pointer hover:bg-surface-container">
                  <Icon name="list" className="text-[15px] text-amber-500" />
                  <span>Export as OPML</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsMindMeisterModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-label-xs rounded-lg cursor-pointer hover:bg-surface-container text-primary font-medium">
                  <Icon name="cloud_sync" className="text-[15px]" />
                  <span>MindMeister Cloud...</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCoggleModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-label-xs rounded-lg cursor-pointer hover:bg-surface-container text-emerald-600 dark:text-emerald-400 font-medium">
                  <Icon name="share" className="text-[15px]" />
                  <span>Coggle Cloud...</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>`;

if (wsContent.includes(exportDropdownTarget)) {
  wsContent = wsContent.replace(exportDropdownTarget, exportDropdownReplacement);
  console.log('Updated Export Dropdown');
} else {
  console.log('Export dropdown target not found');
}

// 3. Update Minimap container card
const minimapTarget = `              {showMiniMap && (
                <>
                  <MiniMap
                    className="!bg-white/95 dark:!bg-surface-container-lowest !border-outline-variant/30 !bottom-6 !left-6 !right-auto rounded-2xl shadow-md overflow-hidden"
                  />
                  <button
                    onClick={() => setShowMiniMap(false)}
                    className="absolute bottom-[118px] left-[176px] z-10 p-1 text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container/60 rounded-md transition-colors pointer-events-auto"
                    title="Toggle minimap"
                  >
                    <Icon name="open_in_full" className="text-[13px]" />
                  </button>
                </>
              )}`;

const minimapReplacement = `              {showMiniMap && (
                <div className="absolute bottom-6 left-6 z-10 w-[204px] h-[132px] bg-white/95 dark:bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-md overflow-hidden flex flex-col pointer-events-auto">
                  <div className="flex items-center justify-between px-3 pt-2 pb-1">
                    <span className="text-[11px] font-semibold text-on-surface">Minimap</span>
                    <button
                      onClick={() => setShowMiniMap(false)}
                      className="p-0.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 rounded transition-colors"
                      title="Close minimap"
                    >
                      <Icon name="open_in_full" className="text-[13px]" />
                    </button>
                  </div>
                  <div className="flex-1 relative overflow-hidden">
                    <MiniMap
                      className="!relative !inset-0 !m-0 !w-full !h-full !border-0 !bg-transparent"
                      maskColor="rgba(0, 0, 0, 0.08)"
                    />
                  </div>
                </div>
              )}`;

if (wsContent.includes(minimapTarget)) {
  wsContent = wsContent.replace(minimapTarget, minimapReplacement);
  console.log('Updated Minimap container card');
} else {
  console.log('Minimap target not found');
}

// 4. Update Bottom Controls (Presentation Mode pill alongside AI Assistant pill)
const bottomTarget = `          {/* Floating AI restore pill on canvas when right panel collapsed */}
          {flowNodes.length > 0 && isAiPanelCollapsed && (
            <div className="absolute bottom-6 right-6 z-20">
              <button
                onClick={() => {
                  handleToggleAiPanel(true);
                  setRightPanelMode("ai");
                }}
                className="bg-white/95 dark:bg-surface/95 backdrop-blur-md shadow-md hover:shadow-lg text-on-surface px-4 py-2.5 rounded-full flex items-center gap-2 border border-outline-variant/40 transition-all select-none cursor-pointer group"
                title="Open AI Assistant (Ctrl+Shift+A)"
                aria-label="Open AI Assistant"
              >
                <Icon name="auto_awesome" className="text-[16px] text-[#5b50e6] group-hover:rotate-12 transition-transform" />
                <span className="text-label-sm font-semibold">AI Assistant</span>
              </button>
            </div>
          )}`;

const bottomReplacement = `          {/* Floating Canvas Action Pills (Presentation + AI Assistant) */}
          {flowNodes.length > 0 && (
            <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
              <button
                onClick={() => navigate({ to: "/present/$mindMapId", params: { mindMapId: mindMapId || "" } })}
                className="bg-white/95 dark:bg-surface/95 backdrop-blur-md shadow-md hover:shadow-lg text-on-surface px-4 py-2 rounded-full flex items-center gap-2 border border-outline-variant/40 transition-all select-none cursor-pointer group hover:bg-surface-container"
                title="Start Presentation Mode"
                aria-label="Presentation Mode"
              >
                <Icon name="play_arrow" className="text-[17px] text-[#5b50e6] group-hover:scale-110 transition-transform" />
                <span className="text-label-sm font-semibold">Presentation</span>
              </button>
              {isAiPanelCollapsed && (
                <button
                  onClick={() => {
                    handleToggleAiPanel(true);
                    setRightPanelMode("ai");
                  }}
                  className="bg-white/95 dark:bg-surface/95 backdrop-blur-md shadow-md hover:shadow-lg text-on-surface px-4 py-2 rounded-full flex items-center gap-2 border border-outline-variant/40 transition-all select-none cursor-pointer group hover:bg-surface-container"
                  title="Open AI Assistant (Ctrl+Shift+A)"
                  aria-label="Open AI Assistant"
                >
                  <Icon name="auto_awesome" className="text-[16px] text-[#5b50e6] group-hover:rotate-12 transition-transform" />
                  <span className="text-label-sm font-semibold">AI Assistant</span>
                </button>
              )}
            </div>
          )}`;

if (wsContent.includes(bottomTarget)) {
  wsContent = wsContent.replace(bottomTarget, bottomReplacement);
  console.log('Updated Bottom Action Pills');
} else {
  console.log('Bottom action pills target not found');
}

fs.writeFileSync(wsPath, wsContent, 'utf8');
console.log('Done patching workspace');
