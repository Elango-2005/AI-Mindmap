with open(r'frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(15200, min(len(lines), 15400)):
    if lines[i].strip():
        print(f"{i+1}: {lines[i].strip()}")
