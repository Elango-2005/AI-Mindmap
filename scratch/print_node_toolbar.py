with open(r'frontend/src/components/EditableNode.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(1320, 1400):
    if lines[i].strip():
        print(f"{i+1}: {lines[i].strip()}")
