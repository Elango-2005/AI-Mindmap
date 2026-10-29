const fs = require('fs');

function checkFile(path) {
  if (fs.existsSync(path)) {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('radial') || l.includes('horizontal') || l.includes('vertical') || l.includes('free') || l.includes('Layout')) {
        console.log(`${path}:${idx + 1}: ${l.trim()}`);
      }
    });
  }
}

checkFile('frontend/src/components/LeftToolPanel.tsx');
checkFile('frontend/src/components/Inspector.tsx');
