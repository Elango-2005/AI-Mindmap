const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
console.log('Dependencies:');
console.log(pkg.dependencies);
console.log('\nDevDependencies:');
console.log(pkg.devDependencies);
