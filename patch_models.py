import sys

with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace('"gemini-1.5-flash"', '"gemini-2.5-flash"')
content = content.replace('"gemini-1.5-pro"', '"gemini-2.5-pro"')

with open('server.ts', 'w') as f:
    f.write(content)
print("Patched models")
