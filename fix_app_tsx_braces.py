import sys

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

start = -1
end = -1
for i, l in enumerate(lines):
    if "// Overseas Stock Sync (TTTS3012R)" in l:
        start = i
    if start != -1 and 'console.warn("Overseas Sync Skip:", err);' in l:
        end = i + 2
        break

if start != -1 and end != -1:
    for i in range(start, end):
        lines[i] = ""

with open('src/App.tsx', 'w') as f:
    f.writelines(lines)
