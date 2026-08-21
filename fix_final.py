import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Fix 1: 8581
idx1 = content.find("})()}}")
if idx1 != -1:
    content = content[:idx1] + "})()}" + content[idx1+6:]
    print("Fixed 8581")

# Fix 2: 9518
# Look for "              );\n            })()\n            {/* 2. Real-time Gap Monitor Gauge */}"
bad_str = "              );\n            })()\n            {/* 2. Real-time Gap Monitor Gauge */}"
idx2 = content.find(bad_str)
if idx2 != -1:
    content = content[:idx2] + "              );\n            })()}\n            {/* 2. Real-time Gap Monitor Gauge */}" + content[idx2+len(bad_str):]
    print("Fixed 9521")
else:
    print("Could not find 9521")
    
with open('src/App.tsx', 'w') as f:
    f.write(content)

