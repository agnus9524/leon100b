import sys

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "if (marketType === 'US') {" in l:
        for j in range(i, i+13):
            if "}" in lines[j] and j != i:
                lines[j] = ""
                break
            lines[j] = ""
        break

with open('src/App.tsx', 'w') as f:
    f.writelines(lines)
