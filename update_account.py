path = "frontend/src/routes/account.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('createFileRoute("/settings")', 'createFileRoute("/account")')
content = content.replace('activeRoute="Settings"', 'activeRoute="Account"')
content = content.replace('useState("Profile")', 'useState("Account")')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated account")
