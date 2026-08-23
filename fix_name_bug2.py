import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace all name: liveName } : s) with name: pData.name || s.name || sym } : s)
content = content.replace("name: liveName } : s)", "name: pData.name || s.name || sym } : s)")

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Fixed more name bugs")
