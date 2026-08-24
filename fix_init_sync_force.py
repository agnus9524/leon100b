import sys

with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "const executeFullKisInitialSync = useCallback(async (autoEnterAfterSync = true) => {" in l:
        lines.insert(i+1, "    setIsAppInitialized(true); return;\n")
        break

with open('src/App.tsx', 'w') as f:
    f.writelines(lines)
