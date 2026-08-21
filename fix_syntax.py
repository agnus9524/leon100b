import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

idx = content.find("})()}")
if idx == -1:
    print("Not found")
    sys.exit(1)

# I need to replace "})()" with "})()\n                    )}\n                  </div>\n                </div>\n              );\n            })()"
fixed = content[:idx] + "})()\n                    )}\n                  </div>\n                </div>\n              );\n            })()" + content[idx+4:]

with open('src/App.tsx', 'w') as f:
    f.write(fixed)

print("Fixed!")
