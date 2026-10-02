import re
with open('frontend/src/components/AppSidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'const NAV: NavItem\[\] = \[.*?\];', '''const NAV: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", to: "/dashboard" },
  { label: "Projects", icon: "folder_open", to: "/projects" },
  { label: "Templates", icon: "auto_awesome_motion", to: "/templates" },
  { label: "History", icon: "history", to: "/history" },
  { label: "Settings", icon: "settings", to: "/settings" },
];''', content, flags=re.DOTALL)

content = content.replace('navigate({ to: "/workspace", search: { mindMapId: mindMap.id } });', 'navigate({ to: "/workspace/$mindMapId", params: { mindMapId: mindMap.id } });')

# Fix account link
old_account_link = '''to="/settings"
          className="text-on-surface-variant flex items-center gap-md px-md py-sm rounded-xl hover:bg-surface-container-low transition-all duration-200 text-label-md"
        >
          <Icon name="person" />'''
new_account_link = '''to="/account"
          className={cn(
            "text-on-surface-variant flex items-center gap-md px-md py-sm rounded-xl hover:bg-surface-container-low transition-all duration-200 text-label-md",
            active === "Account" && "bg-secondary-fixed text-on-secondary-fixed font-bold shadow-sm translate-x-1"
          )}
        >
          <Icon name="person" filled={active === "Account"} />'''

content = content.replace(old_account_link, new_account_link)

with open('frontend/src/components/AppSidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored AppSidebar changes")
