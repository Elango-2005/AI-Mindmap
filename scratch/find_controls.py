with open(r'frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
keywords = ["zoomLevel", "fitView", "activeTool", "Auto Layout", "MiniMap"]
for kw in keywords:
    for m in re.finditer(re.escape(kw), text):
        idx = m.start()
        print(f"[{kw}] line ~ {text[:idx].count(chr(10))+1}: {text[max(0, idx-30):min(len(text), idx+100)].strip()}")
        break
