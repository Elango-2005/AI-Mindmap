const fs = require('fs');

// Check template loading in frontend/src/routes/workspace.$mindMapId.tsx
const ws = fs.readFileSync('frontend/src/routes/workspace.$mindMapId.tsx', 'utf8');
const lines = ws.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('template') || l.includes('applyLayout') || l.includes('loadGraph')) {
    if (idx < 10600 && idx > 10400) {
      console.log(`Line ${idx + 1}: ${l.trim()}`);
    }
  }
});
