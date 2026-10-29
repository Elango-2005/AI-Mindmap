const fs = require('fs');

// 1. Update AiAssistantPanel.tsx
const aiPath = 'frontend/src/components/AiAssistantPanel.tsx';
let aiContent = fs.readFileSync(aiPath, 'utf8');

const targetAi = `            <button
              type="button"
              onClick={onOpenKnowledgeBase}
              className={\`p-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer \${
                projectDocuments.length > 0
                  ? "text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-400"
                  : "text-gray-400 hover:text-gray-700 dark:text-on-surface-variant hover:bg-surface-container"
              }\`}
              title={
                projectDocuments.length > 0
                  ? \`Knowledge Base (\${projectDocuments.length} document\${projectDocuments.length > 1 ? "s" : ""})\`
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
              onClick={() => onSendChat()}
              disabled={!chatInput.trim() || isChatting}`;

const replacementAi = `            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenKnowledgeBase}
                className={\`p-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer \${
                  projectDocuments.length > 0
                    ? "text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 dark:text-emerald-400"
                    : "text-gray-400 hover:text-gray-700 dark:text-on-surface-variant hover:bg-surface-container"
                }\`}
                title={
                  projectDocuments.length > 0
                    ? \`Knowledge Base (\${projectDocuments.length} document\${projectDocuments.length > 1 ? "s" : ""})\`
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
              disabled={!chatInput.trim() || isChatting}`;

if (aiContent.includes(targetAi)) {
  aiContent = aiContent.replace(targetAi, replacementAi);
  fs.writeFileSync(aiPath, aiContent, 'utf8');
  console.log('Successfully updated AiAssistantPanel.tsx with web research icon');
} else {
  console.log('AiAssistantPanel target not found');
}
