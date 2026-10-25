with open(r'frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(16950, min(len(lines), 17050)):
    if lines[i].strip():
        print(f"{i+1}: {lines[i].strip()}")
