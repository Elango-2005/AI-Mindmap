const fs = require('fs');
console.log('package-lock.json exists:', fs.existsSync('package-lock.json') || fs.existsSync('frontend/package-lock.json'));
console.log('pnpm-lock.yaml exists:', fs.existsSync('pnpm-lock.yaml') || fs.existsSync('frontend/pnpm-lock.yaml'));
