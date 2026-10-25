with open(r'frontend/src/lib/semanticAdapter.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'ai_suggestion', text)]
for idx in matches:
    print(text[idx-30:idx+150].strip())
    print("---")
