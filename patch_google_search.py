import sys

with open('server.ts', 'r') as f:
    content = f.read()

old_search = 'tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC" as any, dynamicThreshold: 0.3 } } }]'
new_search = 'tools: [{ googleSearch: {} }]'

if old_search in content:
    content = content.replace(old_search, new_search)
    print("Patched google search")
else:
    print("Could not find google search block")

with open('server.ts', 'w') as f:
    f.write(content)
