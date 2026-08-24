import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("const [true, setIsAppInitialized] = useState(false);", "const [isAppInitialized, setIsAppInitialized] = useState(true);")
content = content.replace("!true", "!isAppInitialized")
content = content.replace(" true ", " isAppInitialized ")
content = content.replace("! true", "!isAppInitialized")
content = content.replace("true ?", "isAppInitialized ?")

with open('src/App.tsx', 'w') as f:
    f.write(content)
