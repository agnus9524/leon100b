import sys

with open('server.ts', 'r') as f:
    content = f.read()

old_search = 'tools: [{ googleSearch: {} }]'
new_search = 'tools: [{ googleSearch: {} } as any]'

if old_search in content:
    content = content.replace(old_search, new_search)
    print("Patched ts-ignore")
else:
    print("Could not find googleSearch")

with open('server.ts', 'w') as f:
    f.write(content)
