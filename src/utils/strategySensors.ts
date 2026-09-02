import { Stock, ScalperSensors } from '../types';

export interface StrategySensorResult {
  isPullback: boolean;
  isBreakout: boolean;
  isVwapSupport: boolean;
  isVolumeProfile: boolean;
  hasVolumeMomentum: boolean;
  activeCount: number;
  rsi: number;
  sma5: number;
  sma20: number;
  vwap: number;
  poc: number;
  cvd: number;
  isBullishAbsorption: boolean;
  isBearishAbsorption: boolean;
  bb: { upper: number; middle: number; lower: number };
  momentumPositive: boolean;
  isNearLowerBand: boolean;
  isNearUpperBand: boolean;
  lastPrice: number;
  isAllGreen: boolean;
}

export const calculateSMA = (data: number[], period: number): number => {
  if (data.length < period) return data.length > 0 ? data[data.length - 1] : 0;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
};

export const calculateRSI = (data: number[], period: number = 14): number => {
  if (data.length <= period) return 50;
  let gains = 0;
  let losses = 0;

  for (let i = data.length - period; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

export const calculateBollingerBands = (
  data: number[],
  period: number = 20,
  multiplier: number = 2
): { upper: number; middle: number; lower: number } => {
  if (data.length < period) return { upper: 0, middle: 0, lower: 0 };
  const sma = calculateSMA(data, period);
  const slice = data.slice(-period);
  const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: sma + multiplier * stdDev,
    middle: sma,
    lower: sma - multiplier * stdDev
  };
};

/**
 * 실시간 4대 스캘핑 전략 조건 감지 센서 (종목별 자율 연산)
 * 시세(KIS/실시간 틱) 데이터가 들어올 때마다 호출하여 전략 신호를 산출합니다.
 */
export const detectStockStrategies = (
  targetStock?: Stock | null,
  marketType?: 'KR' | 'US'
): StrategySensorResult => {
  const fallback: StrategySensorResult = {
    isPullback: false,
    isBreakout: false,
    isVwapSupport: false,
    isVolumeProfile: false,
    hasVolumeMomentum: false,
    activeCount: 0,
    rsi: 50,
    sma5: 0,
    sma20: 0,
    vwap: 0,
    poc: 0,
    cvd: 0,
    isBullishAbsorption: false,
    isBearishAbsorption: false,
    bb: { upper: 0, middle: 0, lower: 0 },
    momentumPositive: false,
    isNearLowerBand: false,
    isNearUpperBand: false,
    lastPrice: 0,
    isAllGreen: false
  };

  if (!targetStock) return fallback;

  const historyPrices = (targetStock.history ? targetStock.history.map(h => h.price) : [targetStock.price])
    .filter((p): p is number => typeof p === 'number' && !isNaN(p));
  const currentPrice = targetStock.price || 0;

  if (currentPrice <= 0 || historyPrices.length === 0) {
    return fallback;
  }

  const rsi = calculateRSI(historyPrices, 14);
  const bb = calculateBollingerBands(historyPrices, 20, 2);
  const sma5 = calculateSMA(historyPrices, 5);
  const sma20 = calculateSMA(historyPrices, 20);
  const vwap = historyPrices.length > 0 ? (historyPrices.reduce((a, b) => a + b, 0) / historyPrices.length) : currentPrice;

  const isUSStock = targetStock.market === 'US' || /^[A-Za-z]/.test(targetStock.symbol) || marketType === 'US';

  const priceBuckets: Record<string, number> = {};
  historyPrices.forEach(p => {
    const bucket = isUSStock ? p.toFixed(4) : p.toFixed(0);
    priceBuckets[bucket] = (priceBuckets[bucket] || 0) + 1;
  });
  let maxVolBucket = 0;
  let poc = currentPrice;
  Object.entries(priceBuckets).forEach(([pStr, count]) => {
    if (count > maxVolBucket) {
      maxVolBucket = count;
      poc = Number(pStr);
    }
  });

  let cvd = 0;
  let prevP = historyPrices[0] || currentPrice;
  const cvdSeries: number[] = [];
  historyPrices.forEach(p => {
    const delta = p > prevP ? 1 : p < prevP ? -1 : 0;
    cvd += delta;
    cvdSeries.push(cvd);
    prevP = p;
  });

  const recentPeak = historyPrices.length >= 5 ? Math.max(...historyPrices.slice(-10, -1)) : currentPrice;
  const recentLow = historyPrices.length >= 5 ? Math.min(...historyPrices.slice(-10, -1)) : currentPrice;
  const recentMaxCvd = cvdSeries.length >= 5 ? Math.max(...cvdSeries.slice(-10, -1)) : cvd;
  const recentMinCvd = cvdSeries.length >= 5 ? Math.min(...cvdSeries.slice(-10, -1)) : cvd;

  const isBullishAbsorption = (currentPrice <= recentLow * 1.01) && (cvd > recentMinCvd);
  const isBearishAbsorption = (currentPrice >= recentPeak * 0.995) && (cvd < recentMaxCvd);

  const momentumPositive = sma5 >= sma20;
  const isNearLowerBand = currentPrice <= bb.lower * 1.005;
  const isNearUpperBand = currentPrice >= bb.upper * 0.995;
  const lastPrice = historyPrices.length >= 2 ? historyPrices[historyPrices.length - 2] : currentPrice;
  const hasVolumeMomentum = currentPrice >= lastPrice || rsi >= 25;

  const isPullback = momentumPositive && (rsi < 40 || isNearLowerBand) && currentPrice >= sma5 && hasVolumeMomentum;
  const isBreakout = currentPrice >= recentPeak && currentPrice > lastPrice && rsi >= 50;
  const isVwapSupport = currentPrice >= vwap * 0.998 && currentPrice >= sma5 && hasVolumeMomentum;
  const isPocSupport = Math.abs(currentPrice - poc) / (poc || 1) < 0.008;
  const isVolumeProfile = isPocSupport || isBullishAbsorption;

  const activeCount = (isPullback ? 1 : 0) + (isBreakout ? 1 : 0) + (isVwapSupport ? 1 : 0) + (isVolumeProfile ? 1 : 0);
  const isAllGreen = activeCount === 4;

  return {
    isPullback,
    isBreakout,
    isVwapSupport,
    isVolumeProfile,
    hasVolumeMomentum,
    activeCount,
    rsi,
    sma5,
    sma20,
    vwap,
    poc,
    cvd,
    isBullishAbsorption,
    isBearishAbsorption,
    bb,
    momentumPositive,
    isNearLowerBand,
    isNearUpperBand,
    lastPrice,
    isAllGreen
  };
};

/**
 * StrategySensorResult를 ScalperInventoryItem['sensors'] 객체로 변환
 */
export const createSensorsSnapshot = (strat: StrategySensorResult): ScalperSensors => {
  return {
    pullback: strat.isPullback,
    breakout: strat.isBreakout,
    vwap: strat.isVwapSupport,
    cvd: strat.isVolumeProfile,
    volumeMomentum: strat.hasVolumeMomentum,
    rsi: Math.round(strat.rsi),
    activeCount: strat.activeCount,
    lastUpdatedAt: Date.now()
  };
};
