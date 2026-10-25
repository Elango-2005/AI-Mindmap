with open(r'frontend/src/lib/semanticAdapter.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'selectionRing', text)]
for idx in matches:
    print(text[idx-50:idx+200].strip())
    print("---")
