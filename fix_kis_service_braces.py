import sys

with open('src/services/kisService.ts', 'r') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "return { rt_cd: '0', msg1: '', output: { max_ord_psbl_qty: '0'," in l:
        if "} };" in lines[i+1]:
            lines[i+1] = "  }\n"
        if "  }" in lines[i+2]:
            lines[i+2] = "\n"

with open('src/services/kisService.ts', 'w') as f:
    f.writelines(lines)
