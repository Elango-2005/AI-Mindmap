with open(r'frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('const visibleNodes =')
if idx != -1:
    print(text[idx:idx+800])
else:
    idx2 = text.find('visibleNodes')
    print("Found visibleNodes at:", idx2)
    print(text[idx2-50:idx2+400])
