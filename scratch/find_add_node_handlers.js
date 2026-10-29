const fs = require('fs');
const ws = fs.readFileSync('frontend/src/routes/workspace.$mindMapId.tsx', 'utf8');
const lines = ws.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('const handleAddChildNode') || l.includes('function handleAddChildNode') || l.includes('const handleAddSiblingNode')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
