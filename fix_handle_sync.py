import sys

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    # Remove the overseasSuccess check and loop
    if "if (overseasSuccess) {" in l:
        for j in range(i, i+13):
            lines[j] = ""
        break

with open('src/App.tsx', 'w') as f:
    f.writelines(lines)
