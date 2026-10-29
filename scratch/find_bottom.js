const fs = require('fs');
const content = fs.readFileSync('frontend/src/routes/workspace.$mindMapId.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('AI Assistant') || l.includes('Presentation') || l.includes('isMinimapOpen') || l.includes('MiniMap')) {
    if (idx > 13000) {
      console.log(`Line ${idx + 1}: ${l.trim()}`);
    }
  }
});
