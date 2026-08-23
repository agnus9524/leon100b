import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Remove the icon block
old_icon = """                        {/* 종목 아이콘 */}
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sleek-blue/30 to-indigo-600/30 border border-sleek-blue/40 flex items-center justify-center text-sleek-blue font-black font-mono shadow-inner text-sm shrink-0">
                          {selectedStock.symbol.slice(0, 3)}
                        </div>"""

if old_icon in content:
    content = content.replace(old_icon, "")
    print("Icon removed")
else:
    print("Could not find icon block")

# 2. Fix the z-index of the modal
old_modal = 'className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6"'
new_modal = 'className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6"'

if old_modal in content:
    content = content.replace(old_modal, new_modal)
    print("Modal z-index fixed")
else:
    print("Could not find modal block")

with open('src/App.tsx', 'w') as f:
    f.write(content)

