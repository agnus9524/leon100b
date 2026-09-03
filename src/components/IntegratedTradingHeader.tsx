import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ChevronRight, Sparkles, Activity, TrendingUp, TrendingDown, 
  Layers, Zap, Loader2, Flame, RefreshCw, X, Play, Square, Briefcase, Coins 
} from 'lucide-react';
import { Stock, ScalperTab, TradeLog } from '../types';
import { cn } from '../lib/utils';
import { kisService } from '../services/kisService';

// ============================================================
// 📈 봉(캔들스틱) 차트 — 일반 증권 앱 스타일
// ------------------------------------------------------------
// 위쪽 라벨/메뉴 없이 캔들 + 우측 가격축 + 하단 분봉간격/기간 선택만 남긴 최소 구성.
// 매수 체결 시점엔 B, 매도 체결 시점엔 S 마커를 캔들 위/아래에 표시한다.
// 고급 설정(1회 거래수량/최대슬롯/목표순익/손절/추가매수간격/진입호가/실행속도)을
// 기본 화면에서 숨긴 자리에 대신 표시된다.
// ============================================================
type ChartPeriod = 'MIN' | 'D' | 'W' | 'M' | 'Y';
const MINUTE_INTERVALS = [1, 3, 5, 10, 15, 30, 60, 120, 240];

interface CandleBar {
  date: string;   // YYYYMMDD (D/W/M/Y) 또는 HHMMSS(MIN)
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TradeMarker {
  barIndex: number;
  price: number;
  type: 'BUY' | 'SELL';
}

// ============================================================
// 📋 실시간 체결 내역 (Time & Sales)
// ------------------------------------------------------------
// KIS REST API는 틱 단위 실시간 체결 스트림을 제공하지 않으므로(웹소켓 필요),
// 폴링으로 들어오는 가격 변화를 감지해서 "체결"로 간주하고 표시한다.
// 완벽한 실제 틱 데이터는 아니지만, 가격이 실제로 바뀔 때마다 기록되므로
// 스캘핑 중 흐름을 파악하는 용도로는 충분하다.
// ============================================================
interface TickEntry { time: string; price: number; direction: 'UP' | 'DOWN' | 'FLAT'; }

const TickFeed: React.FC<{ symbol: string; price: number; formatCurrency: (n: number) => string }> = ({ symbol, price, formatCurrency }) => {
  const [ticks, setTicks] = React.useState<TickEntry[]>([]);
  const lastPriceRef = React.useRef<number>(0);
  const lastSymbolRef = React.useRef<string>('');

  React.useEffect(() => {
    if (lastSymbolRef.current !== symbol) {
      // 종목이 바뀌면 이전 종목의 체결 내역은 지운다
      lastSymbolRef.current = symbol;
      lastPriceRef.current = 0;
      setTicks([]);
      return;
    }
    if (!price || price <= 0) return;
    if (lastPriceRef.current === 0) {
      lastPriceRef.current = price;
      return;
    }
    if (price === lastPriceRef.current) return; // 가격 변화가 없으면 새 틱으로 기록하지 않음

    const direction: TickEntry['direction'] = price > lastPriceRef.current ? 'UP' : 'DOWN';
    lastPriceRef.current = price;
    setTicks(prev => [{
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      price,
      direction
    }, ...prev].slice(0, 30));
  }, [symbol, price]);

  return (
    <div className="w-full lg:w-[104px] shrink-0 bg-black/40 rounded-2xl border border-sleek-border p-2 flex flex-col min-w-0 shadow-inner">
      <div className="flex items-center justify-between pb-1 border-b border-white/10 mb-1">
        <span className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider">체결가</span>
      </div>
      <div className="flex-1 overflow-hidden space-y-0.5 max-h-[220px]">
        {ticks.length === 0 ? (
          <div className="text-[9px] text-slate-500 text-center py-4">체결 대기중</div>
        ) : (
          ticks.map((t, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-center justify-between text-[9.5px] font-mono font-bold px-1 py-0.5 rounded",
                t.direction === 'UP' ? "text-rose-400 bg-rose-500/10" : t.direction === 'DOWN' ? "text-sky-400 bg-sky-500/10" : "text-slate-400"
              )}
            >
              <span className="opacity-70">{t.time.slice(0, 5)}</span>
              <span>{formatCurrency(t.price)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const CandlestickChart: React.FC<{
  symbol: string;
  name: string;
  scalperTabs: ScalperTab[];
  formatCurrency: (n: number) => string;
}> = ({ symbol, name, scalperTabs, formatCurrency }) => {
  const [period, setPeriod] = React.useState<ChartPeriod>('MIN');
  const [minuteInterval, setMinuteInterval] = React.useState(1);
  const [showMinuteMenu, setShowMinuteMenu] = React.useState(false);
  const [bars, setBars] = React.useState<CandleBar[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const minuteMenuRef = React.useRef<HTMLDivElement>(null);

  // 분봉 간격 드롭다운 바깥 클릭 시 닫기
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (minuteMenuRef.current && !minuteMenuRef.current.contains(e.target as Node)) {
        setShowMinuteMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  React.useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    setIsLoading(true);
    setErrorMsg(null);

    const load = async () => {
      try {
        if (period === 'MIN') {
          const res = await kisService.getDomesticMinuteChart(symbol);
          if (cancelled) return;
          if (res && Array.isArray(res.output2) && res.output2.length > 0) {
            const raw: CandleBar[] = [...res.output2].reverse().map((b: any) => ({
              date: String(b.stck_cntg_hour || b.stck_cntg_time || ''),
              open: Number(b.stck_oprc || b.stck_prpr || 0),
              high: Number(b.stck_hgpr || b.stck_prpr || 0),
              low: Number(b.stck_lwpr || b.stck_prpr || 0),
              close: Number(b.stck_prpr || b.stck_clpr || 0)
            })).filter(b => b.close > 0);

            // 1분봉을 요청한 분봉 간격만큼 묶어서 집계 (KIS는 1분 단위로만 내려주므로 클라이언트에서 합산)
            const grouped: CandleBar[] = [];
            for (let i = 0; i < raw.length; i += minuteInterval) {
              const chunk = raw.slice(i, i + minuteInterval);
              if (chunk.length === 0) continue;
              grouped.push({
                date: chunk[0].date,
                open: chunk[0].open,
                close: chunk[chunk.length - 1].close,
                high: Math.max(...chunk.map(c => c.high)),
                low: Math.min(...chunk.filter(c => c.low > 0).map(c => c.low))
              });
            }
            setBars(grouped);
            if (grouped.length === 0) setErrorMsg('표시할 분봉 데이터가 없습니다.');
          } else {
            setBars([]);
            setErrorMsg('분봉 데이터를 불러오지 못했습니다.');
          }
        } else {
          const kisCode = period === 'Y' ? 'M' : period; // KIS 기본 API는 연봉 코드가 없어 월봉으로 근사
          const res = await kisService.getDomesticDailyPrice(symbol, kisCode as 'D' | 'W' | 'M');
          if (cancelled) return;
          if (res && Array.isArray(res.output) && res.output.length > 0) {
            const parsed: CandleBar[] = [...res.output].reverse().map((b: any) => ({
              date: String(b.stck_bsop_date || ''),
              open: Number(b.stck_oprc || 0),
              high: Number(b.stck_hgpr || 0),
              low: Number(b.stck_lwpr || 0),
              close: Number(b.stck_clpr || 0)
            })).filter(b => b.close > 0);
            setBars(parsed);
            if (parsed.length === 0) setErrorMsg('표시할 시세 데이터가 없습니다.');
          } else {
            setBars([]);
            setErrorMsg('시세 데이터를 불러오지 못했습니다.');
          }
        }
      } catch {
        if (!cancelled) {
          setBars([]);
          setErrorMsg('시세 조회 중 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [symbol, period, minuteInterval]);

  // 매수(B)/매도(S) 체결 마커 — 해당 종목의 tradeLogs 중 실제 체결 이벤트만 추출해 가장 가까운 캔들에 매칭
  const markers = React.useMemo<TradeMarker[]>(() => {
    if (bars.length === 0) return [];
    const tab = scalperTabs.find(t => t.symbol === symbol);
    const logs = (tab?.tradeLogs || []).filter(l => l.reason && l.reason.includes('체결'));
    const result: TradeMarker[] = [];

    logs.forEach(log => {
      const isBuy = log.type === 'BUY' || log.type === '매수';
      // 로그의 time("HH:MM:SS")을 분봉 date("HHMMSS")와 비교하기 위해 숫자만 추출
      const logTimeDigits = log.time.replace(/[^0-9]/g, '');
      let bestIdx = -1;
      let bestDiff = Infinity;
      bars.forEach((bar, idx) => {
        const barDigits = bar.date.length >= 6 ? bar.date.slice(-6) : bar.date;
        const diff = Math.abs(Number(logTimeDigits.slice(-6) || 0) - Number(barDigits || 0));
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = idx;
        }
      });
      if (bestIdx >= 0) {
        result.push({ barIndex: bestIdx, price: log.price, type: isBuy ? 'BUY' : 'SELL' });
      }
    });
    return result;
  }, [bars, scalperTabs, symbol]);

  const formatDateLabel = (raw: string) => {
    if (period === 'MIN') {
      return raw.length >= 6 ? `${raw.slice(0, 2)}:${raw.slice(2, 4)}` : raw;
    }
    if (raw.length !== 8) return raw;
    return period === 'D' ? `${raw.slice(4, 6)}/${raw.slice(6, 8)}` : `${raw.slice(0, 4)}.${raw.slice(4, 6)}`;
  };

  // ── SVG 캔들 렌더링 좌표 계산 ──
  const CHART_W = 1000;
  const CHART_H = 380;
  const PADDING_TOP = 16;
  const PADDING_BOTTOM = 22;
  const PADDING_RIGHT = 58;
  const plotW = CHART_W - PADDING_RIGHT;
  const plotH = CHART_H - PADDING_TOP - PADDING_BOTTOM;

  const allHighs = bars.map(b => b.high).filter(v => v > 0);
  const allLows = bars.map(b => b.low).filter(v => v > 0);
  const maxPrice = allHighs.length > 0 ? Math.max(...allHighs) * 1.002 : 1;
  const minPrice = allLows.length > 0 ? Math.min(...allLows) * 0.998 : 0;
  const priceRange = (maxPrice - minPrice) || 1;

  const priceToY = (price: number) => PADDING_TOP + (1 - (price - minPrice) / priceRange) * plotH;
  const barSlot = bars.length > 0 ? plotW / bars.length : plotW;
  const candleWidth = Math.max(1.5, Math.min(barSlot * 0.62, 14));
  const barCenterX = (idx: number) => idx * barSlot + barSlot / 2;

  const priceGridLines = 5;
  const priceTicks = Array.from({ length: priceGridLines + 1 }, (_, i) => minPrice + (priceRange * i) / priceGridLines);

  return (
    <div className="lg:col-span-12 order-3 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col min-w-0 shadow-lg">
      <div className="flex-1 min-h-[480px] w-full relative">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400 animate-pulse">차트 불러오는 중...</div>
        ) : errorMsg || bars.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-400">{errorMsg || '데이터 없음'}</div>
        ) : (
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-full" preserveAspectRatio="none">
            {/* 가격 그리드 + 우측 축 라벨 */}
            {priceTicks.map((p, i) => {
              const y = priceToY(p);
              return (
                <g key={i}>
                  <line x1={0} y1={y} x2={plotW} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                  <text x={plotW + 6} y={y + 3} fontSize={10} fill="#64748b">{formatCurrency(p)}</text>
                </g>
              );
            })}

            {/* 캔들 */}
            {bars.map((bar, idx) => {
              const isUp = bar.close >= bar.open;
              const color = isUp ? '#f43f5e' : '#3b82f6'; // 상승 빨강 / 하락 파랑
              const cx = barCenterX(idx);
              const yHigh = priceToY(bar.high);
              const yLow = priceToY(bar.low);
              const yOpen = priceToY(bar.open);
              const yClose = priceToY(bar.close);
              const bodyTop = Math.min(yOpen, yClose);
              const bodyH = Math.max(1, Math.abs(yClose - yOpen));
              return (
                <g key={idx}>
                  <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth={1} />
                  <rect x={cx - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyH} fill={color} />
                </g>
              );
            })}

            {/* 매수(B) / 매도(S) 마커 */}
            {markers.map((m, i) => {
              const cx = barCenterX(m.barIndex);
              const isBuy = m.type === 'BUY';
              const y = isBuy ? priceToY(m.price) + 16 : priceToY(m.price) - 16;
              return (
                <g key={i}>
                  <circle cx={cx} cy={y} r={8} fill={isBuy ? '#f43f5e' : '#3b82f6'} stroke="#0f172a" strokeWidth={1.5} />
                  <text x={cx} y={y + 3.5} fontSize={10} fontWeight={900} fill="#fff" textAnchor="middle">
                    {isBuy ? 'B' : 'S'}
                  </text>
                </g>
              );
            })}

            {/* x축 시간 라벨 (양 끝 + 중간) */}
            {bars.length > 0 && [0, Math.floor(bars.length / 2), bars.length - 1].map((idx, i) => (
              <text key={i} x={barCenterX(idx)} y={CHART_H - 6} fontSize={9} fill="#94a3b8" textAnchor="middle">
                {formatDateLabel(bars[idx].date)}
              </text>
            ))}
          </svg>
        )}
      </div>

      {/* 하단: 분봉 간격 드롭다운 + 일/주/월/년 */}
      <div className="flex items-center gap-1 mt-2 shrink-0 flex-wrap">
        <div className="relative" ref={minuteMenuRef}>
          <button
            type="button"
            onClick={() => { setShowMinuteMenu(v => !v); setPeriod('MIN'); }}
            className={cn(
              "px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-all",
              period === 'MIN' ? "bg-sleek-blue/10 border-sleek-blue/50 text-sleek-blue" : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900"
            )}
          >
            {minuteInterval}분 ▾
          </button>
          {showMinuteMenu && (
            <div className="absolute bottom-full mb-1 left-0 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-1 min-w-[64px]">
              {MINUTE_INTERVALS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMinuteInterval(m); setPeriod('MIN'); setShowMinuteMenu(false); }}
                  className={cn(
                    "block w-full text-left px-3 py-1 text-[11px] font-bold hover:bg-slate-100",
                    minuteInterval === m && period === 'MIN' ? "text-sleek-blue" : "text-slate-600"
                  )}
                >
                  {m}분
                </button>
              ))}
            </div>
          )}
        </div>
        {(['D', 'W', 'M', 'Y'] as ChartPeriod[]).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
              period === p ? "bg-sleek-blue/10 border-sleek-blue/50 text-sleek-blue" : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900"
            )}
          >
            {p === 'D' ? '일' : p === 'W' ? '주' : p === 'M' ? '월' : '년'}
          </button>
        ))}
      </div>
    </div>
  );
};

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
  selectedScalperStrategies?: ('PULLBACK' | 'BREAKOUT' | 'VWAP_SUPPORT' | 'VOLUME_PROFILE_CVD')[];
  setSelectedScalperStrategies?: (strategies: any) => void;
  handleToggleStrategy?: (strat: 'PULLBACK' | 'BREAKOUT' | 'VWAP_SUPPORT' | 'VOLUME_PROFILE_CVD') => void;
  handleSelectAllGreen?: () => void;
  activeStrategyDetection: {
    isPullback: boolean;
    isBreakout: boolean;
    isVwapSupport: boolean;
    isVolumeProfile: boolean;
    activeCount: number;
    isAllGreen: boolean;
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
  maxInventoryPerMarket: number;
  updateTab: (symbol: string, updates: Partial<ScalperTab>) => void;
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
  selectedScalperStrategies = ['PULLBACK', 'BREAKOUT', 'VWAP_SUPPORT', 'VOLUME_PROFILE_CVD'],
  setSelectedScalperStrategies,
  handleToggleStrategy,
  handleSelectAllGreen,
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
  maxInventoryPerMarket,
  updateTab,
}) => {
  // 검색 드롭다운 키보드(↑↓ + Enter) 네비게이션용 로컬 상태
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  // 1회거래수량/최대슬롯/목표순익/손절/추가매수간격/진입호가/실행속도 — 기본적으로 숨기고, 필요할 때만 펼친다.
  // 숨겨진 자리에는 대신 일/주/월/년 가격 차트가 표시된다.
  const [showAdvancedSettings, setShowAdvancedSettings] = React.useState(false);
  const suggestionItemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchSuggestions, showSuggestions]);

  React.useEffect(() => {
    if (highlightedIndex >= 0) {
      suggestionItemRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-2.5 border-b border-white/10">

        {/* 1열: 종목 검색창 → 종목명 → 현재체결가 → 4/4 올-그린 센서 → 상태메시지 */}
        <div className="flex flex-col gap-2.5 min-w-0 lg:col-start-1" style={{ order: 1, gridRowStart: 1 }}>
          
          {/* 종목 검색 & 추가 인풋 (기존 대비 2배 폭) */}
          <div ref={searchRef} className="relative z-[100] w-full lg:max-w-[22rem]">
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
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (searchSuggestions.length === 0) return;
                  setShowSuggestions(true);
                  setHighlightedIndex(prev => (prev + 1) % searchSuggestions.length);
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (searchSuggestions.length === 0) return;
                  setShowSuggestions(true);
                  setHighlightedIndex(prev => (prev - 1 + searchSuggestions.length) % searchSuggestions.length);
                  return;
                }
                if (e.key === 'Escape') {
                  setShowSuggestions(false);
                  setHighlightedIndex(-1);
                  return;
                }
                if (e.key !== 'Enter') return;

                // ↑↓로 하이라이트된 항목이 있으면 그것을 최우선으로 선택
                if (highlightedIndex >= 0 && highlightedIndex < searchSuggestions.length) {
                  const picked = searchSuggestions[highlightedIndex];
                  handleAddStock(picked.symbol, picked, picked.name);
                  setHighlightedIndex(-1);
                  return;
                }

                const exactMatch = searchSuggestions.find(
                  s =>
                    s.symbol.toLowerCase() ===
                    searchSymbol.trim().toLowerCase()
                );

                if (exactMatch) {
                  handleAddStock(
                    exactMatch.symbol,
                    exactMatch,
                    exactMatch.name
                  );
                  return;
                }

                if (searchSuggestions.length > 0) {
                  const first = searchSuggestions[0];

                  handleAddStock(
                    first.symbol,
                    first,
                    first.name
                  );
                  return;
                }

                handleAddStock();
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
                      <Search className="w-3.5 h-3.5" />
                      {searchSymbol.trim() ? `검색 결과 (${searchSuggestions.length}개)` : `최근 등록 + 전체 KOSPI 종목 (${searchSuggestions.length}개)`}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-medium hidden sm:inline">클릭 또는 ↑↓ + Enter로 등록</span>
                  </div>

                  <div className="max-h-[340px] overflow-y-auto custom-scrollbar divide-y divide-white/5">
                    {searchSuggestions.map((s, idx) => {
                      const isAlreadyRegistered = scalperTabs.some(t => t.symbol === s.symbol);
                      const isHighlighted = idx === highlightedIndex;
                      return (
                      <button 
                        key={`${s.symbol}-${idx}`}
                        ref={(el) => { suggestionItemRefs.current[idx] = el; }}
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddStock(s.symbol, s as any, s.name);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 transition-colors text-left cursor-pointer group",
                          isHighlighted ? "bg-sleek-blue/25" : "hover:bg-sleek-blue/20 active:bg-sleek-blue/30"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-extrabold text-white group-hover:text-sleek-blue transition-colors truncate">
                            {s.name} <span className="text-slate-400 font-mono font-semibold">({s.symbol})</span>
                          </span>
                          {isAlreadyRegistered && (
                            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              등록됨
                            </span>
                          )}
                          {s.price !== undefined && s.price > 0 && (
                            <span className="shrink-0 text-xs font-mono text-sleek-blue font-bold">
                              {formatCurrency(s.price)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-sleek-blue opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0">
                          <span className="hidden sm:inline">{isAlreadyRegistered ? '탭 선택' : '탭 추가'}</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 선택된 종목 기본 정보 */}
          {selectedStock && (
            <div className="flex flex-col gap-2.5 min-w-0">
              
              {/* 종목명 & 종목코드 & 보유/주문가능수량 */}
              <div className="w-full flex flex-col justify-center overflow-hidden">
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
              <div className="w-full bg-black/70 px-3 py-1.5 rounded-2xl border border-white/20 shadow-xl flex items-center gap-3 backdrop-blur-md">
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

        {/* 1열: 4/4 올-그린 + 4대 개별 전략 센서 버튼 (눌림목/돌파/VWAP/CVD) — 왼쪽 */}
        <div className="flex items-center gap-1.5 flex-wrap lg:col-start-1" style={{ order: 3, gridRowStart: 3 }}>

          {/* 🎯 4/4 올-그린 (4대 핵심전략 일괄 선택 토글) — 눌림목 버튼 바로 왼쪽 */}
          <button
            type="button"
            onClick={() => {
              if (handleSelectAllGreen) {
                handleSelectAllGreen();
              } else if (setSelectedScalperStrategies) {
                setSelectedScalperStrategies(['PULLBACK', 'BREAKOUT', 'VWAP_SUPPORT', 'VOLUME_PROFILE_CVD']);
              }
              setScalperStrategyMode('ALL_SENSORS_4');
            }}
            className={cn(
              "px-2 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shrink-0",
              selectedScalperStrategies.length === 4
                ? cn(
                    "bg-emerald-500/20 text-emerald-200",
                    activeStrategyDetection.activeCount === 4
                      ? "border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.7)] ring-2 ring-emerald-400/80 animate-pulse"
                      : "border-white/10"
                  )
                : "bg-white/5 text-slate-400 hover:text-slate-200 border-white/10 opacity-60 hover:opacity-100"
            )}
            title="[최상급 4/4 올-그린] 눌림목 + 돌파 + VWAP + CVD 4개 전략 전체 선택"
          >
            <span className={cn(
              "w-2 h-2 rounded-full transition-all shrink-0",
              activeStrategyDetection.activeCount === 4 
                ? "bg-emerald-400 shadow-[0_0_8px_#10b981] animate-ping" 
                : selectedScalperStrategies.length === 4
                ? "bg-emerald-400"
                : "bg-slate-600/60 border border-slate-700"
            )} />
            <span>🎯 4/4 올-그린</span>
          </button>

          {/* ① 눌림목 (진입 타이밍 ★★★★) */}
          <button
            type="button"
            onClick={() => {
              if (handleToggleStrategy) {
                handleToggleStrategy('PULLBACK');
              } else if (setSelectedScalperStrategies) {
                const isSelected = selectedScalperStrategies.includes('PULLBACK');
                const next = isSelected 
                  ? selectedScalperStrategies.filter(s => s !== 'PULLBACK')
                  : [...selectedScalperStrategies, 'PULLBACK'];
                setSelectedScalperStrategies(next.length > 0 ? next : ['PULLBACK']);
              }
            }}
            className={cn(
              "px-2 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shrink-0",
              selectedScalperStrategies.includes('PULLBACK')
                ? cn(
                    "bg-cyan-500/20 text-cyan-200",
                    activeStrategyDetection.isPullback
                      ? "border-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.7)] ring-2 ring-cyan-400/80 animate-pulse"
                      : "border-white/10"
                  )
                : "bg-white/5 text-slate-400 hover:text-slate-200 border-white/10 opacity-60 hover:opacity-100"
            )}
            title="[진입 타이밍 ★★★★] 상승 추세 지지선 눌림목 후 반등 진입 (수익률 최적 진입)"
          >
            <span className={cn(
              "w-2 h-2 rounded-full transition-all shrink-0",
              activeStrategyDetection.isPullback 
                ? "bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-pulse" 
                : selectedScalperStrategies.includes('PULLBACK')
                ? "bg-cyan-400/70"
                : "bg-slate-600/60 border border-slate-700"
            )} />
            <span>① 눌림목</span>
          </button>

          {/* ② 돌파 (진입 신호 ★★★★) */}
          <button
            type="button"
            onClick={() => {
              if (handleToggleStrategy) {
                handleToggleStrategy('BREAKOUT');
              } else if (setSelectedScalperStrategies) {
                const isSelected = selectedScalperStrategies.includes('BREAKOUT');
                const next = isSelected 
                  ? selectedScalperStrategies.filter(s => s !== 'BREAKOUT')
                  : [...selectedScalperStrategies, 'BREAKOUT'];
                setSelectedScalperStrategies(next.length > 0 ? next : ['BREAKOUT']);
              }
            }}
            className={cn(
              "px-2 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shrink-0",
              selectedScalperStrategies.includes('BREAKOUT')
                ? cn(
                    "bg-amber-500/20 text-amber-200",
                    activeStrategyDetection.isBreakout
                      ? "border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.7)] ring-2 ring-amber-400/80 animate-pulse"
                      : "border-white/10"
                  )
                : "bg-white/5 text-slate-400 hover:text-slate-200 border-white/10 opacity-60 hover:opacity-100"
            )}
            title="[진입 신호 ★★★★] 당일/전고점/박스 상단 돌파 (가짜 돌파 주의, CVD 연계 권장)"
          >
            <span className={cn(
              "w-2 h-2 rounded-full transition-all shrink-0",
              activeStrategyDetection.isBreakout 
                ? "bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" 
                : selectedScalperStrategies.includes('BREAKOUT')
                ? "bg-amber-400/70"
                : "bg-slate-600/60 border border-slate-700"
            )} />
            <span>② 돌파</span>
          </button>

          {/* ③ VWAP (방향 필터 ★★★★★) */}
          <button
            type="button"
            onClick={() => {
              if (handleToggleStrategy) {
                handleToggleStrategy('VWAP_SUPPORT');
              } else if (setSelectedScalperStrategies) {
                const isSelected = selectedScalperStrategies.includes('VWAP_SUPPORT');
                const next = isSelected 
                  ? selectedScalperStrategies.filter(s => s !== 'VWAP_SUPPORT')
                  : [...selectedScalperStrategies, 'VWAP_SUPPORT'];
                setSelectedScalperStrategies(next.length > 0 ? next : ['VWAP_SUPPORT']);
              }
            }}
            className={cn(
              "px-2 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shrink-0",
              selectedScalperStrategies.includes('VWAP_SUPPORT')
                ? cn(
                    "bg-indigo-500/20 text-indigo-200",
                    activeStrategyDetection.isVwapSupport
                      ? "border-indigo-400 shadow-[0_0_14px_rgba(99,102,241,0.7)] ring-2 ring-indigo-400/80 animate-pulse"
                      : "border-white/10"
                  )
                : "bg-white/5 text-slate-400 hover:text-slate-200 border-white/10 opacity-60 hover:opacity-100"
            )}
            title="[방향 필터 ★★★★★] 기관 평균단가 (VWAP 위=매수 우위 필터, 지지선 반등 진입)"
          >
            <span className={cn(
              "w-2 h-2 rounded-full transition-all shrink-0",
              activeStrategyDetection.isVwapSupport 
                ? "bg-indigo-400 shadow-[0_0_8px_#6366f1] animate-pulse" 
                : selectedScalperStrategies.includes('VWAP_SUPPORT')
                ? "bg-indigo-400/70"
                : "bg-slate-600/60 border border-slate-700"
            )} />
            <span>③ VWAP</span>
          </button>

          {/* ④ CVD (수급 확인 ★★★★★) */}
          <button
            type="button"
            onClick={() => {
              if (handleToggleStrategy) {
                handleToggleStrategy('VOLUME_PROFILE_CVD');
              } else if (setSelectedScalperStrategies) {
                const isSelected = selectedScalperStrategies.includes('VOLUME_PROFILE_CVD');
                const next = isSelected 
                  ? selectedScalperStrategies.filter(s => s !== 'VOLUME_PROFILE_CVD')
                  : [...selectedScalperStrategies, 'VOLUME_PROFILE_CVD'];
                setSelectedScalperStrategies(next.length > 0 ? next : ['VOLUME_PROFILE_CVD']);
              }
            }}
            className={cn(
              "px-2 py-1.5 rounded-xl text-xs font-black border transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 shrink-0",
              selectedScalperStrategies.includes('VOLUME_PROFILE_CVD')
                ? cn(
                    "bg-purple-500/20 text-purple-200",
                    activeStrategyDetection.isVolumeProfile
                      ? "border-purple-400 shadow-[0_0_14px_rgba(168,85,247,0.7)] ring-2 ring-purple-400/80 animate-pulse"
                      : "border-white/10"
                  )
                : "bg-white/5 text-slate-400 hover:text-slate-200 border-white/10 opacity-60 hover:opacity-100"
            )}
            title="[수급 확인 ★★★★★] CVD 누적 거래량 체결 델타 & 실제 자금 유입·세력 매집 확인"
          >
            <span className={cn(
              "w-2 h-2 rounded-full transition-all shrink-0",
              activeStrategyDetection.isVolumeProfile 
                ? "bg-purple-400 shadow-[0_0_8px_#a855f7] animate-pulse" 
                : selectedScalperStrategies.includes('VOLUME_PROFILE_CVD')
                ? "bg-purple-400/70"
                : "bg-slate-600/60 border border-slate-700"
            )} />
            <span>④ CVD</span>
          </button>

        </div>

        {/* 2열: 실시간 상태 메시지창 — 오른쪽 */}
        <div className="text-xs sm:text-sm font-mono flex items-center bg-black/40 px-3.5 py-2 rounded-2xl border border-sleek-blue/30 shadow-inner lg:col-start-2" style={{ order: 3, gridRowStart: 3 }}>
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
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-stretch text-xs" style={{ order: 10 }}>

        {/* 고급 설정(1회거래수량/최대슬롯/목표순익/손절/추가매수간격/진입호가/실행속도) 토글.
            기본값은 숨김이며, 숨긴 자리에는 일/주/월/년 가격 차트가 대신 표시된다. */}
        <div className="lg:col-span-12 order-0 flex justify-end -mb-1">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-white/10 bg-black/30 text-slate-400 hover:text-white hover:border-white/30 transition-all"
          >
            <Zap className="w-3 h-3" />
            {showAdvancedSettings ? '차트 보기' : '고급 설정 (거래수량/슬롯/순익/손절 등)'}
          </button>
        </div>

        {showAdvancedSettings ? (
          <>
        {/* 1. 1회 거래수량, 최대 분할 슬롯, 목표순익 & 손절 (col-span-2) */}
        <div className="lg:col-span-6 order-3 bg-black/30 p-2.5 rounded-2xl border border-sleek-border flex flex-col justify-between space-y-1.5 min-w-0">
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

        {/* 2. SMART SCALPER 세부 설정 (col-span-2) */}
        <div className="lg:col-span-6 order-4 bg-sleek-blue/5 border border-sleek-blue/20 p-2.5 rounded-2xl flex flex-col justify-between space-y-1.5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-sleek-blue uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> SMART SCALPER
            </span>
            <span className="text-[9px] font-mono font-bold text-sleek-blue bg-sleek-blue/20 px-1.5 py-0.5 rounded border border-sleek-blue/30">
              AI ACTIVE
            </span>
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
          </>
        ) : (
          selectedStock && (
            <CandlestickChart symbol={selectedStock.symbol} name={selectedStock.name} scalperTabs={scalperTabs} formatCurrency={formatCurrency} />
          )
        )}

        {/* 3. 실시간 잔량 호가창 (4호가) (col-span-3) */}
      </div>

      {/* 2열: 실시간 체결 내역(왼쪽) + 실시간 잔량 호가창(4호가, 오른쪽) */}
        <div className="lg:col-start-2 flex flex-col lg:flex-row items-stretch gap-2 min-w-0" style={{ order: 2, gridRowStart: 2 }}>
        {selectedStock && (
          <TickFeed symbol={selectedStock.symbol} price={price} formatCurrency={formatCurrency} />
        )}
        <div className="flex-1 lg:max-w-[300px] bg-black/40 rounded-2xl border border-sleek-border p-2 flex flex-col justify-between min-w-0 space-y-1 shadow-inner">
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
        </div>

        {/* 4. 스캘퍼 등록 종목 & 추천종목 찾기 (col-span-3) */}
        <div className="lg:col-start-2 bg-black/30 p-2.5 rounded-2xl border border-sleek-border flex flex-col justify-between space-y-1.5 min-w-0 shadow-inner" style={{ order: 1, gridRowStart: 1 }}>
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              
              {/* 추천종목 찾기 버튼 */}
              <button
                type="button"
                onClick={handleOpenScalperRecommendations}
                disabled={isScalperRecLoading || isRefreshingTop3}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 text-[11px] font-black font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-95 shrink-0 disabled:opacity-50"
                title="한국투자증권 실시간 수급 및 거래량 데이터를 분석하여 스캘퍼 최적 추천종목 8선을 확인합니다."
              >
                {(isScalperRecLoading || isRefreshingTop3) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                ) : (
                  <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
                )}
                <span>{(isScalperRecLoading || isRefreshingTop3) ? "추천 분석중..." : "추천종목 찾기"}</span>
              </button>

            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold text-sleek-blue bg-sleek-blue/10 px-1.5 py-0.5 rounded border border-sleek-blue/20">
                {scalperTabs.filter(tab => {
                  const isUS = /^[A-Z]/.test(tab.symbol);
                  return marketType === 'US' ? isUS : !isUS;
                }).length}/{maxInventoryPerMarket}
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
              // 가격은 반드시 symbol 기준 단일 출처(scalperInventory.market.currentPrice = tab.price)를 우선한다.
              // stocks 배열 조회(tabStock)는 아직 market 동기화가 반영되기 전 순간을 위한 보조 수단일 뿐이다.
              const tabPrice = (tab.price && tab.price > 0) ? tab.price : (tabStock?.price || 0);
              const isPriceLoading = tab.priceStatus === 'LOADING' && tabPrice <= 0;

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
                    {isPriceLoading ? (
                      <span className="text-[10px] font-bold text-slate-500 animate-pulse">연결 중...</span>
                    ) : (
                      <span className="text-xs font-black font-mono text-rose-500 tabular-nums">
                        {formatCurrency(tabPrice)}
                      </span>
                    )}

                    {tab.isBotActive && (
                      <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/30 shrink-0">
                        ON
                      </span>
                    )}

                    <select
                      value={tab.tradeQuantity}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateTab(tab.symbol, { tradeQuantity: Number(e.target.value) });
                      }}
                      className="shrink-0 bg-black/60 border border-white/10 rounded-md text-[10px] font-bold text-slate-300 outline-none cursor-pointer appearance-none px-1 py-0.5 hover:border-sleek-blue/50"
                      title={`${tabName} 1회 거래수량 (종목별 개별 설정)`}
                    >
                      {[1, 2, 3, 5, 10, 15, 20, 30, 50, 100].map(val => (
                        <option key={val} value={val} className="bg-sleek-bg text-white">{val}주</option>
                      ))}
                    </select>

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

        {/* 5-1. START AI SCALPER 버튼 (왼쪽) */}
        <div className="lg:col-start-1" style={{ order: 4, gridRowStart: 4 }}>
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
              "w-full py-2 px-3 rounded-xl font-black text-xs italic tracking-tight uppercase shadow-lg transition-all flex items-center justify-center gap-1.5 border cursor-pointer",
              isGapBotActive 
                ? "bg-gradient-to-br from-rose-600 to-red-800 text-white border-rose-500/50 hover:scale-[1.02] active:scale-95" 
                : "bg-gradient-to-br from-sleek-blue to-indigo-700 text-white border-sleek-blue/50 hover:scale-[1.02] active:scale-95"
            )}
          >
            {isGapBotActive ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current animate-pulse text-white" />
                <span>SCALPER STOP</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-white" />
                <span>START AI SCALPER</span>
              </>
            )}
          </button>
        </div>

        {/* 5-2. 탭 순환 컨트롤 (오른쪽) */}
        <div className="lg:col-start-2" style={{ order: 4, gridRowStart: 4 }}>
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
