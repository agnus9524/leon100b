import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# restore true to isLoading
content = content.replace("isLoading: isAppInitialized", "isLoading: true")
# restore true to isRealOrderEnabled
content = content.replace("isRealOrderEnabled: isAppInitialized", "isRealOrderEnabled: true")
content = content.replace("const [isAppInitialized, setIsAppInitialized] = useState(true);", "const [isAppInitialized, setIsAppInitialized] = useState(false);")

with open('src/App.tsx', 'w') as f:
    f.write(content)
