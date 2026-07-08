import axios from "axios";

export interface MarketSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  timeframe: string; // e.g., "1m", "5m", "1h"
  prediction: string;
  pattern: string;
  targetPrice: number;
  stopLoss: number;
  invariants: string[]; // Logic checks for the trade
  riskRewardRatio: number;
}

export const aiTradingService = {
  async analyzeStock(symbol: string, chartData: any[], name: string = ''): Promise<MarketSignal> {
    try {
      const response = await axios.post('/api/ai/analyze-stock', {
        symbol,
        chartData,
        name
      });
      
      const result = response.data;
      const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;
      
      // Safety net: ensure target/stoploss are relative to current price if Gemini hallucinations occur
      let target = result.targetPrice || (currentPrice * 1.05);
      let stop = result.stopLoss || (currentPrice * 0.97);
      
      // Force relative fallback if values are unrealistic
      const priceDiff = Math.abs(target - currentPrice) / (currentPrice || 1);
      if (priceDiff > 0.5) { 
        console.warn("AI hallucinated price targets, using relative fallback");
        if (result.action === 'BUY') {
          target = currentPrice * 1.03;
          stop = currentPrice * 0.98;
        } else if (result.action === 'SELL') {
          target = currentPrice * 0.97;
          stop = currentPrice * 1.02;
        } else {
          target = currentPrice * 1.01;
          stop = currentPrice * 0.99;
        }
      }

      return {
        ...result,
        targetPrice: target,
        stopLoss: stop,
        symbol: symbol
      };
    } catch (error: any) {
      console.error("AI Trading Analysis Error:", error);
      if (error.response?.status === 429) {
        throw new Error("AI 분석 한도를 초과했습니다. 잠시 후 다시 시도됩니다.");
      }
      throw new Error(error.response?.data?.message || "AI 분석 중 오류가 발생했습니다.");
    }
  }
};
