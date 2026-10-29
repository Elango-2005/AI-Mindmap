const fs = require('fs');

// 1. Fix AiAssistantPanel.tsx
const aiPath = 'frontend/src/components/AiAssistantPanel.tsx';
let aiContent = fs.readFileSync(aiPath, 'utf8');
if (!aiContent.includes('import { toast }')) {
  aiContent = `import { toast } from "sonner";\n` + aiContent;
  fs.writeFileSync(aiPath, aiContent, 'utf8');
  console.log('Fixed AiAssistantPanel: added toast import');
}

// 2. Fix Inspector.tsx
const inspPath = 'frontend/src/components/Inspector.tsx';
let inspContent = fs.readFileSync(inspPath, 'utf8');
const oldImport = `import type { LayoutDirection, ThemeMode } from "@/lib/themePalettes";`;
const newImport = `import type { LayoutDirection } from "@/lib/layoutAlgorithms";\nexport type ThemeMode = "modern" | "minimal" | "colorful" | string;`;
if (inspContent.includes(oldImport)) {
  inspContent = inspContent.replace(oldImport, newImport);
  fs.writeFileSync(inspPath, inspContent, 'utf8');
  console.log('Fixed Inspector: replaced themePalettes import with layoutAlgorithms');
}

// 3. Fix workspace.$mindMapId.tsx
const wsPath = 'frontend/src/routes/workspace.$mindMapId.tsx';
let wsContent = fs.readFileSync(wsPath, 'utf8');
// Check useNavigate import
const oldTanstackImport = `import { createFileRoute, Link } from "@tanstack/react-router";`;
const newTanstackImport = `import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";`;
if (wsContent.includes(oldTanstackImport)) {
  wsContent = wsContent.replace(oldTanstackImport, newTanstackImport);
  console.log('Fixed workspace: added useNavigate import');
}

// Check const navigate = useNavigate() inside Workspace
if (!wsContent.includes('const navigate = useNavigate()')) {
  const compStart = 'function Workspace() {';
  if (wsContent.includes(compStart)) {
    wsContent = wsContent.replace(compStart, `function Workspace() {\n  const navigate = useNavigate();`);
    console.log('Fixed workspace: added const navigate = useNavigate()');
  }
}

fs.writeFileSync(wsPath, wsContent, 'utf8');
console.log('Finished updating 3 files');
