import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_func = """  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        showNotification("로그인 창이 닫혔습니다.", "info");
      } else if (error.code === 'auth/popup-blocked') {
        showNotification("팝업 차단이 감지되었습니다. 브라우저 설정에서 팝업을 허용해주세요.", "error");
      } else {
        showNotification("로그인 중 오류가 발생했습니다.", "error");
      }
    }
  };"""

new_func = """  const isLoggingInRef = React.useRef(false);
  const handleLogin = async () => {
    if (isLoggingInRef.current) return;
    isLoggingInRef.current = true;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        showNotification("로그인 창이 닫혔습니다.", "info");
      } else if (error.code === 'auth/popup-blocked') {
        showNotification("팝업 차단이 감지되었습니다. 브라우저 설정에서 팝업을 허용해주세요.", "error");
      } else {
        showNotification("로그인 중 오류가 발생했습니다.", "error");
      }
    } finally {
      setTimeout(() => { isLoggingInRef.current = false; }, 1000);
    }
  };"""

if old_func in content:
    content = content.replace(old_func, new_func)
    print("Patched handleLogin")
else:
    print("Could not find handleLogin block")

with open('src/App.tsx', 'w') as f:
    f.write(content)
