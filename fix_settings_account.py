import os, re

def fix_settings_account(path, route_path, active):
    # If account, copy from settings first
    if "account" in path:
        os.system(f"cp frontend/src/routes/settings.tsx {path}")
        
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if "account" in path:
        content = content.replace('createFileRoute("/settings")', 'createFileRoute("/account")')

    content = content.replace('import { AppSidebar } from "@/components/AppSidebar";', 'import { AppLayout } from "@/components/AppLayout";\nimport { Link } from "@tanstack/react-router";')
    # we know there might be a duplicate Link
    content = content.replace('import { createFileRoute, Link } from "@tanstack/react-router";', 'import { createFileRoute } from "@tanstack/react-router";')
    
    # replace the return statement manually using regex
    new_return = f'''return (
    <AppLayout activeRoute="{active}">
      <div className="flex-grow overflow-y-auto bg-background p-lg md:p-xxl">
'''
    # We find what's inside <main>...</main>
    inner_match = re.search(r'<main[^>]*>\s*<header.*?</header>\s*(.*?)</main>', content, re.DOTALL)
    
    if inner_match:
        # Also need the header
        header_match = re.search(r'(<header.*?</header>)', content, re.DOTALL)
        header = header_match.group(1) if header_match else ""
        inner = inner_match.group(1)
        
        full_new = new_return + "        " + header + "\n" + inner + "\n      </div>\n    </AppLayout>\n  );\n}"
        
        # replace the whole return statement
        content = re.sub(r'return \(\s*<div.*?</div>\s*\);\s*\}', full_new, content, flags=re.DOTALL)
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

fix_settings_account("frontend/src/routes/settings.tsx", "/settings", "Settings")
fix_settings_account("frontend/src/routes/account.tsx", "/account", "Account")

print("Fixed settings and account")
