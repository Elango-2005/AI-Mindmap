const fs = require('fs');

// Check package.json of frontend
const pkg = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
console.log('Scripts:', pkg.scripts);
console.log('DevDeps:', Object.keys(pkg.devDependencies || {}));
