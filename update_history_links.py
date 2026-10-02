import os
path = "frontend/src/routes/history.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('/workspace?mindMapId=${mindMapId}', '/workspace/${mindMapId}')
content = content.replace('to="/workspace"\n                            search={{ mindMapId: entry.mindMap.id }}', 'to="/workspace/$mindMapId"\n                            params={{ mindMapId: entry.mindMap.id }}')
content = content.replace('to="/workspace"\n                                search={{ mindMapId: entry.mindMap.id }}', 'to="/workspace/$mindMapId"\n                                params={{ mindMapId: entry.mindMap.id }}')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated history route links")
