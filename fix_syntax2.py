import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# We look for the place where we have "return <div>{allLogItems}</div>;\n                      })()}"
# and we replace "})()}" with "})()\n                    )}\n                  </div>\n                </div>\n              );\n            })()"

bad_str = "return <div>{allLogItems}</div>;\n                      })()}"
idx = content.find(bad_str)
if idx != -1:
    fixed = content[:idx] + "return <div>{allLogItems}</div>;\n                      })()\n                    )}\n                  </div>\n                </div>\n              );\n            })()" + content[idx+len(bad_str):]
    with open('src/App.tsx', 'w') as f:
        f.write(fixed)
    print("Fixed syntax around 9500")
else:
    print("Could not find the bad string")
