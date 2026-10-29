const fs = require('fs');

// 1. Inspect workspace header around avatar
const ws = fs.readFileSync('frontend/src/routes/workspace.$mindMapId.tsx', 'utf8');
const lines = ws.split('\n');
lines.forEach((l, idx) => {
  if (idx < 13300 && idx > 13100) {
    if (l.includes('avatar') || l.includes('NotificationBell') || l.includes('user') || l.includes('bg-purple') || l.includes('rounded-full')) {
      console.log(`Line ${idx + 1}: ${l.trim()}`);
    }
  }
});
