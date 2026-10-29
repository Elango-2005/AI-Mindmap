const fs = require('fs');
const path = require('path');
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== '__pycache__' && f !== '.venv' && f !== 'venv') walk(full);
    } else if (f.startsWith('test_') || f.endsWith('_test.py')) {
      console.log(`Test file: ${full}`);
    }
  }
}
walk('backend');
