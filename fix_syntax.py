import os, re

files = [
    "frontend/src/routes/dashboard.tsx",
    "frontend/src/routes/projects.tsx",
    "frontend/src/routes/templates.tsx",
    "frontend/src/routes/history.tsx",
    "frontend/src/routes/settings.tsx",
    "frontend/src/routes/account.tsx"
]

for path in files:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Remove duplicate import
    content = content.replace('import { Link } from "@tanstack/react-router";', '')

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("Removed duplicate Link imports")

def fix_layout_closure(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # In history.tsx, settings.tsx, account.tsx, my regex added:
    # f'<AppLayout activeRoute="{active}">\n      <div className="flex-1 h-full overflow-hidden flex flex-col">'
    # But it replaced the opening of <main> !
    # And at the end, I replaced `</main>\s*</div>\s*\);` with `</div>\n    </AppLayout>\n  );`
    # But wait, settings.tsx has:
    # <div className="flex h-screen overflow-hidden">
    #   <AppSidebar .../>
    #   <div className="...">
    #     <header>...</header>
    #     <main ...>
    #       ...
    #     </main>
    #   </div>
    # </div>
    
    # If I just replace everything with:
    # return <AppLayout activeRoute="..."> ... </AppLayout>;
    
    # Let's fix history.tsx
    if "history" in path:
        # Revert and manually apply
        pass

# I'll just write a script to completely fix history.tsx, settings.tsx, and account.tsx
