import sys

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "if (overseasSuccess) {" in l:
        for j in range(i, i+10):
            lines[j] = ""
        break

with open('src/App.tsx', 'w') as f:
    f.writelines(lines)
