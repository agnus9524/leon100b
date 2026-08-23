import sys

with open('server.ts', 'r') as f:
    content = f.read()

old_tool = 'tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC", dynamicThreshold: 0.3 } } }]'
new_tool = 'tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC" as any, dynamicThreshold: 0.3 } } }]'

if old_tool in content:
    content = content.replace(old_tool, new_tool)
    with open('server.ts', 'w') as f:
        f.write(content)
    print("Fixed tool config with 'as any'")
else:
    print("Could not find tool config")

