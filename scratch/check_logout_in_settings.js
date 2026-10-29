const fs = require('fs');
const content = fs.readFileSync('frontend/src/routes/settings.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.toLowerCase().includes('logout')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
