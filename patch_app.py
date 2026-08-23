import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_logic = """  const handleGetRecommendations = useCallback(async () => {
    setIsGettingRecommendations(true);
    setAiRecommendations([]);
    try {
      const prompt = `현재 ${marketType === 'KR' ? '한국 KOSPI/KOSDAQ' : '미국 NYSE/NASDAQ'} 시장에서 주가 금액 제한 없이(가격 상관없이), 실시간 상승기류 및 1년 우상향 추세를 나타내며 스캘핑(초단타) 매매에 가장 적합한 AI 최적 종목 25개를 추천해주세요.
      각 종목에 대해 심볼, 기업명(토스증권 기준 한글 이름), 현재 대략적인 가격 정보를 포함해야 합니다.
      주의사항: "KODEX 200선물" 및 관련 레버리지/인버스 ETF 종목은 반드시 제외하세요.
      반드시 다음 JSON 배열 형식으로만 응답하세요: [{"symbol": "심볼", "name": "기업명", "price": 숫자}]`;

      const response = await axios.post('/api/ai/bot-decision', { prompt });
      const data = JSON.parse(response.data.text);
      if (Array.isArray(data)) {"""

new_logic = """  const handleGetRecommendations = useCallback(async () => {
    setIsGettingRecommendations(true);
    setAiRecommendations([]);
    try {
      // Use the new deep recommendation endpoint that leverages Gemini 1.5 Pro and Google Search
      const response = await axios.post('/api/ai/deep-recommend', { marketType });
      const data = JSON.parse(response.data.text);
      if (Array.isArray(data)) {"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched handleGetRecommendations successfully.")
else:
    print("Could not find old_logic. Please check exact string.")
