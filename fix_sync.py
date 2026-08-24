import sys

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, l in enumerate(lines):
    if "// 3. Integrated Asset Status (CTRP6548R)" in l:
        start_idx = i
    if start_idx != -1 and "console.warn(\"Asset Status Sync Skip:\", err);" in l:
        end_idx = i + 2
        break

if start_idx != -1 and end_idx != -1:
    for i in range(start_idx, end_idx):
        lines[i] = ""

with open('src/App.tsx', 'w') as f:
    f.writelines(lines)
