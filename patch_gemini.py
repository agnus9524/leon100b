import sys

with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace('"gemini-2.5-flash"', 'process.env.GEMINI_MODEL || "gemini-3.6-flash"')
content = content.replace('"gemini-2.5-pro"', 'process.env.GEMINI_MODEL || "gemini-3.6-flash"')

with open('server.ts', 'w') as f:
    f.write(content)
print("Patched gemini models")
