with open(r'frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer(r'collapsed', text, re.IGNORECASE)]
print(f"Total occurrences of 'collapse' in workspace: {len(matches)}")
for idx in matches[:10]:
    line = text[max(0, idx-40):min(len(text), idx+60)].replace('\n', ' ')
    print(line)
