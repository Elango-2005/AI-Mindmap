import os

path = "frontend/src/routes/workspace.$mindMapId.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

import re

# Remove mindMapId from validateSearch
content = re.sub(r'mindMapId:\s*typeof search\.mindMapId === "string"\s*\?\s*search\.mindMapId\s*:\s*undefined,', '', content)

# Replace useSearch destructuring
content = re.sub(
    r'const \{ mindMapId, topic: initialTopic \} = useSearch\(\{[^}]+\}\);',
    'const { mindMapId } = Route.useParams();\n  const { topic: initialTopic } = Route.useSearch() as any;',
    content
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated workspace")

path2 = "frontend/src/routes/present.$mindMapId.tsx"
with open(path2, "r", encoding="utf-8") as f:
    content2 = f.read()

content2 = re.sub(r'mindMapId:\s*typeof search\.mindMapId === "string"\s*\?\s*search\.mindMapId\s*:\s*undefined,', '', content2)

content2 = re.sub(
    r'const \{ mindMapId \} = useSearch\(\{[^}]+\}\);',
    'const { mindMapId } = Route.useParams();',
    content2
)

with open(path2, "w", encoding="utf-8") as f:
    f.write(content2)

print("Updated present")
