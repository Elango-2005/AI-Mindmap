import os

path = "frontend/src/routes/workspace.$mindMapId.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace('to="/present" search={{ mindMapId }}', 'to="/present/$mindMapId" params={{ mindMapId }}')
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

path = "frontend/src/routes/present.$mindMapId.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
content = content.replace('to="/workspace"\n          search={{ mindMapId, topic: undefined }}', 'to="/workspace/$mindMapId"\n          params={{ mindMapId }}')
content = content.replace('navigate({ to: "/workspace", search: { mindMapId } as any });', 'navigate({ to: "/workspace/$mindMapId", params: { mindMapId } as any });')
with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated workspace and present links")
