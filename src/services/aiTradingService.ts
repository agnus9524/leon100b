import axios from "axios";

export interface MarketSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  timeframe: string;
  prediction: string;
  pattern: string;
  targetPrice: number;
  stopLoss: number;
  invariants: string[];
  riskRewardRatio: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const aiTradingService = {
  async analyzeStock(
    symbol: string,
    chartData: any[],
    name: string = ''
  ): Promise<MarketSignal> {

    const currentPrice =
      chartData?.length > 0
        ? Number(chartData[chartData.length - 1]?.price || 0)
        : 0;

    const safeFallback: MarketSignal = {
      symbol,
      action: 'HOLD',
      confidence: 50,
      timeframe: '1m',
      prediction: '데이터 부족',
      pattern: 'UNKNOWN',
      targetPrice: currentPrice,
      stopLoss: currentPrice,
      invariants: [],
      riskRewardRatio: 1
    };

    if (!currentPrice) {
      return safeFallback;
    }

    try {
      const response = await axios.post('/api/ai/analyze-stock', {
        symbol,
        chartData,
        name
      });

      const result = response?.data || {};

      let action: 'BUY' | 'SELL' | 'HOLD' =
        result.action === 'BUY' ||
        result.action === 'SELL'
          ? result.action
          : 'HOLD';

      let confidence = clamp(
        Number(result.confidence || 50),
        0,
        100
      );

      let target =
        Number(result.targetPrice || 0);

      let stop =
        Number(result.stopLoss || 0);

      if (!target || target <= 0) {
        target =
          action === 'BUY'
            ? currentPrice * 1.03
            : action === 'SELL'
            ? currentPrice * 0.97
            : currentPrice * 1.01;
      }

      if (!stop || stop <= 0) {
        stop =
          action === 'BUY'
            ? currentPrice * 0.98
            : action === 'SELL'
            ? currentPrice * 1.02
            : currentPrice * 0.99;
      }

      const targetDistance =
        Math.abs(target - currentPrice) /
        Math.max(currentPrice, 1);

      const stopDistance =
        Math.abs(stop - currentPrice) /
        Math.max(currentPrice, 1);

      if (
        targetDistance > 0.5 ||
        stopDistance > 0.5
      ) {
        console.warn(
          `[AI] unrealistic target detected: ${symbol}`
        );

        if (action === 'BUY') {
          target = currentPrice * 1.03;
          stop = currentPrice * 0.98;
        } else if (action === 'SELL') {
          target = currentPrice * 0.97;
          stop = currentPrice * 1.02;
        } else {
          target = currentPrice * 1.01;
          stop = currentPrice * 0.99;
        }
      }

      const reward =
        Math.abs(target - currentPrice);

      const risk =
        Math.abs(currentPrice - stop);

      const riskRewardRatio =
        risk > 0
          ? Number((reward / risk).toFixed(2))
          : 1;

      return {
        symbol,

        action,

        confidence,

        timeframe:
          result.timeframe || '1m',

        prediction:
          result.prediction ||
          'AI 분석 결과',

        pattern:
          result.pattern || 'UNKNOWN',

        targetPrice:
          Number(target.toFixed(2)),

        stopLoss:
          Number(stop.toFixed(2)),

        invariants:
          Array.isArray(result.invariants)
            ? result.invariants
            : [],

        riskRewardRatio
      };

    } catch (error: any) {

      console.error(
        "[AI Trading Analysis Error]",
        error
      );

      if (error?.response?.status === 429) {
        return {
          symbol,
          action: 'HOLD',
          confidence: 20,
          timeframe: '1m',
          prediction: 'AI 호출 제한',
          pattern: 'RATE_LIMIT',
          targetPrice: currentPrice,
          stopLoss: currentPrice,
          invariants: [],
          riskRewardRatio: 1
        };
      }

      return {
        symbol,
        action: 'HOLD',
        confidence: 10,
        timeframe: '1m',
        prediction: 'AI 분석 실패',
        pattern: 'ERROR',
        targetPrice: currentPrice,
        stopLoss: currentPrice,
        invariants: [],
        riskRewardRatio: 1
      };
    }
  }
};