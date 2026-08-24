import sys
import re

with open('src/services/kisService.ts', 'r') as f:
    content = f.read()

# Replace getOverseasBalance body
content = re.sub(
    r"public async getOverseasBalance\(\) \{.*?\n  \}",
    r"public async getOverseasBalance() {\n    return { rt_cd: '0', msg1: '', output1: [], output2: [], output3: {} };\n  }",
    content,
    flags=re.DOTALL
)

# Replace getOverseasOrderableCash body
content = re.sub(
    r"public async getOverseasOrderableCash\(\) \{.*?\n  \}",
    r"public async getOverseasOrderableCash() {\n    return { orderableUsd: 0, usdDeposit: 0, rt_cd: '0', msg1: '' };\n  }",
    content,
    flags=re.DOTALL
)

with open('src/services/kisService.ts', 'w') as f:
    f.write(content)
