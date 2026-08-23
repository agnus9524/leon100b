import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Hardcode marketType definition
content = re.sub(
    r"const \[marketType, setMarketType\] = useState<'KR' \| 'US'>\(\(\) => \{.*?\}(\(\))?\);",
    r"const [marketType, setMarketType] = useState<'KR' | 'US'>('KR');",
    content,
    flags=re.DOTALL
)

# 2. Remove the Market Toggle UI
# Find the div containing the toggle (button for KR and button for US)
toggle_pattern = r"""\s*<div className="flex bg-[#2a2d35] rounded-xl overflow-hidden p-1 mr-4 shadow-inner ring-1 ring-white/5">\s*<button\s*onClick=\{.*?setMarketType\('KR'\).*?</button>\s*<button\s*onClick=\{.*?setMarketType\('US'\).*?</button>\s*</div>"""
content = re.sub(toggle_pattern, "", content, flags=re.DOTALL)

# 3. Disable Exchange Rate logic
# Just clear out fetchRealExchangeRate so it doesn't do anything
old_fetch_rate = """  const fetchRealExchangeRate = React.useCallback(async () => {"""
new_fetch_rate = """  const fetchRealExchangeRate = React.useCallback(async () => {
    // Disabled exchange rate
  }, []);
  
  const dummy_fetchRealExchangeRate = React.useCallback(async () => {"""
content = content.replace(old_fetch_rate, new_fetch_rate)

# 4. Remove Exchange Rate from the UI
exchange_ui_pattern = r"""<div className="hidden lg:flex items-center space-x-3 mr-4 bg-[#2a2d35] p-2 rounded-xl border border-white/5">.*?</div>\s*</div>"""
# Too risky with regex, I'll use a simpler approach or leave it if it shows 0.

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Patched marketType")
