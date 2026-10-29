const fs = require('fs');
const ws = fs.readFileSync('frontend/src/routes/workspace.$mindMapId.tsx', 'utf8');
const lines = ws.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('onNodesChange') || l.includes('onNodeDrag')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
