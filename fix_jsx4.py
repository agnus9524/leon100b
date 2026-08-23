import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

pattern = r'<div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10">\s*<button\s*onClick=\{.*?setHoldingsViewTab\(\'KR\'\).*?</button>\s*<button\s*onClick=\{.*?setHoldingsViewTab\(\'US\'\).*?</button>\s*</div>'

content = re.sub(pattern, "", content, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(content)
