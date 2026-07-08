import express from 'express';
import axios from 'axios';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini with provided key as fallback or environment variable
const GEMINI_KEY = process.env.GEMINI_API_KEY || "AIzaSyCemXrlOW04-GFPaK2nWRWr7YHUe99__jc";
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini AI Routes
  app.post('/api/ai/analyze-stock', async (req, res) => {
    const { symbol, chartData, name } = req.body;
    
    const prompt = `
      You are an AI High-Frequency Trading (HFT) Engine inspired by XTX Markets (Alex Gerko). 
      Your goal is not a get-quick-rich scheme, but a "micro-arbitrage" and "probabilistic pattern recognition" engine.
      
      Analyze the following market data for ${name} (${symbol}):
      Recent Data: ${JSON.stringify(chartData?.slice(-30))}
      Current Price (Ref): ${chartData?.length > 0 ? chartData[chartData.length - 1].price : 'Unknown'}
      
      Tasks:
      1. Detect micro-patterns (e.g., volume spikes leading to price shifts).
      2. Calculate the probability of price returning to the mean (Mean Reversion).
      3. Identify "Invariants": logical conditions that must hold for this price to be 'normal'.
      4. Provide a high-confidence trade signal (BUY/SELL/HOLD).

      CRITICAL: You MUST base the 'targetPrice' and 'stopLoss' on the Current Price provided above. 
      - For a BUY signal: targetPrice > currentPrice, stopLoss < currentPrice.
      - For a SELL signal: targetPrice < currentPrice, stopLoss > currentPrice.
      - Use realistic spread (0.5% - 2.0%) based on volatility.
      - DO NOT provide static values from training data; use the exact Current Price (${chartData?.length > 0 ? chartData[chartData.length - 1].price : 'Unknown'}) as your foundation.
    `;

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: "You are the XTX-PRO Predictive Engine. You output precise, cold-logical HFT analysis in JSON format."
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      res.json(JSON.parse(result.response.text()));
    } catch (error: any) {
      console.error("Gemini AI Proxy Error:", error);
      res.status(500).json({ error: "AI Analysis failed", message: error.message });
    }
  });

  app.post('/api/ai/generate-strategy', async (req, res) => {
    const { prompt } = req.body;
    const systemPrompt = `
      당신은 한국투자증권의 전문 트레이딩 알고리즘 설계자입니다.
      사용자의 자연어 요청을 분석하여 구조화된 투자 전략(Strategy) 객체로 변환하세요.
      응답은 반드시 아래 형식의 JSON이어야 합니다:
      {
        "name": "전략 이름",
        "indicators": ["사용할 보조지표 리스트", "예: RSI, MACD, Moving Average"],
        "conditions": {
          "buy": "매수 조건 (자연어)",
          "sell": "매도 조건 (자연어)"
        },
        "explanation": "전략에 대한 간단한 설명"
      }
    `;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(`${systemPrompt}\n\nUser Request: ${prompt}`);
      const text = result.response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        res.json(JSON.parse(jsonMatch[0]));
      } else {
        throw new Error("JSON format not found in AI response");
      }
    } catch (error: any) {
      console.error("Gemini Strategy Error:", error);
      res.status(500).json({ error: "Strategy generation failed", message: error.message });
    }
  });

  app.post('/api/ai/market-analysis', async (req, res) => {
    const { marketData } = req.body;
    const prompt = `
      현재 시장 데이터: ${JSON.stringify(marketData)}
      이 데이터를 바탕으로 현재 시장의 추세와 투자 기회를 분석해주세요.
      간결하고 핵심적인 내용만 포함하세요.
    `;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      res.json(result.response.text());
    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      res.status(500).json({ error: "Market analysis failed", message: error.message });
    }
  });

  app.post('/api/ai/bot-decision', async (req, res) => {
    const { prompt } = req.body;
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent(prompt);
      res.json({ text: result.response.text() });
    } catch (error: any) {
      console.error("Bot Decision Error:", error);
      res.status(error.status || 500).json({ error: "Bot analysis failed", message: error.message });
    }
  });

  // KIS Proxy Routes
  app.all('/api/kis/*', async (req, res) => {
    const targetUrl = req.path.replace('/api/kis', '');
    
    // Hardcoded to Real server as requested to remove all virtual/test references
    const baseUrl = 'https://openapi.koreainvestment.com:9443';
    
    const agent = new https.Agent({
      keepAlive: true,
      maxSockets: 50
    });

    const fullUrl = `${baseUrl}${targetUrl}`;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[KIS Proxy] ${req.method} ${fullUrl}`);
      console.log(`[KIS Proxy] Incoming Headers: ${JSON.stringify(req.headers)}`);
    }
    
    // Pass along necessary headers
    const headers: any = {};
    const headerKeys = [
      'content-type', 'authorization', 'appkey', 'appsecret', 
      'tr_id', 'custtype', 'tr_cont', 'hashkey', 
      'personalseckey', 'gt_uid', 'seq_no', 'mac_address', 'phone_number', 'ip_addr'
    ];

    headerKeys.forEach(key => {
      // Standard header from client
      if (req.headers[key]) {
        headers[key] = req.headers[key];
      } 
      // Fallback: check dashed version (e.g. tr-id instead of tr_id) 
      // as Nginx often strips headers with underscores
      else {
        const dashedKey = key.replace(/_/g, '-');
        if (req.headers[dashedKey]) {
          headers[key] = req.headers[dashedKey];
        }
      }
    });

    try {
      const axiosConfig: any = {
        method: req.method,
        url: fullUrl,
        headers,
        params: req.query,
        httpsAgent: agent,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        axiosConfig.data = req.body;
      }

      const response = await axios(axiosConfig);
      res.status(response.status).json(response.data);
    } catch (error: any) {
      const errorData = error.response?.data;
      const status = error.response?.status || 500;
      
      console.error(`[KIS Proxy Error] ${status} [${req.method}] ${fullUrl}:`, error.message, errorData);
      
      // If 404, try to suggest common KIS path mistakes
      if (status === 404) {
        console.warn(`[KIS Proxy] 404 Path Hint: Ensure the endpoint version (v1/v2) and path segments are correct.`);
      }

      if (error.response) {
        res.status(status).json(errorData || { error: 'KIS Proxy Error', message: error.message });
      } else {
        res.status(500).json({ error: 'KIS Proxy Internal Error', message: error.message });
      }
    }
  });

  // Dynamic Stock Search API (Sequential multi-strategy using Naver Finance)
  app.get('/api/stocks/search', async (req, res) => {
    const { keyword, marketType } = req.query;
    
    if (!keyword || typeof keyword !== 'string') {
      return res.json([]);
    }

    const cleanKeyword = keyword.trim();
    if (!cleanKeyword) {
      return res.json([]);
    }

    try {
      let results: any[] = [];

      // Strategy 1: Try Naver Stock Search API (Primary, highly reliable)
      try {
        const response = await axios.get('https://api.stock.naver.com/search/stock', {
          params: {
            keyword: cleanKeyword,
            pageSize: 30,
            page: 1
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://finance.naver.com/'
          },
          timeout: 2500
        });

        let rawStocks: any[] = [];
        if (response.data) {
          if (Array.isArray(response.data.stocks)) {
            rawStocks = response.data.stocks;
          } else if (Array.isArray(response.data)) {
            rawStocks = response.data;
          } else if (response.data.stocks && Array.isArray(response.data.stocks)) {
            rawStocks = response.data.stocks;
          }
        }

        if (rawStocks.length > 0) {
          results = rawStocks.map((s: any) => {
            const sym = s.stockCode || s.itemCode || s.cd || s.symbol || "";
            const name = s.stockName || s.nm || s.name || "";
            const nation = s.nationCode || (s.reMark && s.reMark.includes('KOR') ? 'KR' : '');
            
            // Determine market type: US or KR
            let market: 'KR' | 'US' = 'KR';
            if (nation === 'US' || (s.reMark && ['NASDAQ', 'NYSE', 'AMEX'].some(m => s.reMark.toUpperCase().includes(m)))) {
              market = 'US';
            } else if (sym.match(/^[a-zA-Z]/)) {
              market = 'US';
            }

            // Clean symbol for US stocks (e.g. AAPL.O -> AAPL)
            let finalSym = sym;
            if (market === 'US' && finalSym.includes('.')) {
              finalSym = finalSym.split('.')[0];
            }

            return {
              symbol: finalSym,
              name: name,
              market: market
            };
          });
        }
      } catch (err) {
        console.error("[Search Strategy 1 Error]:", err);
      }

      // Strategy 2: If Strategy 1 returned nothing or failed, try Naver Autocomplete API
      if (results.length === 0) {
        try {
          const response = await axios.get('https://ac.finance.naver.com/ac', {
            params: {
              q: cleanKeyword,
              q_enc: 'utf-8',
              st: '111',
              r_lt: '111',
              r_format: 'json',
              r_enc: 'utf-8'
            },
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 2500
          });

          if (response.data && Array.isArray(response.data.items) && response.data.items[0]) {
            const rawItems = response.data.items[0];
            results = rawItems.map((item: any) => {
              if (Array.isArray(item) && item.length >= 2) {
                const name = item[0]?.[0] || item[0] || "";
                const sym = item[1]?.[0] || item[1] || "";
                
                let market: 'KR' | 'US' = 'KR';
                if (sym.match(/^[a-zA-Z]/)) {
                  market = 'US';
                }

                let finalSym = sym;
                if (market === 'US' && finalSym.includes('.')) {
                  finalSym = finalSym.split('.')[0];
                }

                return {
                  symbol: finalSym,
                  name: name,
                  market: market
                };
              }
              return null;
            }).filter(Boolean);
          }
        } catch (err) {
          console.error("[Search Strategy 2 Error]:", err);
        }
      }

      // Strategy 3: Try legacy mobile search list if still empty
      if (results.length === 0) {
        try {
          const response = await axios.get('https://m.stock.naver.com/api/json/search/searchListJson.nhn', {
            params: { keyword: cleanKeyword },
            headers: {
              'User-Agent': 'Mozilla/5.0'
            },
            timeout: 2500
          });

          if (response.data && response.data.result && Array.isArray(response.data.result.d)) {
            results = response.data.result.d.map((s: any) => {
              const sym = s.cd || "";
              const name = s.nm || "";
              let market: 'KR' | 'US' = 'KR';
              if (sym.match(/^[a-zA-Z]/)) {
                market = 'US';
              }

              let finalSym = sym;
              if (market === 'US' && finalSym.includes('.')) {
                finalSym = finalSym.split('.')[0];
              }

              return {
                symbol: finalSym,
                name: name,
                market: market
              };
            });
          }
        } catch (err) {
          console.error("[Search Strategy 3 Error]:", err);
        }
      }

      // Filter by requested marketType ('KR' or 'US')
      let filteredResults = results.filter((item: any) => item && item.market === marketType);

      // De-duplicate results by symbol
      const uniqueResults: any[] = [];
      const seenSymbols = new Set();
      filteredResults.forEach((item: any) => {
        if (!seenSymbols.has(item.symbol)) {
          seenSymbols.add(item.symbol);
          uniqueResults.push(item);
        }
      });

      res.json(uniqueResults.slice(0, 15));
    } catch (error: any) {
      console.error("Stock search global failure:", error);
      res.status(500).json({ error: "Failed to search stocks", message: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
