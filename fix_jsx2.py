import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# I will replace:
old_part = """              </div>
              
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-[11px]">"""

new_part = """              </div>
              
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 shrink-0">
                <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-[11px]">"""

if old_part in content:
    content = content.replace(old_part, new_part)
    print("Replaced!")
else:
    print("Not found")

with open('src/App.tsx', 'w') as f:
    f.write(content)
