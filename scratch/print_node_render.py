with open(r'frontend/src/components/EditableNode.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(1450, 1550):
    if lines[i].strip():
        print(f"{i+1}: {lines[i].strip()}")
