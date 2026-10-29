const fs = require('fs');
const files = fs.readdirSync('frontend/src/routes');
console.log('Routes in frontend/src/routes:');
files.forEach(f => console.log(' - ' + f));
