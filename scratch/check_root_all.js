const fs = require('fs');
const content = fs.readFileSync('frontend/src/components/EditableNode.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.toLowerCase().includes('root')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
