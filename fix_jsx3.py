import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'</div>\s*</div>\s*<div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-\[11px\]">',
    r'</div>\n              </div>\n              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 shrink-0">\n                <div className="flex items-center gap-1.5"></div>\n                <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-[11px]">',
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
