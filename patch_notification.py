import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_func = """  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };"""

new_func = """  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);"""

if old_func in content:
    content = content.replace(old_func, new_func)
    print("Patched showNotification")
else:
    print("Could not find showNotification block")

with open('src/App.tsx', 'w') as f:
    f.write(content)
