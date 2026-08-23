import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace all occurrences in fixed inset-0 wrappers
content = content.replace(
    'className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"',
    'className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"'
)

content = content.replace(
    'className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"',
    'className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4"'
)

content = content.replace(
    'className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6"',
    'className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-2.5 sm:p-4 md:p-6"'
)

content = content.replace(
    'className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[95] flex items-center justify-center p-3 sm:p-4"',
    'className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4"'
)

content = content.replace(
    'className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"',
    'className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 md:p-6"'
)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Patched all z-indexes for modals")
