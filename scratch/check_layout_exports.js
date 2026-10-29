const fs = require('fs');
const content = fs.readFileSync('frontend/src/lib/layoutAlgorithms.ts', 'utf8');
const lines = content.split('\n');
lines.forEach(l => {
  if (l.includes('export function') || l.includes('export const')) {
    console.log(l.trim());
  }
});
