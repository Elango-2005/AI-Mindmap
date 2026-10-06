import re

with open('frontend/src/routes/settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add AppLayout import if not present
if 'AppLayout' not in content:
    content = content.replace('import { createFileRoute } from "@tanstack/react-router";', 'import { createFileRoute } from "@tanstack/react-router";\nimport { Link } from "@tanstack/react-router";\nimport { AppLayout } from "@/components/AppLayout";')

# Fix the broken Link
content = content.replace('to="/workspace"', 'to="/dashboard"')

# Wrap in AppLayout
content = content.replace('return (\n    <div className="flex h-screen overflow-hidden">', 'return (\n    <AppLayout activeRoute="Settings">\n      <div className="flex h-full w-full overflow-hidden">')

# Close AppLayout
content = content.replace('      </div>\n    </div>\n  );\n}', '      </div>\n    </div>\n    </AppLayout>\n  );\n}')

with open('frontend/src/routes/settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
