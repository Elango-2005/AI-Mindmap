def add_route(path, route):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # ensure we don't have duplicate imports of createFileRoute
    content = content.replace('import { createFileRoute } from "@tanstack/react-router";', '')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(f'import {{ createFileRoute }} from "@tanstack/react-router";\nexport const Route = createFileRoute("{route}")({{ component: Settings }});\n{content}')

add_route('frontend/src/routes/settings.tsx', '/settings')
add_route('frontend/src/routes/account.tsx', '/account')
print("Added Routes correctly")
