import sys

with open('src/services/kisService.ts', 'r') as f:
    content = f.read()

funcs_to_patch = {
    'public async getOverseasBuyableAmount': 'return { rt_cd: "0", msg1: "", output: { max_ord_psbl_qty: "0" } };',
    'public async getOverseasPrice': 'return null;',
    'public async cancelOverseasOrder': 'return { rt_cd: "0", msg1: "Deleted", output: {} };',
    'public async placeOverseasOrder': 'return { rt_cd: "0", msg1: "Deleted", output: {} };',
    'public async getOverseasHoldings': 'return { rt_cd: "0", msg1: "", output1: [], output2: [] };',
    'public async getOverseasUnexecutedOrders': 'return { rt_cd: "0", msg1: "", output: [] };'
}

for func, ret in funcs_to_patch.items():
    # Find the function definition
    idx = content.find(func)
    if idx != -1:
        # Find the first {
        brace_idx = content.find('{', idx)
        if brace_idx != -1:
            content = content[:brace_idx+1] + '\n    ' + ret + '\n' + content[brace_idx+1:]

with open('src/services/kisService.ts', 'w') as f:
    f.write(content)
