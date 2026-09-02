export interface ScalperSensors {
  pullback: boolean;
  breakout: boolean;
  vwap: boolean;
  cvd: boolean;
  volumeMomentum: boolean;
  rsi: number;
  activeCount: number;
  lastUpdatedAt: number;
}

export interface ScalperTab {
  id: string; // symbol e.g., '073240' or '001520'
  symbol: string;
  name: string;
  price?: number;
  isBotActive: boolean;
  gapBuyPrice: number;
  gapSellPrice: number;
  tradeQuantity: number;
  maxSlots: number;
  gapInventory: { id: string; price: number; quantity: number; symbol?: string }[];
  gapTradingProfit: number;
  gapTradeCount: number;
  lastTradeType: 'BUY' | 'SELL' | null;
  scalperMessage: string;
  entryPriceMode: 'CURRENT' | 'BID1' | 'BID2' | 'BID4';
  autoCancelThreshold: number;
  tradeLogs?: TradeLog[];
  lifecycleStatus?: string;
  sensors?: ScalperSensors;
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  basePrice?: number;
  change: number;
  changePercent: number;
  volume: string;
  history: { time: string; price: number; volume?: number }[];
  market: 'KR' | 'US';
  isAI?: boolean;
  momentum?: number;
  sentiment?: number;
  pattern?: string;
  isRealTime?: boolean;
  lastUpdated?: string;
}

export interface ScalperEngineState {
  running: boolean;
  startedAt: number | null;
  monitoredSymbols: string[];
  globalLogs: TradeLog[];
  selectedSymbol: string | null;
}

export interface ScalperRuntime {
  symbol: string;
  state:
    | 'WATCHING'
    | 'BUY_READY'
    | 'BUYING'
    | 'HOLDING'
    | 'SELL_READY'
    | 'SELLING'
    | 'ERROR';
  currentPrice: number;
  holdingQty: number;
  orderableQty: number;
  sensors: {
    pullback: boolean;
    breakout: boolean;
    vwap: boolean;
    cvd: boolean;
    volumeMomentum?: boolean;
    rsi?: number;
    activeCount?: number;
  };
}

export interface TradeLog {
  id?: string;
  time: string;
  symbol: string;
  type: 'BUY' | 'SELL' | '매수' | '매도' | 'SYSTEM' | 'SENSOR' | 'STATUS';
  price: number;
  amount?: number;
  quantity?: number;
  reason?: string;
  message?: string;
  profit?: number;
}
