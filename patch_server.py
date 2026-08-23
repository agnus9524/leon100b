import sys

with open('server.ts', 'r') as f:
    content = f.read()

new_endpoint = """
  app.post('/api/ai/deep-recommend', async (req, res) => {
    const { marketType } = req.body;
    try {
      if (!genAI) {
        throw new Error("GEMINI_API_KEY environment variable is not configured.");
      }

      // Use gemini-1.5-pro for deep reasoning and googleSearch for live data
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-pro",
        tools: [{ googleSearch: {} }]
      });

      const marketName = marketType === 'KR' ? '한국 KOSPI/KOSDAQ' : '미국 NYSE/NASDAQ';
      const prompt = `
당신은 최고의 HFT(초단타) 및 데이트레이딩 퀀트 애널리스트입니다.
지금 당장 구글 검색을 활용하여 오늘 현재 시점 기준으로 ${marketName} 시장에서 **거래량이 폭증**하고 있으며 **상승 추세(급등락 후 반등 등)**에 있는 종목을 철저하게 분석해서 10~25개를 추천해주세요.
과거 데이터나 뻔한 우량주(예: 카카오, 네이버, 삼성전자 등 무조건적인 추천)를 반복해서 추천하지 마시고, 오늘 실제로 시장에서 핫한 테마나 거래대금이 터진 종목을 검색해서 찾아야 합니다. "KODEX 200선물" 같은 인버스/레버리지 ETF는 제외하세요.
시간이 걸려도 좋으니 신중하고 꼼꼼하게 검색 결과를 바탕으로 종목을 선정하세요.

반드시 다음 JSON 배열 형식으로만 응답하세요. (마크다운 백틱 없이 순수 JSON만 출력하세요)
[{"symbol": "심볼또는코드", "name": "기업명", "price": 현재대략적인가격(숫자)}]
      `;

      const result = await model.generateContent(prompt);
      let text = result.response.text();
      // clean markdown if any
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return res.json({ text });
    } catch (error: any) {
      console.warn("[Gemini Deep Recommend Info] Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
"""

# Insert before app.post('/api/ai/bot-decision'
idx = content.find("app.post('/api/ai/bot-decision'")
if idx != -1:
    content = content[:idx] + new_endpoint + "\n  " + content[idx:]
    with open('server.ts', 'w') as f:
        f.write(content)
    print("Injected /api/ai/deep-recommend")
else:
    print("Could not find insertion point!")
