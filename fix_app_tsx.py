import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace getOverseasBalance block entirely
content = re.sub(
    r"const overseasBalanceData = await kisService\.getOverseasBalance\(\);.*?if \(overseasBalanceData\?\.rt_cd === '0' && \(overseasBalanceData\.output2 \|\| overseasBalanceData\.output3\)\) \{.*?\}",
    r"const overseasBalanceData = { rt_cd: '1', msg1: '', output1: [], output2: [], output3: {} };",
    content,
    flags=re.DOTALL
)

# Replace getOverseasBuyableAmount call in App.tsx to just set Usd to 0 and not complain
content = re.sub(
    r"const res = await kisService\.getOverseasBuyableAmount\([\s\S]*?if \(res && res\.rt_cd === '0' && res\.output\) \{[\s\S]*?setKisBuyableQty\(qty\);\n        \}",
    r"// Disabled getOverseasBuyableAmount",
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
