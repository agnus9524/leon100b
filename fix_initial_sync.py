import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Hardcode isAppInitialized to true as default
content = content.replace("const [isAppInitialized, setIsAppInitialized] = useState(false);", "const [isAppInitialized, setIsAppInitialized] = useState(true);")

# Disable the initial sync trigger
content = re.sub(
    r"""  useEffect\(\(\) => \{
    if \(kisConfig\.isConnected && !isAppInitialized && initSyncState\.status === 'idle'\) \{
      const timer = setTimeout\(\(\) => \{
        setIsAppInitialized\(true\);
      \}, 300\);
      return \(\) => clearTimeout\(timer\);
    \}
  \}, \[kisConfig, isAppInitialized, initSyncState\.status\]\);""",
    """  // Initial sync completely disabled""",
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
