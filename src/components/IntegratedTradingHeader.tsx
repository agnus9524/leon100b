import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ChevronRight, Sparkles, Activity, TrendingUp, TrendingDown, 
  Layers, Zap, Loader2, Flame, RefreshCw, X, Play, Square, Briefcase, Coins 
} from 'lucide-react';
import { Stock, ScalperTab } from '../types';
import { cn } from '../lib/utils';

export interface IntegratedTradingHeaderProps {
  selectedStock: Stock | null;
  searchRef: React.RefObject<HTMLDivElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchSymbol: string;
  setSearchSymbol: (s: string) => void;
  searchSuggestions: any[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  handleAddStock: (customSymbol?: string, recommendedStock?: Stock, customName?: string) => void;
  handleOpenScalperRecommendations: () => void;
  heldQty: number;
  displayBuyableQty: number;
  formatCurrency: (val: number, hideSymbol?: boolean, market?: string) => string;
  formatQuantity: (val: number) => string;
  scalperStrategyMode: string;
  setScalperStrategyMode: (mode: any) => void;
  activeStrategyDetection: {
    isPullback: boolean;
    isBreakout: boolean;
    isVwapSupport: boolean;
    isVolumeProfile: boolean;
    activeCount: number;
  };
  setIsMaxYieldModalOpen: (open: boolean) => void;
  displayScalperMessage: string;
  tradeQuantity: number;
  setTradeQuantity: (q: number) => void;
  maxSlots: number;
  setMaxSlots: (s: number) => void;
  scalpingTargetProfit: number;
  setScalpingTargetProfit: (p: number) => void;
  scalpingStopLoss: number;
  setScalpingStopLoss: (l: number) => void;
  isSmartScalperMode: boolean;
  setIsSmartScalperMode: (m: boolean) => void;
  minGapBetweenSlots: number;
  setMinGapBetweenSlots: (g: number) => void;
  entryPriceMode: string;
  setEntryPriceMode: (m: any) => void;
  scalpingSpeed: number;
  setScalpingSpeed: (s: number) => void;
  orderBookData: {
    askLevels: number[];
    askVolumes: number[];
    bidLevels: number[];
    bidVolumes: number[];
    maxLevelVol: number;
    totalAskVolume: number;
    totalBidVolume: number;
    askPctVal: number;
    bidPctVal: number;
    isRealData?: boolean;
  } | null;
  gapBuyPrice: number;
  gapSellPrice: number;
  isScalperRecLoading: boolean;
  isRefreshingTop3: boolean;
  scalperTabs: ScalperTab[];
  activeTabId: string;
  marketType: 'KR' | 'US';
  handleSwitchTab: (id: string) => void;
  closeScalperTab: (id: string, e: React.MouseEvent) => void;
  openOrSwitchScalperTab: (symbol: string, name?: string) => void;
  stocks: Stock[];
  setStocks: React.Dispatch<React.SetStateAction<Stock[]>>;
  stocksCache: { KR: Stock[]; US: Stock[] };
  setStocksCache: React.Dispatch<React.SetStateAction<{ KR: Stock[]; US: Stock[] }>>;
  aiRecommendations: Stock[];
  getResolvedStockName: (symbol: string, stock?: any) => string;
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  isGapBotActive: boolean;
  setIsGapBotActive: React.Dispatch<React.SetStateAction<boolean>>;
  setLastTradeType: (t: any) => void;
  isAutoRotateTabs: boolean;
  setIsAutoRotateTabs: React.Dispatch<React.SetStateAction<boolean>>;
  tabRotationInterval: number;
  setTabRotationInterval: (i: number) => void;
  holdings: Record<string, number>;
  avgPrices: Record<string, number>;
  setShowScalperRecModal: (open: boolean) => void;
  handleRefreshScalperRecList: () => void;
  handleSyncKIS: () => void;
  setManualSellStock: (s: Stock) => void;
  setManualSellQty: (q: number) => void;
  setManualSellPrice: (p: number) => void;
  setManualSellModalOpen: (open: boolean) => void;
  INITIAL_STOCKS_KR: Stock[];
  INITIAL_STOCKS: Stock[];
}

export const IntegratedTradingHeader: React.FC<IntegratedTradingHeaderProps> = ({
  selectedStock,
  searchRef,
  searchInputRef,
  searchSymbol,
  setSearchSymbol,
  searchSuggestions,
  showSuggestions,
  setShowSuggestions,
  handleAddStock,
  handleOpenScalperRecommendations,
  heldQty,
  displayBuyableQty,
  formatCurrency,
  formatQuantity,
  scalperStrategyMode,
  setScalperStrategyMode,
  activeStrategyDetection,
  setIsMaxYieldModalOpen,
  displayScalperMessage,
  tradeQuantity,
  setTradeQuantity,
  maxSlots,
  setMaxSlots,
  scalpingTargetProfit,
  setScalpingTargetProfit,
  scalpingStopLoss,
  setScalpingStopLoss,
  isSmartScalperMode,
  setIsSmartScalperMode,
  minGapBetweenSlots,
  setMinGapBetweenSlots,
  entryPriceMode,
  setEntryPriceMode,
  scalpingSpeed,
  setScalpingSpeed,
  orderBookData,
  gapBuyPrice,
  gapSellPrice,
  isScalperRecLoading,
  isRefreshingTop3,
  scalperTabs,
  activeTabId,
  marketType,
  handleSwitchTab,
  closeScalperTab,
  openOrSwitchScalperTab,
  stocks,
  setStocks,
  stocksCache,
  setStocksCache,
  aiRecommendations,
  getResolvedStockName,
  showNotification,
  isGapBotActive,
  setIsGapBotActive,
  setLastTradeType,
  isAutoRotateTabs,
  setIsAutoRotateTabs,
  tabRotationInterval,
  setTabRotationInterval,
  holdings,
  avgPrices,
  setShowScalperRecModal,
  handleRefreshScalperRecList,
  handleSyncKIS,
  setManualSellStock,
  setManualSellQty,
  setManualSellPrice,
  setManualSellModalOpen,
  INITIAL_STOCKS_KR,
  INITIAL_STOCKS,
}) => {
  const isUS = selectedStock ? (selectedStock.market === 'US' || /^[A-Za-z]/.test(selectedStock.symbol) || marketType === 'US') : false;
  const price = selectedStock?.price || 0;
  const changeVal = selectedStock?.change || 0;
  const changePct = selectedStock?.changePercent || 0;
  const isUp = changeVal >= 0;

  // Portfolio calculations
  const heldSymbols = Object.keys(holdings).filter(sym => (holdings[sym] || 0) > 0);
  let totalStockPurchase = 0;
  let totalStockEval = 0;

  heldSymbols.forEach(sym => {
    const qty = holdings[sym] || 0;
    const avgP = avgPrices[sym] || 0;
    const st = stocks.find(s => s.symbol === sym) || INITIAL_STOCKS_KR.find(s => s.symbol === sym) || INITIAL_STOCKS.find(s => s.symbol === sym);
    const currentP = st?.price || avgP;
    totalStockPurchase += (avgP * qty);
    totalStockEval += (currentP * qty);
  });

  const totalStockPnL = totalStockEval - totalStockPurchase;
  const totalStockPnLPct = totalStockPurchase > 0 ? (totalStockPnL / totalStockPurchase) * 100 : 0;

  return (
    <div className="relative z-[110] bg-gradient-to-br from-slate-900/95 via-slate-900/98 to-slate-950/95 border border-slate-700/60 p-3 sm:p-4 rounded-3xl shadow-2xl backdrop-blur-xl space-y-3">
      
      {/* ─────────────────────────────────────────────────────────────
          1행: 종목 검색/추가, 종목명/체결가, 그리고 6대 전략 센서 버튼
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 pb-2.5 border-b border-white/10">
        
        {/* 좌측 영역: 종목 검색 & 추가 + 선택 종목 정보 & 현재 체결가 */}
        <div className="flex items-center gap-2.5 flex-wrap grow py-0.5 overflow-visible">
          
          {/* 종목 검색 & 추가 인풋 */}
          <div ref={searchRef} className="relative z-[100] w-full sm:w-44 md:w-48 shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              ref={searchInputRef}
              type="text" 
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              onFocus={() => {
                if (searchSuggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddStock();
                }
              }}
              className="w-full bg-black/50 border border-white/15 focus:border-sleek-blue rounded-xl py-1.5 pl-7 pr-12 text-xs font-semibold text-white placeholder:text-slate-500 outline-none transition-all shadow-inner" 
              placeholder="종목코드/명"
            />
            <button
              type="button"
              onClick={() => handleAddStock()}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 bg-sleek-blue hover:bg-blue-600 active:scale-95 text-white text-[11px] font-bold rounded-lg transition-all shadow-md cursor-pointer"
            >
              추가
            </button>
            
            {/* Search Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && searchSuggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -4, scale: 0.98 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 z-[200] bg-slate-900/98 backdrop-blur-2xl border-2 border-sleek-blue/50 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] ring-2 ring-sleek-blue/30 overflow-hidden"
                >
                  <div className="px-4 py-2 bg-slate-950/90 border-b border-white/10 flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-sleek-blue">
                      <Search className="w-3.5 h-3.5" /> 실시간 검색 종목 ({searchSuggestions.length}개)
                    </span>
                    <span className="text-[11px] text-emerald-400 font-medium">클릭 시 즉시 스캘핑 탭 추가</span>
                  </div>

                  <div className="max-h-[340px] overflow-y-auto custom-scrollbar divide-y divide-white/5">
                    {searchSuggestions.map((s, idx) => (
                      <button 
                        key={`${s.symbol}-${idx}`}
                        onClick={() => handleAddStock(s.symbol, undefined, s.name)}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-sleek-blue/20 active:bg-sleek-blue/30 transition-colors text-left cursor-pointer group"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2.5">
                            <div className="text-sm sm:text-base font-extrabold text-white group-hover:text-sleek-blue transition-colors">
                              {s.name}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                            <span className="text-slate-300 font-semibold">{s.symbol}</span>
                            {s.price !== undefined && s.price > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-sleek-blue font-bold">
                                  {formatCurrency(s.price)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-sleek-blue opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                          <span>탭 추가</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 선택된 종목 기본 정보 */}
          {selectedStock && (
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              
              {/* 종목명 & 종목코드 & 보유/주문가능수량 */}
              <div className="w-full sm:w-[180px] md:w-[200px] shrink-0 flex flex-col justify-center overflow-hidden">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-none truncate" title={selectedStock.name}>
                    {selectedStock.name}
                  </h2>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/10 shrink-0">
                    {selectedStock.symbol}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 font-mono leading-tight">
                  <div>보유: <strong className="text-white font-bold">{heldQty.toLocaleString()}주</strong></div>
                  <div>주문가능: <strong className="text-sleek-blue font-bold">{displayBuyableQty.toLocaleString()}주</strong></div>
                </div>
              </div>

              {/* 현재 체결가 및 전일 대비 */}
              <div className="w-full sm:w-auto shrink-0 bg-black/70 px-3 py-1.5 rounded-2xl border border-white/20 shadow-xl flex items-center gap-3 backdrop-blur-md">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-amber-300 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-amber-400" /> 현재 체결가
                  </span>
                  <span className="text-base sm:text-lg font-black text-white font-mono tracking-tight drop-shadow-md">
                    {formatCurrency(price, false, isUS ? 'US' : 'KR')}
                  </span>
                </div>
                <div className="h-6 w-px bg-white/15" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400">전일 대비</span>
                  <span className={cn(
                    "text-xs font-black font-mono flex items-center gap-0.5 px-1.5 py-0.2 rounded border",
                    isUp ? "text-rose-400 bg-rose-500/15 border-rose-500/30" : "text-sky-400 bg-sky-500/15 border-sky-500/30"
                  )}>
                    {isUp ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                    <span>{isUp ? '+' : ''}{changePct.toFixed(2)}%</span>
                  </span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* 우측 영역: 스캘퍼 AI 실시간 전략 감지 센서 & 6대 전략 선택 모드 (VP/CVD 포함) */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
          
          {/* ⚡ 최고수익 AI★ 버튼 */}
          <button
            type="button"
            onClick={() => setIsMaxYieldModalOpen(true)}
            className={cn(
              "px-2.5 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1 shadow-md shrink-0",
              scalperStrategyMode === 'AI_MAX_YIELD'
                ? "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.6)] animate-pulse"
                : "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border-amber-500/40"
            )}
            title="⚡ 최고수익 AI 전자동 모드"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-bounce" />
            <span>⚡ 최고수익 AI★</span>
          </button>

          {/* 🎯 4/4 올-그린 */}
          <button
            type="button"
            onClick={() => setScalperStrategyMode('ALL_SENSORS_4')}
            className={cn(
              "px-2 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1 shrink-0",
              activeStrategyDetection.activeCount === 4
                ? "bg-gradient-to-r from-emerald-500/40 via-cyan-500/40 to-blue-500/40 text-emerald-200 border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.5)] animate-pulse"
                : scalperStrategyMode === 'ALL_SENSORS_4'
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md"
                : "bg-white/5 text-slate-400 hover:text-slate-200 border-white/5 opacity-80"
            )}
            title="4개 센서 모두 활성화 시 전량 진입"
          >
            <span className={cn(
              "w-2 h-2 rounded-full transition-all shrink-0",
              activeStrategyDetection.activeCount === 4 ? "bg-emerald-400 shadow-[0_0_8px_#10b981] animate-ping" : "bg-slate-600/60 border border-slate-700"
            )} />
            <span>🎯 4/4 올-그린</span>
          </button>

          {/* ① 눌림목 */}
          <button
            type="button"
            onClick={() => setScalperStrategyMode('PULLBACK')}
            className={cn(
              "px-2 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1 shrink-0",
              activeStrategyDetection.isPullback
                ? "bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                : scalperStrategyMode === 'PULLBACK'
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md"
                : "bg-white/5 text-slate-400 hover:text-slate-200 border-white/5 opacity-70"
            )}
            title="상승 추세 눌림목 후 반등 진입"
          >
            <span className={cn(
              "w-2 h-2 rounded-full transition-all shrink-0",
              activeStrategyDetection.isPullback ? "bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse" : "bg-slate-600/60 border border-slate-700"
            )} />
            <span>① 눌림목</span>
          </button>

          {/* ② 돌파 */}
          <button
            type="button"
            onClick={() => setScalperStrategyMode('BREAKOUT')}
            className={cn(
              "px-2 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1 shrink-0",
              activeStrategyDetection.isBreakout
                ? "bg-amber-500/30 text-amber-200 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                : scalperStrategyMode === 'BREAKOUT'
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md"
                : "bg-white/5 text-slate-400 hover:text-slate-200 border-white/5 opacity-70"
            )}
            title="거래량 급증 및 전고점 돌파 진입"
          >
            <span className={cn(
              "w-2 h-2 rounded-full transition-all shrink-0",
              activeStrategyDetection.isBreakout ? "bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" : "bg-slate-600/60 border border-slate-700"
            )} />
            <span>② 돌파</span>
          </button>

          {/* ③ VWAP */}
          <button
            type="button"
            onClick={() => setScalperStrategyMode('VWAP_SUPPORT')}
            className={cn(
              "px-2 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1 shrink-0",
              activeStrategyDetection.isVwapSupport
                ? "bg-indigo-500/30 text-indigo-200 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                : scalperStrategyMode === 'VWAP_SUPPORT'
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-md"
                : "bg-white/5 text-slate-400 hover:text-slate-200 border-white/5 opacity-70"
            )}
            title="VWAP 평균가격 지지선 반등 진입"
          >
            <span className={cn(
              "w-2 h-2 rounded-full transition-all shrink-0",
              activeStrategyDetection.isVwapSupport ? "bg-indigo-400 shadow-[0_0_8px_#6366f1] animate-pulse" : "bg-slate-600/60 border border-slate-700"
            )} />
            <span>③ VWAP</span>
          </button>

          {/* ④ VP/CVD */}
          <button
            type="button"
            onClick={() => setScalperStrategyMode('VOLUME_PROFILE_CVD')}
            className={cn(
              "px-2 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1 shrink-0",
              activeStrategyDetection.isVolumeProfile
                ? "bg-purple-500/30 text-purple-200 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                : scalperStrategyMode === 'VOLUME_PROFILE_CVD'
                ? "bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md"
                : "bg-white/5 text-slate-400 hover:text-slate-200 border-white/5 opacity-70"
            )}
            title="볼륨 프로파일(POC) & CVD 누적 유동성 흡수 진입"
          >
            <span className={cn(
              "w-2 h-2 rounded-full transition-all shrink-0",
              activeStrategyDetection.isVolumeProfile ? "bg-purple-400 shadow-[0_0_8px_#a855f7] animate-pulse" : "bg-slate-600/60 border border-slate-700"
            )} />
            <span>④ VP/CVD</span>
          </button>

        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2행: 실시간 상태 메시지창
          ───────────────────────────────────────────────────────────── */}
      <div className="text-xs sm:text-sm font-mono flex items-center bg-black/40 px-3.5 py-2 rounded-2xl border border-sleek-blue/30 shadow-inner">
        <div className="flex items-center gap-2.5 w-full overflow-hidden">
          <span className="text-xs font-black text-slate-300 uppercase shrink-0 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            실시간 상태 메시지:
          </span>
          <span className="font-bold text-sleek-blue text-xs sm:text-sm leading-snug truncate">
            {displayScalperMessage}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3행: 핵심 스캘퍼 5열 종합 제어 대시보드
          (1회거래수량/슬롯/순익, SMART SCALPER, 호가창, 종목관리/추천, START 버튼)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-stretch text-xs">
        
        {/* 1. 1회 거래수량, 최대 분할 슬롯, 목표순익 & 손절 (col-span-2) */}
        <div className="lg:col-span-2 bg-black/30 p-2.5 rounded-2xl border border-sleek-border flex flex-col justify-between space-y-1.5 min-w-0">
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[11px] font-black text-slate-300 uppercase flex items-center gap-1">
                <Layers className="w-3 h-3 text-sleek-blue" /> 1회 거래수량
              </label>
              <span className="text-xs font-bold text-white font-mono">{tradeQuantity}주</span>
            </div>
            <select 
              value={tradeQuantity}
              onChange={(e) => setTradeQuantity(Number(e.target.value))}
              className="w-full bg-black/50 border border-sleek-border rounded-xl p-1 text-center text-xs font-bold outline-none text-white font-mono appearance-none cursor-pointer"
            >
              {Array.from({ length: 100 }, (_, i) => i + 1).map(val => (
                <option key={val} value={val} className="bg-sleek-bg text-white">{val}주</option>
              ))}
            </select>
          </div>

          <div className="pt-1 border-t border-white/10">
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[11px] font-black text-slate-300 uppercase flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-400" /> 최대 분할 슬롯
              </label>
              <span className="text-[11px] font-bold text-emerald-400 font-mono">10개★</span>
            </div>
            <select 
              value={maxSlots}
              onChange={(e) => setMaxSlots(Number(e.target.value))}
              className="w-full bg-black/50 border border-emerald-500/30 rounded-xl p-1 text-center text-xs font-bold outline-none text-emerald-300 font-mono appearance-none cursor-pointer"
              title="최대 분할 매수 개수 (기본: 10개)"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(val => (
                <option key={val} value={val} className="bg-sleek-bg text-white">
                  {val === 10 ? '10개★' : `${val}개`}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-1 border-t border-white/10">
            <div className="text-[10.5px] font-black uppercase leading-tight space-y-0.5 mb-1">
              <div className="text-emerald-400 flex items-center justify-between">
                <span>목표 순익 +{scalpingTargetProfit}%</span>
                <span className="text-[8.5px] font-normal text-emerald-400/80 font-sans">세후</span>
              </div>
              <div className="text-rose-400">손절 {scalpingStopLoss}%</div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <select 
                value={scalpingTargetProfit}
                onChange={(e) => setScalpingTargetProfit(Number(e.target.value))}
                className="bg-black/50 border border-emerald-500/40 rounded-xl p-1 text-xs font-mono outline-none text-emerald-400 text-center font-bold appearance-none cursor-pointer"
                title="목표 순수익률 (기본 +0.2%)"
              >
                {[0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 1.0].map(val => (
                  <option key={val} value={val} className="bg-sleek-bg text-emerald-400">
                    +{val}%{val === 0.2 ? '★' : ''}
                  </option>
                ))}
              </select>
              <select 
                value={scalpingStopLoss}
                onChange={(e) => setScalpingStopLoss(Number(e.target.value))}
                className="bg-black/50 border border-rose-500/40 rounded-xl p-1 text-xs font-mono outline-none text-rose-400 text-center font-bold appearance-none cursor-pointer"
                title="손절 기준률 (기본 -0.5%)"
              >
                {[-0.3, -0.4, -0.5, -0.6, -0.7, -0.8, -0.9, -1.0].map(val => (
                  <option key={val} value={val} className="bg-sleek-bg text-rose-400">
                    {val}%{val === -0.5 ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2. SMART SCALPER & 세부 설정 (col-span-2) */}
        <div className="lg:col-span-2 bg-sleek-blue/5 border border-sleek-blue/20 p-2.5 rounded-2xl flex flex-col justify-between space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-sleek-blue uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" /> SMART SCALPER
            </span>
            <button
              type="button"
              onClick={() => setIsSmartScalperMode(!isSmartScalperMode)}
              className={cn(
                "p-0.5 rounded-lg transition-all border cursor-pointer shrink-0",
                isSmartScalperMode ? "bg-sleek-blue/20 border-sleek-blue/40 text-sleek-blue" : "bg-white/5 border-white/10 text-slate-400 opacity-60"
              )}
              title={`스마트 스캘퍼 모드 ${isSmartScalperMode ? '활성화(ON)' : '비활성화(OFF)'}`}
            >
              <div className={cn(
                "w-6 h-3 rounded-full transition-colors relative p-0.5",
                isSmartScalperMode ? "bg-sleek-blue" : "bg-slate-700"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full bg-white transition-transform shadow",
                  isSmartScalperMode ? "translate-x-3" : "translate-x-0"
                )} />
              </div>
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[10px] font-black text-slate-300 uppercase">추가 매수 간격 (Gap %)</label>
            </div>
            <select 
              value={minGapBetweenSlots}
              onChange={(e) => setMinGapBetweenSlots(Number(e.target.value))}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-1.5 py-1 text-xs font-mono font-bold text-white outline-none cursor-pointer appearance-none"
            >
              {[0.1, 0.2, 0.3, 0.4, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0, 5.0].map(gap => (
                <option key={gap} value={gap} className="bg-sleek-bg text-white">{gap}%</option>
              ))}
            </select>
          </div>

          {/* 진입 호가 방식 드롭다운 */}
          <div className="pt-1 border-t border-white/10">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-bold text-white flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-amber-400" /> 진입 호가 방식
              </span>
            </div>
            <select
              value={entryPriceMode}
              onChange={(e) => setEntryPriceMode(e.target.value as any)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-1.5 py-1 text-xs font-bold text-white outline-none cursor-pointer appearance-none"
              title="진입 호가 방식 선택"
            >
              <option value="BID1" className="bg-sleek-bg text-white">매수1호가</option>
              <option value="BID2" className="bg-sleek-bg text-emerald-400 font-bold">매수2호가★</option>
              <option value="BID4" className="bg-sleek-bg text-white">매수4호가</option>
              <option value="CURRENT" className="bg-sleek-bg text-white">현재가</option>
            </select>
          </div>

          {/* 실행 속도 드롭다운 */}
          <div className="pt-1 border-t border-white/10">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" /> 실행 속도
              </span>
            </div>
            <select
              value={scalpingSpeed}
              onChange={(e) => setScalpingSpeed(Number(e.target.value))}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-1.5 py-1 text-xs font-mono font-bold text-amber-300 outline-none cursor-pointer appearance-none"
              title="스캘핑 실행 주기 (체결 속도)"
            >
              <option value={100} className="bg-sleek-bg text-white">0.1s</option>
              <option value={200} className="bg-sleek-bg text-white">0.2s</option>
              <option value={300} className="bg-sleek-bg text-amber-300 font-bold">0.3s★</option>
              <option value={500} className="bg-sleek-bg text-white">0.5s</option>
            </select>
          </div>
        </div>

        {/* 3. 실시간 잔량 호가창 (4호가) (col-span-3) */}
        <div className="lg:col-span-3 bg-black/40 rounded-2xl border border-sleek-border p-2 flex flex-col justify-between min-w-0 space-y-1 shadow-inner">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-white/10 mb-1">
              <span className="text-[10.5px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3 text-sleek-blue" />
                실시간 잔량 호가창 (4호가)
                {orderBookData?.isRealData && (
                  <span className="text-[8.5px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 font-mono">
                    LIVE
                  </span>
                )}
              </span>
              {selectedStock && (
                <span className="text-[9.5px] font-mono text-slate-400 truncate max-w-[80px]">
                  {selectedStock.symbol}
                </span>
              )}
            </div>

            {orderBookData && selectedStock ? (
              <>
                {/* Ask Levels (매도 4~1호가) */}
                <div className="space-y-0.5">
                  {orderBookData.askLevels.map((lvlPrice, idx) => {
                    const vol = orderBookData.askVolumes[idx];
                    const isBoundary = gapSellPrice > 0 && lvlPrice >= gapSellPrice;
                    const barPct = Math.min(100, Math.round((vol / orderBookData.maxLevelVol) * 100));
                    return (
                      <div key={`top-ask-${idx}`} className="flex items-center justify-between h-3.5 px-1 rounded hover:bg-white/5 transition-all relative overflow-hidden group font-mono tabular-nums text-xs">
                        <div className="absolute right-0 top-0 bottom-0 bg-sky-500/30 border-l border-sky-400/60 pointer-events-none transition-all duration-300" style={{ width: `${barPct}%` }} />
                        <span className="w-11 shrink-0 text-[8.5px] text-sky-400 font-bold font-sans z-10 whitespace-nowrap">매도 {4 - idx}</span>
                        <span className={cn(
                          "flex-1 text-right font-bold z-10 font-mono tabular-nums text-[9.5px] whitespace-nowrap px-0.5",
                          isBoundary ? "text-amber-400 font-black underline decoration-sky-400" : "text-sky-200"
                        )}>
                          {formatCurrency(lvlPrice)}
                        </span>
                        <span className="w-12 shrink-0 text-right text-sky-100 font-bold font-mono tabular-nums text-[8.5px] z-10 whitespace-nowrap">{formatQuantity(vol)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Spread Line (현재 체결가) */}
                <div className="my-0.5 h-4 px-1 bg-white/5 border-y border-white/10 flex items-center justify-between rounded font-mono tabular-nums">
                  <span className="text-[8.5px] font-black text-slate-400 uppercase shrink-0">체결가</span>
                  <span className={cn("font-black text-[10.5px] font-mono tabular-nums animate-pulse", (selectedStock.change || 0) >= 0 ? "text-rose-400" : "text-sky-400")}>
                    {formatCurrency(selectedStock.price)}
                  </span>
                  <span className={cn("text-[8.5px] font-mono tabular-nums font-bold shrink-0", (selectedStock.changePercent || 0) >= 0 ? "text-rose-400" : "text-sky-400")}>
                    {(selectedStock.changePercent || 0) >= 0 ? '+' : ''}{(selectedStock.changePercent || 0).toFixed(2)}%
                  </span>
                </div>

                {/* Bid Levels (매수 1~4호가) */}
                <div className="space-y-0.5">
                  {orderBookData.bidLevels.map((lvlPrice, idx) => {
                    const vol = orderBookData.bidVolumes[idx];
                    const isBoundary = gapBuyPrice > 0 && lvlPrice <= gapBuyPrice;
                    const barPct = Math.min(100, Math.round((vol / orderBookData.maxLevelVol) * 100));
                    return (
                      <div key={`top-bid-${idx}`} className="flex items-center justify-between h-3.5 px-1 rounded hover:bg-white/5 transition-all relative overflow-hidden group font-mono tabular-nums text-xs">
                        <div className="absolute right-0 top-0 bottom-0 bg-rose-500/30 border-l border-rose-400/60 pointer-events-none transition-all duration-300" style={{ width: `${barPct}%` }} />
                        <span className="w-11 shrink-0 text-[8.5px] text-rose-400 font-bold font-sans z-10 whitespace-nowrap">매수 {idx + 1}</span>
                        <span className={cn(
                          "flex-1 text-right font-bold z-10 font-mono tabular-nums text-[9.5px] whitespace-nowrap px-0.5",
                          isBoundary ? "text-amber-400 font-black underline decoration-rose-400" : "text-rose-200"
                        )}>
                          {formatCurrency(lvlPrice)}
                        </span>
                        <span className="w-12 shrink-0 text-right text-rose-100 font-bold font-mono tabular-nums text-[8.5px] z-10 whitespace-nowrap">{formatQuantity(vol)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs font-mono">
                종목 선택 대기 중
              </div>
            )}
          </div>

          {/* Order Book Pressure Gauge */}
          {orderBookData && selectedStock && (
            <div className="pt-0.5 border-t border-white/5 space-y-0.5">
              <div className="flex justify-between text-[8px] text-slate-400 font-bold font-sans">
                <span className="text-sky-400">매도 {formatQuantity(orderBookData.totalAskVolume)} ({orderBookData.askPctVal}%)</span>
                <span className="text-rose-400">매수 {formatQuantity(orderBookData.totalBidVolume)} ({orderBookData.bidPctVal}%)</span>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden flex">
                <div className="h-full bg-sky-400 transition-all duration-300" style={{ width: `${orderBookData.askPctVal}%` }} />
                <div className="h-full bg-rose-400 transition-all duration-300" style={{ width: `${orderBookData.bidPctVal}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* 4. 스캘퍼 등록 종목 & 추천종목 찾기 (col-span-3) */}
        <div className="lg:col-span-3 bg-black/30 p-2.5 rounded-2xl border border-sleek-border flex flex-col justify-between space-y-1.5 min-w-0 shadow-inner">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              
              {/* 추천종목 찾기 버튼 */}
              <button
                type="button"
                onClick={handleOpenScalperRecommendations}
                disabled={isScalperRecLoading || isRefreshingTop3}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 text-[11px] font-black font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-95 shrink-0 disabled:opacity-50"
                title="한국투자증권 실시간 수급 및 거래량 데이터를 분석하여 스캘퍼 최적 추천종목 10선을 확인합니다."
              >
                {(isScalperRecLoading || isRefreshingTop3) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                ) : (
                  <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                )}
                <span>{(isScalperRecLoading || isRefreshingTop3) ? "추천 분석중..." : "추천종목 찾기"}</span>
              </button>

              {/* 종목추가 버튼 */}
              <button
                type="button"
                onClick={() => {
                  const currentMarketTabs = scalperTabs.filter(t => 
                    marketType === 'US' ? /^[A-Z]/.test(t.symbol) : !/^[A-Z]/.test(t.symbol)
                  );
                  if (currentMarketTabs.length >= 8) {
                    showNotification("최대 8개 종목까지 스캘퍼 탭을 등록할 수 있습니다.", "info");
                    return;
                  }

                  const aiAvailable = aiRecommendations.find(s => 
                    s.market === marketType && 
                    !scalperTabs.some(t => t.symbol === s.symbol)
                  );
                  
                  if (aiAvailable) {
                    if (!stocks.some(s => s.symbol === aiAvailable.symbol)) {
                      setStocks(prev => [...prev, aiAvailable]);
                    }
                    openOrSwitchScalperTab(aiAvailable.symbol, aiAvailable.name);
                    showNotification(`[AI 분석 추천] ${aiAvailable.name}(${aiAvailable.symbol}) 종목을 스캘퍼 타겟으로 추가했습니다.`, "success");
                    return;
                  }

                  const pool = marketType === 'KR' ? INITIAL_STOCKS_KR : INITIAL_STOCKS;
                  const poolAvailable = pool.find(s => !scalperTabs.some(t => t.symbol === s.symbol));
                  
                  if (poolAvailable) {
                    if (!stocks.some(s => s.symbol === poolAvailable.symbol)) {
                      setStocks(prev => [...prev, poolAvailable]);
                    }
                    openOrSwitchScalperTab(poolAvailable.symbol, poolAvailable.name);
                    showNotification(`[AI 종목 추천] ${poolAvailable.name}(${poolAvailable.symbol}) 종목을 스캘퍼 타겟으로 추가했습니다.`, "success");
                    return;
                  }

                  const tabIdx = currentMarketTabs.length + 1;
                  const newSymbol = marketType === 'US' ? `AIUS${tabIdx}` : `099${String(tabIdx).padStart(3, '0')}`;
                  const newName = marketType === 'US' ? `AI 추천 종목 ${tabIdx}` : `AI 최적추천주 ${tabIdx}`;
                  const basePrice = marketType === 'US' ? 10 + Math.floor(Math.random() * 90) : 5000 + Math.floor(Math.random() * 45000);
                  const dynamicStock: Stock = {
                    symbol: newSymbol,
                    name: newName,
                    price: basePrice,
                    change: Math.round(basePrice * 0.035),
                    changePercent: 3.5,
                    volume: '15.5M',
                    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: basePrice * (0.95 + (i/40)*0.1) })),
                    market: marketType,
                    isAI: true
                  };

                  setStocks(prev => [...prev, dynamicStock]);
                  openOrSwitchScalperTab(dynamicStock.symbol, dynamicStock.name);
                  showNotification(`[AI 분석 추천] ${dynamicStock.name}(${dynamicStock.symbol}) 종목을 스캘퍼 타겟으로 추가했습니다.`, "success");
                }}
                className="px-2 py-0.5 rounded-lg bg-sleek-blue/20 hover:bg-sleek-blue/30 text-sleek-blue hover:text-white border border-sleek-blue/40 text-[10.5px] font-black font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                title="종목 추가 (최대 8개)"
              >
                <Sparkles className="w-3 h-3 text-sleek-blue" />
                <span>종목추가</span>
                <span className="text-[10px] font-mono font-bold text-sleek-blue bg-sleek-blue/20 px-1 py-0.2 rounded border border-sleek-blue/30">
                  {scalperTabs.filter(tab => {
                    const isUS = /^[A-Z]/.test(tab.symbol);
                    return marketType === 'US' ? isUS : !isUS;
                  }).length}/8
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold text-sleek-blue bg-sleek-blue/10 px-1.5 py-0.5 rounded border border-sleek-blue/20">
                {scalperTabs.filter(tab => {
                  const isUS = /^[A-Z]/.test(tab.symbol);
                  return marketType === 'US' ? isUS : !isUS;
                }).length}/8
              </span>
            </div>
          </div>

          <div className="space-y-1 max-h-[175px] overflow-y-auto custom-scrollbar pr-0.5 py-0.5">
            {scalperTabs.filter(tab => {
              const isUS = /^[A-Z]/.test(tab.symbol);
              return marketType === 'US' ? isUS : !isUS;
            }).map(tab => {
              const isSelected = tab.id === activeTabId;
              const tabStock = stocks.find(s => s.symbol === tab.symbol) || 
                               stocksCache.KR?.find(s => s.symbol === tab.symbol) ||
                               stocksCache.US?.find(s => s.symbol === tab.symbol) ||
                               (marketType === 'KR' 
                                 ? INITIAL_STOCKS_KR.find(s => s.symbol === tab.symbol) 
                                 : INITIAL_STOCKS.find(s => s.symbol === tab.symbol));
              const tabName = (tab.name && tab.name !== tab.symbol) ? tab.name : getResolvedStockName(tab.symbol, tabStock);
              const tabPrice = tabStock?.price || 0;

              return (
                <div
                  key={tab.id}
                  onClick={() => handleSwitchTab(tab.id)}
                  className={cn(
                    "px-2 py-1.5 rounded-xl border flex items-center justify-between gap-1.5 cursor-pointer transition-all w-full text-left min-w-0 font-mono select-none group",
                    isSelected
                      ? "bg-sleek-blue/25 border-sleek-blue text-white shadow-md font-black ring-1 ring-sleek-blue/60"
                      : "bg-black/50 border-white/10 hover:bg-white/10 text-slate-300 hover:text-white"
                  )}
                  title={`${tabName} (${tab.symbol}) 탭으로 전환`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      tab.isBotActive ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" : "bg-slate-500"
                    )} />
                    <span className="font-bold text-xs truncate text-white">{tabName}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-black font-mono text-rose-500 tabular-nums">
                      {formatCurrency(tabPrice)}
                    </span>

                    {tab.isBotActive && (
                      <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/30 shrink-0">
                        ON
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => closeScalperTab(tab.id, e)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-all opacity-70 group-hover:opacity-100 cursor-pointer"
                      title={`${tabName} 탭 닫기`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. START AI SCALPER 버튼 & 탭 순환 컨트롤 (col-span-2) */}
        <div className="lg:col-span-2 flex flex-col justify-between gap-2">
          <button 
            type="button"
            onClick={() => {
              if (!isGapBotActive) {
                if (gapBuyPrice <= 0 || gapSellPrice <= 0) {
                  alert("금액 구간(하한선과 상한선)을 정확하게 설정해주세요.");
                  return;
                }
                if (gapBuyPrice >= gapSellPrice) {
                  alert("상한가는 하한가보다 높은 금액이어야 합니다.");
                  return;
                }
                setLastTradeType(null);
              }
              setIsGapBotActive(!isGapBotActive);
            }}
            title="현재 선택된 종목의 개별 스캘퍼 시작/정지"
            className={cn(
              "w-full grow min-h-[80px] py-2.5 px-3 rounded-2xl font-black text-base sm:text-lg italic tracking-tight uppercase shadow-2xl transition-all flex flex-col items-center justify-center gap-1 border cursor-pointer",
              isGapBotActive 
                ? "bg-gradient-to-br from-rose-600 to-red-800 text-white border-rose-500/50 shadow-rose-900/40 hover:scale-[1.02] active:scale-95" 
                : "bg-gradient-to-br from-sleek-blue to-indigo-700 text-white border-sleek-blue/50 shadow-sleek-blue/40 hover:scale-[1.02] active:scale-95"
            )}
          >
            {isGapBotActive ? (
              <>
                <Square className="w-5 h-5 fill-current animate-pulse text-white" />
                <span>SCALPER STOP</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current text-white" />
                <span className="text-center leading-tight text-sm sm:text-base">START AI SCALPER</span>
              </>
            )}
          </button>

          {/* 탭 순환 스위치 */}
          <div className={cn(
            "flex items-center justify-between rounded-xl border p-1 transition-all shadow-inner",
            isAutoRotateTabs 
              ? "bg-purple-500/15 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]" 
              : "bg-black/40 border-white/10"
          )}>
            <button
              type="button"
              onClick={() => setIsAutoRotateTabs(prev => !prev)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold transition-all cursor-pointer grow",
                isAutoRotateTabs ? "text-purple-300 hover:text-purple-200" : "text-gray-400 hover:text-white"
              )}
              title={`스캘핑 종목 탭 ${tabRotationInterval}초 간격 자동 순환 ON/OFF`}
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-purple-400", isAutoRotateTabs && "animate-spin-slow")} />
              <span>탭 순환 {isAutoRotateTabs ? "ON" : "OFF"}</span>
            </button>

            <div className="h-4 w-px bg-white/15 mx-1" />

            <div className="relative flex items-center pr-1">
              <select
                id="scalper-config-tab-rotation-interval-select"
                aria-label="종목 탭 자동 순환 주기 선택"
                value={tabRotationInterval}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTabRotationInterval(val);
                  try {
                    localStorage.setItem('sleek_tab_rotation_interval', String(val));
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className={cn(
                  "bg-transparent text-xs font-mono font-bold focus:outline-none cursor-pointer py-0.5 px-1 rounded transition-all",
                  isAutoRotateTabs ? "text-purple-300 hover:text-purple-100" : "text-gray-400 hover:text-gray-200",
                  "[&>option]:bg-slate-900 [&>option]:text-white"
                )}
                title="종목 탭 자동 순환 주기 선택 (1초~10초)"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(sec => (
                  <option key={sec} value={sec}>
                    {sec}초
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4행: 보유 주식 현황창 (Real-time Holdings Portfolio Status)
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-950/60 border border-slate-700/80 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3 relative overflow-hidden text-white backdrop-blur-md">
        
        {/* Header with Totals */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-tight">보유 주식 현황</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {heldSymbols.length}개 종목 보유 중
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                실시간 체결 내역 및 KIS 연동 보유 주식 평가 현황
              </p>
            </div>
          </div>

          {heldSymbols.length > 0 && (
            <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-1 rounded-2xl border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-[9px] text-slate-400 block font-sans">총 평가금액</span>
                <span className="font-bold text-white text-xs sm:text-sm">{formatCurrency(totalStockEval)}</span>
              </div>
              <div className="h-5 w-px bg-slate-800" />
              <div>
                <span className="text-[9px] text-slate-400 block font-sans">총 평가손익</span>
                <span className={cn("font-bold flex items-center gap-0.5 text-xs sm:text-sm", totalStockPnL >= 0 ? "text-rose-400" : "text-sky-400")}>
                  {totalStockPnL >= 0 ? "+" : ""}{formatCurrency(totalStockPnL)} ({totalStockPnLPct >= 0 ? "+" : ""}{totalStockPnLPct.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Stock Cards / List or Empty State */}
        {heldSymbols.length === 0 ? (
          <div className="py-5 px-3 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800/80 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
              <Coins className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300">현재 보유 중인 주식이 없습니다.</p>
              <p className="text-[10.5px] text-slate-500 mt-0.5">
                스캘퍼 자동 매매가 실행되거나 매수 시 실시간으로 표시됩니다.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowScalperRecModal(true);
                  handleRefreshScalperRecList();
                }}
                className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>추천종목 찾기</span>
              </button>
              <button
                type="button"
                onClick={handleSyncKIS}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>잔고 동기화</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 overflow-y-auto max-h-[180px] custom-scrollbar pr-1">
            {heldSymbols.map(sym => {
              const qty = holdings[sym] || 0;
              const avgP = avgPrices[sym] || 0;
              const st = stocks.find(s => s.symbol === sym) || INITIAL_STOCKS_KR.find(s => s.symbol === sym) || INITIAL_STOCKS.find(s => s.symbol === sym);
              const currentP = st?.price || avgP;
              const evalAmt = currentP * qty;
              const pnlAmt = (currentP - avgP) * qty;
              const pnlPct = avgP > 0 ? ((currentP - avgP) / avgP) * 100 : 0;
              const isProfit = pnlAmt >= 0;
              const displayName = getResolvedStockName(sym, st);

              return (
                <div 
                  key={sym} 
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-2.5 rounded-2xl flex flex-col justify-between gap-2 transition-all shadow-sm group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-[13px] text-white truncate group-hover:text-blue-400 transition-colors">
                          {displayName}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {sym}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {qty.toLocaleString()}주 · 평단 {formatCurrency(avgP)}
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <div className={cn("text-xs font-bold", isProfit ? "text-rose-400" : "text-sky-400")}>
                        {isProfit ? "+" : ""}{formatCurrency(pnlAmt)}
                      </div>
                      <div className={cn("text-[9.5px]", isProfit ? "text-rose-400/80" : "text-sky-400/80")}>
                        {isProfit ? "+" : ""}{pnlPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 font-mono text-[10.5px]">
                    <span className="text-slate-400">평가 {formatCurrency(evalAmt)}</span>
                    <div className="flex items-center gap-1 font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          if (st) {
                            openOrSwitchScalperTab(st.symbol, st.name);
                          }
                        }}
                        className="px-2 py-0.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-[10px] font-bold transition-all cursor-pointer"
                        title="스캘퍼 매매 탭으로 이동"
                      >
                        스캘퍼
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (st) {
                            setManualSellStock(st);
                            setManualSellQty(qty);
                            setManualSellPrice(currentP);
                            setManualSellModalOpen(true);
                          }
                        }}
                        className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold transition-all cursor-pointer"
                        title="수동 지정가 매도"
                      >
                        매도
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
