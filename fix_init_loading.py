import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# I want to find the useEffect that triggers it, and see why it loops
content = re.sub(
    r"""  useEffect\(\(\) => \{
    if \(kisConfig\.isConnected && !isAppInitialized && initSyncState\.status === 'idle'\) \{
      const timer = setTimeout\(\(\) => \{
        executeFullKisInitialSync\(true\);
      \}, 300\);
      return \(\) => clearTimeout\(timer\);
    \}
  \}, \[kisConfig, isAppInitialized, initSyncState\.status, executeFullKisInitialSync\]\);""",
    """  useEffect(() => {
    if (kisConfig.isConnected && !isAppInitialized && initSyncState.status === 'idle') {
      const timer = setTimeout(() => {
        setIsAppInitialized(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [kisConfig, isAppInitialized, initSyncState.status]);""",
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
