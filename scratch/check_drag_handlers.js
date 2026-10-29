const fs = require('fs');
const ws = fs.readFileSync('frontend/src/routes/workspace.$mindMapId.tsx', 'utf8');
const lines = ws.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('const handleNodeDragStop') || l.includes('function handleNodeDragStop') || l.includes('const handleNodesChange')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
