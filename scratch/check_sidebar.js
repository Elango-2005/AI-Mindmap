const fs = require('fs');
const content = fs.readFileSync('frontend/src/components/AppSidebar.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('logout') || l.includes('settings') || l.includes('Sign') || l.includes('Profile') || l.includes('avatar') || l.includes('Dropdown')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
