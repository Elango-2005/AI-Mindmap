with open(r'frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'<Panel position=', text)]
for idx in matches:
    print(f"Line {text[:idx].count(chr(10))+1}: {text[idx:idx+250]}")
    print("---")
