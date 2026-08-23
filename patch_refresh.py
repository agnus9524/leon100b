import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Update handleGetRecommendations to return true/false
old_func = """  const handleGetRecommendations = useCallback(async () => {
    setIsGettingRecommendations(true);
    setAiRecommendations([]);
    try {
      // Use the new deep recommendation endpoint that leverages Gemini 1.5 Pro and Google Search
      const response = await axios.post('/api/ai/deep-recommend', { marketType });
      const data = JSON.parse(response.data.text);
      if (Array.isArray(data)) {
        setAiRecommendations(data.map(item => ({
          ...item,
          change: item.price * (Math.random() > 0.5 ? 0.02 : -0.01),
          changePercent: (Math.random() > 0.5 ? 2.5 : -1.2),
          volume: (Math.floor(Math.random() * 50) + 10) + 'M',
          history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: item.price * (0.95 + Math.random() * 0.1) })),
          isAI: true,
          market: marketType
        })));
      }
    } catch (error: any) {
      console.error("Failed to get recommendations:", error);
      if (error.response && error.response.data && error.response.data.error) {
        showNotification("딥리서치 실패: " + error.response.data.error, "error");
      } else {
        showNotification("추천 종목을 불러오는데 실패했습니다. Gemini API 키를 확인해주세요.", "error");
      }
    } finally {
      setIsGettingRecommendations(false);
    }
  }, [marketType]);"""

new_func = """  const handleGetRecommendations = useCallback(async () => {
    setIsGettingRecommendations(true);
    setAiRecommendations([]);
    let success = false;
    try {
      // Use the new deep recommendation endpoint that leverages Gemini 1.5 Pro and Google Search
      const response = await axios.post('/api/ai/deep-recommend', { marketType });
      const data = JSON.parse(response.data.text);
      if (Array.isArray(data)) {
        setAiRecommendations(data.map(item => ({
          ...item,
          change: item.price * (Math.random() > 0.5 ? 0.02 : -0.01),
          changePercent: (Math.random() > 0.5 ? 2.5 : -1.2),
          volume: (Math.floor(Math.random() * 50) + 10) + 'M',
          history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: item.price * (0.95 + Math.random() * 0.1) })),
          isAI: true,
          market: marketType
        })));
        success = true;
      }
    } catch (error: any) {
      console.error("Failed to get recommendations:", error);
      if (error.response && error.response.data && error.response.data.error) {
        showNotification("딥리서치 실패: " + error.response.data.error, "error");
      } else {
        showNotification("추천 종목을 불러오는데 실패했습니다. Gemini API 키를 확인해주세요.", "error");
      }
    } finally {
      setIsGettingRecommendations(false);
    }
    return success;
  }, [marketType, showNotification]);"""

if old_func in content:
    content = content.replace(old_func, new_func)
    print("Replaced handleGetRecommendations")
else:
    print("Could not find handleGetRecommendations")

# 2. Update handleRefreshScalperTop3 to check return value
old_refresh = """  const handleRefreshScalperTop3 = useCallback(async () => {
    setIsRefreshingTop3(true);
    setTop3RefreshNonce(prev => prev + 1);
    
    // Trigger AI analysis on refresh
    await handleGetRecommendations();

    setIsRefreshingTop3(false);
    showNotification("[스캘퍼 최적 종목 분석] 실시간 거래량 및 추세 분석 기반 딥 리서치가 완료되었습니다.", "success");
  }, [showNotification, handleGetRecommendations]);"""

new_refresh = """  const handleRefreshScalperTop3 = useCallback(async () => {
    setIsRefreshingTop3(true);
    setTop3RefreshNonce(prev => prev + 1);
    
    // Trigger AI analysis on refresh
    const success = await handleGetRecommendations();

    setIsRefreshingTop3(false);
    if (success) {
      showNotification("[스캘퍼 최적 종목 분석] 실시간 거래량 및 추세 분석 기반 딥 리서치가 완료되었습니다.", "success");
    }
  }, [showNotification, handleGetRecommendations]);"""

if old_refresh in content:
    content = content.replace(old_refresh, new_refresh)
    print("Replaced handleRefreshScalperTop3")
else:
    print("Could not find handleRefreshScalperTop3")

with open('src/App.tsx', 'w') as f:
    f.write(content)
