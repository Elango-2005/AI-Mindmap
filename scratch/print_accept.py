with open(r'frontend/src/components/EditableNode.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('handleAcceptSuggestion')
if idx != -1:
    print(text[idx-200:idx+600])
