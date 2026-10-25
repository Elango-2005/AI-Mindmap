with open(r'frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(16050, min(len(lines), 16350)):
    if lines[i].strip():
        print(f"{i+1}: {lines[i].strip()}")
