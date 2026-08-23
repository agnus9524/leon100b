import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Update the wrapper
content = content.replace(
    '<div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">',
    '<div className="grid grid-cols-2 lg:flex lg:flex-row lg:items-center gap-1.5 lg:gap-1.5 w-full lg:w-auto">'
)

# 2. Update the first button wrapper
content = content.replace(
    '<div className="pr-2 sm:pr-3 mr-1 sm:mr-2 border-r border-white/15">',
    '<div className="col-span-1 lg:pr-2 lg:sm:pr-3 lg:mr-1 lg:sm:mr-2 lg:border-r lg:border-white/15 w-full flex">'
)
content = content.replace(
    '"px-3 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-md",',
    '"w-full px-3 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shadow-md",'
)

# 3. Add w-full to all other buttons in this group
# "relative px-2.5 py-1.5 rounded-xl
content = content.replace(
    '"relative px-2.5 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1",',
    '"col-span-1 w-full relative px-2.5 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1",'
)
content = content.replace(
    '"relative px-2 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1",',
    '"col-span-1 w-full relative px-2 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1",'
)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Patched via regex/replace")
