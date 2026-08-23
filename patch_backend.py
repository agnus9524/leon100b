import sys

with open('server.ts', 'r') as f:
    content = f.read()

old = """      const result = await model.generateContent(prompt);
      let text = result.response.text();
      // clean markdown if any
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return res.json({ text });
    } catch (error: any) {
      console.warn("[Gemini Deep Recommend Info] Error:", error.message);
      // Fallback
      return res.json({ text: JSON.stringify([
        {"symbol": "005930", "name": "삼성전자", "price": 75000},
        {"symbol": "000660", "name": "SK하이닉스", "price": 180000},
        {"symbol": "035420", "name": "NAVER", "price": 190000}
      ])});
    }"""

new = """      const result = await model.generateContent(prompt);
      let text = result.response.text();
      // clean markdown if any
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return res.json({ text });
    } catch (error: any) {
      console.error("[Gemini Deep Recommend Info] Error:", error.message);
      res.status(500).json({ error: error.message === "GEMINI_API_KEY environment variable is not configured." ? "GEMINI_API_KEY 환경변수가 설정되지 않았습니다. AI Studio 우측 Settings 메뉴에서 API 키를 등록해주세요." : error.message });
    }"""

if old in content:
    content = content.replace(old, new)
    with open('server.ts', 'w') as f:
        f.write(content)
    print("Patched backend")
else:
    print("Could not patch backend")

