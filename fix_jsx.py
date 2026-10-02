import re

def fix_file(path, active_route):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find where return ( starts
    return_idx = content.find("return (")
    if return_idx == -1: return
    
    pre_return = content[:return_idx]
    
    # We want to keep everything inside <main> and put it inside <AppLayout>
    # First, let's just find the <header> inside the component
    header_match = re.search(r'(<header.*?</header>)', content, re.DOTALL)
    header = header_match.group(1) if header_match else ""
    
    # Find the content after header, which is usually <div className="flex-1...
    # Actually, we can just extract everything between <header> and the end of the main content
    # Let's just do a string replacement for the layout boilerplate.
    
    # In history.tsx:
    if "history" in path:
        # replace the whole return statement
        new_return = f'''return (
    <AppLayout activeRoute="{active_route}">
      <div className="flex-1 flex flex-col overflow-hidden">
        {header}
        <div className="flex-1 overflow-y-auto px-4 sm:px-xl py-4 sm:py-lg">
'''
        # we need to extract the inner content
        inner_content_match = re.search(r'<div className="flex-1 overflow-y-auto px-4 sm:px-xl py-4 sm:py-lg">(.*)</div>\s*</div>\s*</AppLayout>', content, re.DOTALL)
        if not inner_content_match:
            inner_content_match = re.search(r'<div className="flex-1 overflow-y-auto px-4 sm:px-xl py-4 sm:py-lg">(.*)</div>\s*</main>', content, re.DOTALL)
            
        inner = inner_content_match.group(1) if inner_content_match else ""
        
        full_new = pre_return + new_return + inner + "\n        </div>\n      </div>\n    </AppLayout>\n  );\n}\n\nexport const Route = createFileRoute(\"/history\")({\n  component: HistoryComponent,\n});\n"
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(full_new)

    elif "settings" in path or "account" in path:
        new_return = f'''return (
    <AppLayout activeRoute="{active_route}">
      <div className="flex-grow overflow-y-auto bg-background p-lg md:p-xxl">
        {header}
'''
        inner_content_match = re.search(r'<main className="flex-grow overflow-y-auto bg-background p-lg md:p-xxl">\s*<header.*?</header>\s*(.*?)</main>', content, re.DOTALL)
        if not inner_content_match:
            # Maybe it already has AppLayout at the end
            inner_content_match = re.search(r'<main className="flex-grow overflow-y-auto bg-background p-lg md:p-xxl">\s*<header.*?</header>\s*(.*?)</div>\s*</AppLayout>', content, re.DOTALL)
            
        inner = inner_content_match.group(1) if inner_content_match else ""
        
        suffix = "\n      </div>\n    </AppLayout>\n  );\n}\n"
        
        full_new = pre_return + new_return + inner + suffix
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(full_new)

fix_file("frontend/src/routes/history.tsx", "History")
fix_file("frontend/src/routes/settings.tsx", "Settings")
fix_file("frontend/src/routes/account.tsx", "Account")

print("Fixed JSX structures")
