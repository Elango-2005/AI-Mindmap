const fs = require('fs');
const content = fs.readFileSync('frontend/src/routes/workspace.$mindMapId.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('DropdownMenu') && idx < 500) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
