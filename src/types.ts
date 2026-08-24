export interface ScalperTab {
  id: string; // symbol e.g., '073240' or '001520'
  symbol: string;
  name: string;
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
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  basePrice?: number;
  change: number;
  changePercent: number;
  volume: string;
  history: { time: string; price: number }[];
  market: 'KR' | 'US';
  isAI?: boolean;
  momentum?: number;
  sentiment?: number;
  pattern?: string;
  isRealTime?: boolean;
  lastUpdated?: string;
}

export interface TradeLog {
  id: string;
  time: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  profit?: number;
  message?: string;
}
