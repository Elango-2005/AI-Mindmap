import os

paths = ["frontend/src/routes/history.tsx", "frontend/src/routes/settings.tsx"]

for path in paths:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replace AppSidebar import with AppLayout
    content = content.replace('import { AppSidebar } from "@/components/AppSidebar";', 'import { AppLayout } from "@/components/AppLayout";\nimport { Link } from "@tanstack/react-router";')
    
    # Check what activeRoute to pass
    active = "History" if "history" in path else "Settings"

    import re
    # The return statement currently looks like:
    # return (
    #   <div className="flex h-screen w-full bg-background overflow-hidden relative">
    #     <AppSidebar active="..." />
    #     ... header stuff
    #     <main ...>
    #       ...
    #     </main>
    #   </div>
    # )
    
    # For history:
    content = re.sub(
        r'<div className="flex h-screen w-full bg-background overflow-hidden relative">\s*(?:<AppSidebar[^>]+>)?\s*(<div className="md:hidden[^>]+>.*?</div>)?\s*(<Sheet[^>]+>.*?</Sheet>)?\s*<main className="flex-1 h-full overflow-hidden flex flex-col pt-16 md:pt-0">',
        f'<AppLayout activeRoute="{active}">\n      <div className="flex-1 h-full overflow-hidden flex flex-col">',
        content,
        flags=re.DOTALL
    )
    
    content = re.sub(r'</main>\s*</div>\s*\);', '</div>\n    </AppLayout>\n  );', content)
    
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print("Updated history and settings")
