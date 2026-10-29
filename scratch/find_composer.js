const fs = require('fs');
const content = fs.readFileSync('frontend/src/components/AiAssistantPanel.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('attach_file') || l.includes('input') || l.includes('composer') || l.includes('arrow_upward')) {
    if (idx > 400) {
      console.log(`Line ${idx + 1}: ${l.trim()}`);
    }
  }
});
