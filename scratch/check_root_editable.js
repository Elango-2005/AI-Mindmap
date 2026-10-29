const fs = require('fs');
const content = fs.readFileSync('frontend/src/components/EditableNode.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('root') || l.includes('Root')) {
    if (idx < 100) {
      console.log(`Line ${idx + 1}: ${l.trim()}`);
    }
  }
});
