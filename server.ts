import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import axios from 'axios';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from "@google/genai";
import iconv from 'iconv-lite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface KrxStock {
  symbol: string;
  name: string;
  market: 'KR';
}

let krxStocksCache: KrxStock[] = [];

async function fetchKrxStocks() {
  try {
    console.log('[KRX Cache] Fetching master list from KIND...');
    const response = await axios.get('https://kind.krx.co.kr/corpgeneral/corpList.do?method=download', {
      timeout: 10000,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const html = iconv.decode(Buffer.from(response.data), 'euc-kr');
    const trs = html.match(/<tr>[\s\S]*?<\/tr>/gi) || [];
    const stocks: KrxStock[] = [];

    for (let i = 1; i < trs.length; i++) {
      const tr = trs[i];
      const tds = tr.match(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi) || [];
      if (tds.length >= 3) {
        const name = tds[0].replace(/<[^>]*>/g, '').trim();
        let code = tds[2].replace(/<[^>]*>/g, '').trim();
        code = code.replace(/[^0-9]/g, '');
        if (code.length === 6) {
          stocks.push({ symbol: code, name, market: 'KR' });
        }
      }
    }

    if (stocks.length > 0) {
      krxStocksCache = stocks;
      console.log(`[KRX Cache] Successfully loaded ${krxStocksCache.length} stocks from KIND.`);
    } else {
      console.error('[KRX Cache] Failed to parse stocks. Parsed count is 0.');
    }
  } catch (error: any) {
    console.error('[KRX Cache] Error fetching KRX stock list:', error.message);
  }
}

// Initialize Gemini with process.env.GEMINI_API_KEY
const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is missing.");
}
const ai = new GoogleGenAI({
  apiKey: GEMINI_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  // Populate the high-speed local KRX stock list cache immediately on boot
  fetchKrxStocks();

  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS Middleware for external frontend connections (e.g., Vercel)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-is-real-server');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

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
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are the XTX-PRO Predictive Engine. You output precise, cold-logical HFT analysis in JSON format.",
          responseMimeType: "application/json",
        }
      });

      res.json(JSON.parse(result.text || '{}'));
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
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `${systemPrompt}\n\nUser Request: ${prompt}`
      });
      const text = result.text || "";
      
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
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });
      res.json(result.text);
    } catch (error: any) {
      console.error("Gemini Analysis Error:", error);
      res.status(500).json({ error: "Market analysis failed", message: error.message });
    }
  });

  app.post('/api/ai/bot-decision', async (req, res) => {
    const { prompt } = req.body;
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      res.json({ text: result.text });
    } catch (error: any) {
      console.error("Bot Decision Error:", error);
      res.status(error.status || 500).json({ error: "Bot analysis failed", message: error.message });
    }
  });

  // KIS Proxy Routes
  app.all('/api/kis/*', async (req, res) => {
    const targetUrl = req.path.replace('/api/kis', '');
    
    // Check if client specifies real or virtual server
    const isRealServer = req.headers['x-is-real-server'] !== 'false';
    const baseUrl = isRealServer 
      ? 'https://openapi.koreainvestment.com:9443' 
      : 'https://openapivts.koreainvestment.com:29443';
    
    const agent = new https.Agent({
      keepAlive: true,
      maxSockets: 50
    });

    const fullUrl = `${baseUrl}${targetUrl}`;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[KIS Proxy] ${req.method} ${fullUrl} (RealServer: ${isRealServer})`);
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

    // If virtual server, convert trade TR-IDs starting with T to V
    if (!isRealServer && headers['tr_id'] && typeof headers['tr_id'] === 'string' && headers['tr_id'].startsWith('T')) {
      headers['tr_id'] = 'V' + headers['tr_id'].substring(1);
    }

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

  // Hybrid Stock Search API (Local KRX Cache for KR + Yahoo Finance for US)
  app.get('/api/stocks/search', async (req, res) => {
    const { keyword, marketType } = req.query;
    
    if (!keyword || typeof keyword !== 'string') {
      return res.json([]);
    }

    const cleanKeyword = keyword.trim();
    if (!cleanKeyword) {
      return res.json([]);
    }

    const isUSRequested = marketType === 'US' || /^[a-zA-Z]/.test(cleanKeyword);

    try {
      if (isUSRequested) {
        // US Stock Search Strategy: Use globally-reliable Yahoo Finance Search API
        try {
          const response = await axios.get('https://query1.finance.yahoo.com/v1/finance/search', {
            params: { q: cleanKeyword },
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 3000
          });

          if (response.data && Array.isArray(response.data.quotes)) {
            const mapped = response.data.quotes
              .filter((q: any) => q.quoteType === 'EQUITY')
              .map((q: any) => {
                let sym = q.symbol || '';
                if (sym.includes('.')) {
                  sym = sym.split('.')[0];
                }
                return {
                  symbol: sym,
                  name: q.longname || q.shortname || sym,
                  market: 'US' as const
                };
              });

            // De-duplicate US results
            const seen = new Set();
            const unique = mapped.filter((item: any) => {
              if (seen.has(item.symbol)) return false;
              seen.add(item.symbol);
              return true;
            });

            return res.json(unique.slice(0, 15));
          }
        } catch (err: any) {
          console.error('[US Stock Search Error]:', err.message);
        }
        return res.json([]);
      } else {
        // KR Stock Search Strategy: Use our 100% reliable local high-speed KRX listings cache
        if (krxStocksCache.length === 0) {
          console.log('[KRX Cache] Cache is empty on request. Performing emergency sync...');
          await fetchKrxStocks();
        }

        const lowerKeyword = cleanKeyword.toLowerCase();
        
        // Match by Name or Code
        let matched = krxStocksCache.filter(stock => {
          return stock.name.toLowerCase().includes(lowerKeyword) || stock.symbol.includes(cleanKeyword);
        });

        // Smart sorting: exact matches and items starting with keyword first
        matched.sort((a, b) => {
          const aNameLower = a.name.toLowerCase();
          const bNameLower = b.name.toLowerCase();
          
          // Exact matches first
          if (aNameLower === lowerKeyword && bNameLower !== lowerKeyword) return -1;
          if (bNameLower === lowerKeyword && aNameLower !== lowerKeyword) return 1;
          if (a.symbol === cleanKeyword && b.symbol !== cleanKeyword) return -1;
          if (b.symbol === cleanKeyword && a.symbol !== cleanKeyword) return 1;

          // Starts with matches next
          const aStarts = aNameLower.startsWith(lowerKeyword) || a.symbol.startsWith(cleanKeyword);
          const bStarts = bNameLower.startsWith(lowerKeyword) || b.symbol.startsWith(cleanKeyword);
          if (aStarts && !bStarts) return -1;
          if (bStarts && !aStarts) return 1;

          // Alphabetical otherwise
          return aNameLower.localeCompare(bNameLower);
        });

        // De-duplicate results based on symbol
        const seen = new Set();
        const uniqueMatched = matched.filter(stock => {
          if (seen.has(stock.symbol)) return false;
          seen.add(stock.symbol);
          return true;
        });

        return res.json(uniqueMatched.slice(0, 15));
      }
    } catch (error: any) {
      console.error("Stock search failure:", error);
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
