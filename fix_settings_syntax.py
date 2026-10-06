import re

def fix_file(path, route_name):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add imports
    content = content.replace('import { createFileRoute } from "@tanstack/react-router";', f'import {{ createFileRoute, Link }} from "@tanstack/react-router";\nimport {{ AppLayout }} from "@/components/AppLayout";')

    # Replace the broken Link
    content = content.replace('to="/workspace"', 'to="/dashboard"')

    # The main return block is inside function Settings()
    # Find the 'return (\n    <div className="flex h-screen overflow-hidden">'
    content = content.replace('return (\n    <div className="flex h-screen overflow-hidden">', f'return (\n    <AppLayout activeRoute="{route_name}">\n      <div className="flex h-full w-full overflow-hidden">')

    # Replace the very last '      </div>\n    </div>\n  );\n}'
    old_end = '        </div>\n      </main>\n    </div>\n  );\n}'
    new_end = '        </div>\n      </main>\n    </div>\n    </AppLayout>\n  );\n}'
    
    last_idx = content.rfind(old_end)
    if last_idx != -1:
        content = content[:last_idx] + new_end + content[last_idx + len(old_end):]
    else:
        print(f"Could not find end block in {path}")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('frontend/src/routes/settings.tsx', 'Settings')
fix_file('frontend/src/routes/account.tsx', 'Account')
