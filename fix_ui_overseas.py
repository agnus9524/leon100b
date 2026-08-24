import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace any mention of US market or overseas.
# Find market toggle UI
# `value="US"` or `marketType === 'US'`

content = re.sub(
    r"""<TabsList className="grid w-full grid-cols-2 p-1 bg-white/5 border border-white/10 rounded-xl mb-4">\s*<TabsTrigger value="KR".*?</TabsTrigger>\s*<TabsTrigger value="US".*?</TabsTrigger>\s*</TabsList>""",
    "",
    content,
    flags=re.DOTALL
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
