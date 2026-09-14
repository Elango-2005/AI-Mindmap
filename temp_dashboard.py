import re

with open("frontend/src/routes/dashboard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# I want to completely rewrite dashboard.tsx. It's safer to just provide the full file string.
