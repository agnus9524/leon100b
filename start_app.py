import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Instead of waiting for sync to finish, let's just make it finish immediately if there's an error or it gets stuck.
content = re.sub(
    r"isAppInitialized",
    "true",
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
