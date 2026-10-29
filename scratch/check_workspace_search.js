const fs = require('fs');
const content = fs.readFileSync('frontend/src/routes/workspace.$mindMapId.tsx', 'utf8');

const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('present/$mindMapId') || l.includes('Presentation') || (l.includes('auto_awesome') && idx > 14400 && idx < 14700)) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
