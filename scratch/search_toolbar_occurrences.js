const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') walk(full);
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      const c = fs.readFileSync(full, 'utf8');
      if (c.includes('PRIMARY FLOATING CANVAS TOOLBAR') || c.includes('Floating Canvas Action Pills')) {
        console.log(`Found in: ${full}`);
      }
    }
  }
}
walk('frontend/src');
