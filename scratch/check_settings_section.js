const fs = require('fs');
const content = fs.readFileSync('frontend/src/routes/settings.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (idx < 120 && (l.includes('section') || l.includes('useSearch') || l.includes('validateSearch') || l.includes('search'))) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
