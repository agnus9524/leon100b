import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Make it ignore any errors during init sync and just start the app
content = re.sub(
    r"""    } catch \(err: any\) \{
      console.error\("Initial Sync Pipeline Error", err\);
      setInitSyncState\(prev => \(\{
        \.\.\.prev,
        status: 'error',
        currentStep: `동기화 오류: \$\{err.message \|\| '데이터를 가져오지 못했습니다.'\}`,
        errorMsg: err.message
      \}\)\);
    \} finally \{
      isInitialSyncRunningRef.current = false;
    \}""",
    """    } catch (err: any) {
      console.error("Initial Sync Pipeline Error", err);
      // Just force start the app even if there are errors
      if (autoEnterAfterSync) setIsAppInitialized(true);
    } finally {
      isInitialSyncRunningRef.current = false;
    }""",
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
