const fs = require('fs');
const content = fs.readFileSync('scratch/run_full_qa.js', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('Presentation') || l.includes('AI Assistant')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
