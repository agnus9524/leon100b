import sys

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

with open('src/App.tsx', 'w') as f:
    for l in lines:
        if "setIsAppInitialized(true); return;" not in l:
            f.write(l)
