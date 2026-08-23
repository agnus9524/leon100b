import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Remove holdingsViewTab definition and make it always KR
content = re.sub(
    r"const \[holdingsViewTab, setHoldingsViewTab\] = useState<'KR' \| 'US'>\(\(\) => \{.*?\}(\(\))?\);",
    r"const holdingsViewTab = 'KR';",
    content,
    flags=re.DOTALL
)

# 2. Remove pnlCountryTab definition and make it always KR
content = re.sub(
    r"const \[pnlCountryTab, setPnlCountryTab\] = useState<'KR' \| 'US' \| 'OTHER'>\('KR'\);",
    r"const pnlCountryTab = 'KR';",
    content
)

# 3. Replace the holdingsViewTab tabs in UI
holdings_tabs_pattern = r"""\s*<div className="flex bg-\[\#2a2d35\] rounded-xl p-1 shadow-inner ring-1 ring-white/5 mb-3">\s*<button\s*onClick=\{.*?setHoldingsViewTab\('KR'\).*?</button>\s*<button\s*onClick=\{.*?setHoldingsViewTab\('US'\).*?</button>\s*</div>"""
content = re.sub(holdings_tabs_pattern, "", content, flags=re.DOTALL)

# 4. Replace the pnlCountryTab tabs in UI (Country Tabs (한국 | 미국 | 기타))
pnl_tabs_pattern = r"""\{\/\* Country Tabs \(한국 \| 미국 \| 기타\) \*\/\}.*?<div className="flex items-center gap-1.5">.*?</div>"""
content = re.sub(pnl_tabs_pattern, "", content, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Patched country tabs")
