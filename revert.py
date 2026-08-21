import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# The bad replacement was:
bad_str = "})()\n                    )}\n                  </div>\n                </div>\n              );\n            })()"
idx = content.find(bad_str)
if idx != -1:
    content = content[:idx] + "})()}" + content[idx+len(bad_str):]

with open('src/App.tsx', 'w') as f:
    f.write(content)

