const fs = require('fs');

const filePath = 'frontend/src/routes/workspace.$mindMapId.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace AI button in top floating toolbar with Presentation
const topToolbarAiTarget = `              {/* AI Assistant Quick Toggle */}
              <button
                onClick={() => {
                  handleToggleAiPanel(true);
                  setRightPanelMode("ai");
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-label-sm font-semibold bg-[#eeedfd] text-[#5b50e6] hover:bg-[#e2e0fb] dark:bg-purple-950/60 dark:text-purple-300 transition-colors cursor-pointer"
                title="Open AI Assistant"
              >
                <Icon name="auto_awesome" className="text-[16px]" />
                <span>AI</span>
              </button>`;

const topToolbarPresentationReplacement = `              {/* Presentation Mode Trigger */}
              <button
                onClick={() => navigate({ to: "/present/$mindMapId", params: { mindMapId: mindMapId || "" } })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-sm font-medium text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                title="Open presentation mode"
                aria-label="Open presentation mode"
              >
                <Icon name="play_arrow" className="text-[18px] text-[#5b50e6]" />
                <span>Presentation</span>
              </button>`;

if (content.includes(topToolbarAiTarget)) {
  content = content.replace(topToolbarAiTarget, topToolbarPresentationReplacement);
  console.log('✓ Successfully replaced top toolbar AI button with Presentation');
} else {
  console.error('✗ Could not find top toolbar AI button target');
  process.exit(1);
}

// 2. Remove bottom-right Presentation button and keep bottom-right AI Assistant
const bottomRightTarget = `          {/* Floating Canvas Action Pills (Presentation + AI Assistant) */}
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

const bottomRightReplacement = `          {/* Floating Canvas Action Pill (AI Assistant) */}
          {flowNodes.length > 0 && isAiPanelCollapsed && (
            <div className="absolute bottom-6 right-6 z-20">
              <button
                onClick={() => {
                  handleToggleAiPanel(true);
                  setRightPanelMode("ai");
                }}
                className="bg-white/95 dark:bg-surface/95 backdrop-blur-md shadow-md hover:shadow-lg text-on-surface px-4 py-2.5 rounded-full flex items-center gap-2 border border-outline-variant/40 transition-all select-none cursor-pointer group hover:bg-surface-container"
                title="Open AI Assistant (Ctrl+Shift+A)"
                aria-label="Open AI Assistant"
              >
                <Icon name="auto_awesome" className="text-[18px] text-[#5b50e6] group-hover:rotate-12 transition-transform" />
                <span className="text-label-sm font-semibold">AI Assistant</span>
              </button>
            </div>
          )}`;

if (content.includes(bottomRightTarget)) {
  content = content.replace(bottomRightTarget, bottomRightReplacement);
  console.log('✓ Successfully consolidated bottom-right controls to AI Assistant only');
} else {
  console.error('✗ Could not find bottom-right controls target');
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Successfully wrote changes to frontend/src/routes/workspace.$mindMapId.tsx');
