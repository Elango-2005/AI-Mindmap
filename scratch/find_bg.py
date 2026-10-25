with open(r'frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'<Background', text)]
for idx in matches:
    print(text[idx:idx+300])
    print('---')
