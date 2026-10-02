def remove_duplicate(path):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    with open(path, 'w', encoding='utf-8') as f:
        for i, line in enumerate(lines):
            if i == 0:
                f.write(line) # keep the first import
            else:
                if 'import { createFileRoute } from "@tanstack/react-router";' in line:
                    continue
                f.write(line)

remove_duplicate('frontend/src/routes/settings.tsx')
remove_duplicate('frontend/src/routes/account.tsx')
