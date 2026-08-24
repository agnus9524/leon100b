import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace the market tab buttons entirely
content = re.sub(
    r"""<div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl mb-4">.*?</div>""",
    "",
    content,
    flags=re.DOTALL
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
