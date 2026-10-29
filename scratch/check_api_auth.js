const fs = require('fs');
if (fs.existsSync('frontend/src/api/auth.ts')) {
  console.log(fs.readFileSync('frontend/src/api/auth.ts', 'utf8'));
}
