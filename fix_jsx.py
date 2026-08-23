import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix the dangling div
dangling = """                              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-[11px]">
                  <button"""

replacement = """              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 shrink-0">
                <div className="flex items-center gap-1.5"></div>
                <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-[11px]">
                  <button"""

content = content.replace(dangling, replacement)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Fixed JSX")
