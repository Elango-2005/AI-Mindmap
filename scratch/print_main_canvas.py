with open(r'frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(3850, 4050):
    print(f"{i+1}: {repr(lines[i])}")
