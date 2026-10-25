with open(r'frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('<ReactFlow')
if idx != -1:
    end_idx = text.find('</ReactFlow>', idx)
    print(f"ReactFlow spans from char {idx} to {end_idx}")
    rf_inner = text[idx:end_idx+12]
    # Print children inside ReactFlow
    for line in rf_inner.split('\n'):
        if any(c in line for c in ['<', 'Panel', 'Control', 'MiniMap', 'Background', 'toolbar', 'zoom']):
            print(line.strip())
