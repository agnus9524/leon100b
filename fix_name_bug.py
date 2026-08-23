import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

old1 = "name: liveName } : s);"
new1 = "name: pData.name || s.name || sym } : s);"

if old1 in content:
    content = content.replace(old1, new1)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Fixed name bug")
else:
    print("Could not find replacement target")
