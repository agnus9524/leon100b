import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_logic = """  const handleRefreshScalperTop3 = useCallback(() => {
    setIsRefreshingTop3(true);
    setTop3RefreshNonce(prev => prev + 1);
    
    // Trigger AI analysis on refresh
    handleGetRecommendations();

    setTimeout(() => {
      setIsRefreshingTop3(false);
      showNotification("[스캘퍼 최적 종목 분석] 현재 시장 데이터 기반 스캘핑 최적 종목 분석이 완료되었습니다.", "success");
    }, 1500);
  }, [showNotification, marketType]); // dependencies updated implicitly by handleGetRecommendations needing marketType"""

new_logic = """  const handleRefreshScalperTop3 = useCallback(async () => {
    setIsRefreshingTop3(true);
    setTop3RefreshNonce(prev => prev + 1);
    
    // Trigger AI analysis on refresh
    await handleGetRecommendations();

    setIsRefreshingTop3(false);
    showNotification("[스캘퍼 최적 종목 분석] 실시간 거래량 및 추세 분석 기반 딥 리서치가 완료되었습니다.", "success");
  }, [showNotification, handleGetRecommendations]);"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched handleRefreshScalperTop3 successfully.")
else:
    print("Could not find old_logic. Checking partial match...")
    if "handleRefreshScalperTop3" in content:
        print("Function exists but exact string didn't match.")
