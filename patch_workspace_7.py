import re
with open('frontend/src/routes/workspace.$mindMapId.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(
    'const [aiPanelState, setAiPanelState] = useState<"collapsed" | "expanded" | "full">("expanded");',
    'const [aiPanelState, setAiPanelState] = useState<"collapsed" | "expanded" | "full">("collapsed");'
)

with open('frontend/src/routes/workspace.$mindMapId.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
