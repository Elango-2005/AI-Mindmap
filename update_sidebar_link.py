import os
path = "frontend/src/components/AppSidebar.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('navigate({ to: "/workspace", search: { mindMapId: mindMap.id } });', 'navigate({ to: "/workspace/$mindMapId", params: { mindMapId: mindMap.id } });')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated AppSidebar handleCreate link")
