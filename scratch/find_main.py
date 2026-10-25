with open(r'frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines, 1):
    if '<main' in line or '<ReactFlow' in line or 'dot-matrix' in line:
        print(f"Line {idx}: {line.strip()[:80]}")
