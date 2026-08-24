import sys

with open('src/services/kisService.ts', 'r') as f:
    lines = f.readlines()

depth = 0
for i, l in enumerate(lines):
    for c in l:
        if c == '{': depth += 1
        elif c == '}': depth -= 1
    if depth < 0:
        print(f"Negative depth at line {i+1}: {l.strip()}")
        depth = 0 # reset to continue
