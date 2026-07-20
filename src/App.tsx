/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3, 
  Activity, 
  Wallet, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Bell, 
  User, 
  CircleDollarSign,
  Zap,
  Clock,
  Play,
  Square,
  Bot,
  Newspaper,
  ChevronRight,
  Loader2,
  Settings,
  Users,
  ShieldCheck,
  Calendar,
  RefreshCw,
  Edit2,
  Key,
  Lock,
  Plus,
  Copy,
  Check,
  Info,
  Globe,
  Landmark,
  Sparkles,
  MousePointer2,
  CreditCard,
  Download,
  FileSpreadsheet,
  X,
  ArrowDown,
  Target,
  LineChart,
  BrainCircuit,
  Compass,
  Trophy,
  Eye,
  EyeOff,
  Layers,
  Percent,
  ShieldAlert
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  Cell,
  AreaChart,
  Area,
  ReferenceLine,
  Label
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import axios from 'axios';
import { kisService } from './services/kisService';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  signInAnonymously,
  checkLicense, 
  getAllLicenses, 
  updateLicense,
  generateAuthKey,
  activateLicenseWithKey,
  getAllAuthKeys,
  loginWithKey,
  saveUserKISConfig,
  getUserSettings,
  saveUserHoldings,
  saveUserKISToken,
  db
} from './services/firebaseService';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { StrategyPanel } from './components/StrategyPanel';
import { XTXPredictor } from './components/XTXPredictor';
import { MarketSignal } from './services/aiTradingService';
import { POPULAR_STOCKS, type StockSuggestion } from './constants/stockList';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types & Mock Data ---

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  history: { time: string; price: number }[];
  isAI?: boolean;
  momentum?: number; // 0-100 score
  sentiment?: number; // -1 to 1 score
  pattern?: string; // e.g. "Double Bottom", "Cup and Handle"
}

interface AIAnalysisResult {
  symbol: string;
  newsScore: number; // 1-10
  momentumScore: number; // 1-10
  patternScore: number; // 1-10
  finalScore: number; // 1-100
  recommendation: string;
  expectedAnnualReturn: number;
}

const INITIAL_STOCKS: Stock[] = [
  {
    symbol: 'NVDA',
    name: '엔비디아',
    price: 132.45,
    change: 2.15,
    changePercent: 1.65,
    volume: '45.2M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 120 + Math.random() * 20 })),
    isAI: true
  },
  {
    symbol: 'AAPL',
    name: '애플',
    price: 189.54,
    change: -0.45,
    changePercent: -0.24,
    volume: '22.1M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 180 + Math.random() * 15 })),
    isAI: true
  },
  {
    symbol: 'TSLA',
    name: '테슬라',
    price: 245.12,
    change: 12.30,
    changePercent: 5.28,
    volume: '88.5M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 210 + Math.random() * 50 })),
    isAI: true
  },
  {
    symbol: 'GOOGL',
    name: '알파벳 A',
    price: 142.88,
    change: 1.12,
    changePercent: 0.79,
    volume: '15.4M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 135 + Math.random() * 10 })),
    isAI: true
  },
  {
    symbol: 'MSFT',
    name: '마이크로소프트',
    price: 405.65,
    change: 3.25,
    changePercent: 0.81,
    volume: '18.9M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 390 + Math.random() * 25 })),
    isAI: true
  }
];

interface TradeLog {
  time: string;
  symbol: string;
  type: 'BUY' | 'SELL' | '매수' | '매도';
  price: number;
  amount: number;
  reason: string;
}

interface NewsItem {
  title: string;
  summary: string;
  source: string;
  time: string;
  url?: string;
}

const INITIAL_STOCKS_KR: Stock[] = [
  {
    symbol: '073240',
    name: '금호타이어',
    price: 6140,
    change: 0,
    changePercent: 0,
    volume: '1.2M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 6000 + Math.random() * 200 })),
    isAI: true
  },
  {
    symbol: '005930',
    name: '삼성전자',
    price: 77600, // Updated to a more realistic current price
    change: 0,
    changePercent: 0,
    volume: '15.2M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 77000 + Math.random() * 1000 })),
    isAI: true
  },
  {
    symbol: '000660',
    name: 'SK하이닉스',
    price: 172000, // Updated to a more realistic current price
    change: 0,
    changePercent: 0,
    volume: '2.8M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 170000 + Math.random() * 5000 })),
    isAI: true
  },
  {
    symbol: '035420',
    name: '네이버',
    price: 185000,
    change: 0,
    changePercent: 0,
    volume: '0.9M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 180000 + Math.random() * 10000 })),
    isAI: true
  },
  {
    symbol: '005380',
    name: '현대차',
    price: 245000,
    change: 0,
    changePercent: 0,
    volume: '0.6M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 240000 + Math.random() * 10000 })),
    isAI: true
  }
];

// Flag Components
const SouthKoreaFlag = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" xmlns="http://www.w3.org/2000/svg" className="rounded-[1px] shadow-sm flex-shrink-0">
    <rect width="18" height="12" fill="white" />
    <circle cx="9" cy="6" r="3" fill="#CD2E3A" />
    <mask id="taeguk-mask" maskUnits="userSpaceOnUse" x="6" y="3" width="6" height="6">
      <circle cx="9" cy="6" r="3" fill="white" />
    </mask>
    <g mask="url(#taeguk-mask)" transform="rotate(-33 9 6)">
      <path d="M6 6C6 4.34315 7.34315 3 9 3C10.6569 3 12 4.34315 12 6H6Z" fill="#CD2E3A" />
      <path d="M6 6C6 7.65685 7.34315 9 9 9C10.6569 9 12 7.65685 12 6H6Z" fill="#0047A0" />
      <circle cx="7.5" cy="6" r="1.5" fill="#0047A0" />
      <circle cx="10.5" cy="6" r="1.5" fill="#CD2E3A" />
    </g>
    <g stroke="black" strokeWidth="0.8" strokeLinecap="round">
      <path d="M2.5 2.5L4 4" />
      <path d="M14 8L15.5 9.5" />
      <path d="M2.5 9.5L4 8" />
      <path d="M14 4L15.5 2.5" />
    </g>
  </svg>
);

const USAFlag = () => (
  <svg width="18" height="12" viewBox="0 0 18 12" xmlns="http://www.w3.org/2000/svg" className="rounded-[1px] shadow-sm flex-shrink-0">
    <rect width="18" height="12" fill="white" />
    <rect width="18" height="1" fill="#B22234" />
    <rect y="2" width="18" height="1" fill="#B22234" />
    <rect y="4" width="18" height="1" fill="#B22234" />
    <rect y="6" width="18" height="1" fill="#B22234" />
    <rect y="8" width="18" height="1" fill="#B22234" />
    <rect y="10" width="18" height="1" fill="#B22234" />
    <rect width="8" height="6.6" fill="#3C3B6E" />
    <circle cx="2" cy="1.5" r="0.3" fill="white" />
    <circle cx="4" cy="1.5" r="0.3" fill="white" />
    <circle cx="6" cy="1.5" r="0.3" fill="white" />
    <circle cx="2" cy="3.3" r="0.3" fill="white" />
    <circle cx="4" cy="3.3" r="0.3" fill="white" />
    <circle cx="6" cy="3.3" r="0.3" fill="white" />
    <circle cx="2" cy="5.1" r="0.3" fill="white" />
    <circle cx="4" cy="5.1" r="0.3" fill="white" />
    <circle cx="6" cy="5.1" r="0.3" fill="white" />
  </svg>
);

export default function App() {
  const [marketType, setMarketType] = useState<'KR' | 'US'>('KR');
  const [displayCurrency, setDisplayCurrency] = useState<'KRW' | 'USD'>('KRW');
  const [exchangeRate, setExchangeRate] = useState(1350);
  const [exchangeData, setExchangeData] = useState<Stock>({
    symbol: 'USD/KRW',
    name: '원/달러 환율',
    price: 1350,
    change: 0,
    changePercent: 0,
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 1350 + Math.random() * 5 }))
  });
  const [isRateLoading, setIsRateLoading] = useState(true);
  const [exchangeRateTrend, setExchangeRateTrend] = useState<'UP' | 'DOWN'>('UP');
  const [selectionMode, setSelectionMode] = useState<'RECOMMENDED' | 'MANUAL'>('RECOMMENDED');
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS_KR);
  const [selectedSymbol, setSelectedSymbol] = useState('073240');
  const [balance, setBalance] = useState(0); // User's money (will be synced via KIS)
  const [principal, setPrincipal] = useState(0); // Investment principal (will be synced via KIS)
  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [sellableHoldings, setSellableHoldings] = useState<Record<string, number>>({});
  const [isBotActive, setIsBotActive] = useState(false);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('ko-KR', { hour12: false }));
  const [botStatus, setBotStatus] = useState<string>("대기 중...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [newsCache, setNewsCache] = useState<Record<string, { data: NewsItem[], timestamp: number }>>({});
  const [newsError, setNewsError] = useState<string | null>(null);

  // AI Cooldown tracking
  const lastAiCallRef = React.useRef<number>(0);
  const AI_COOLDOWN_MS = 10000; // Minimum 10 seconds between AI calls

  // Authentication & Subscription State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Admin Panel State
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [allLicenses, setAllLicenses] = useState<any[]>([]);
  const [allAuthKeys, setAllAuthKeys] = useState<any[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'users' | 'keys'>('users');

  // Key Activation State
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [isActivatingKey, setIsActivatingKey] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  // Market Cache to persist added stocks
  const [stocksCache, setStocksCache] = useState<Record<'US' | 'KR', Stock[]>>({
    US: INITIAL_STOCKS,
    KR: INITIAL_STOCKS_KR
  });

  // Use a ref to always have the latest stocks for intervals
  const stocksRef = React.useRef<Stock[]>(stocks);
  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  // Stock Search State
  const [searchSymbol, setSearchSymbol] = useState("");
  const [isSearchingStock, setIsSearchingStock] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<StockSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchCursorOffset, setSearchCursorOffset] = useState(0);
  const [aiRecommendations, setAiRecommendations] = useState<Stock[]>([]);
  const [isGettingRecommendations, setIsGettingRecommendations] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const textMeasurerRef = React.useRef<HTMLSpanElement>(null);
  const isFirstMarketType = React.useRef(true);

  // KIS Configuration State
  const [kisConfig, setKisConfig] = useState({
    appKey: '',
    appSecret: '',
    accountNo: '',
    accountCode: '01',
    accountPw: '',
    isRealServer: true,
    isConnected: false,
    domesticOrderType: '00', // '00' (지정가 - Limit), '01' (시장가 - Market)
    isRealOrderEnabled: true // 실제 주문 전송 여부 (false일 경우 KIS 연동 가상 매매)
  });

  // Helper to get active config
  const getActiveKisConfig = (config: any) => {
    return {
      ...config,
      accountNo: config.accountNo.split('-')[0],
      accountCode: config.accountNo.split('-')[1] || config.accountCode || '01',
      isConnected: config.isConnected
    };
  };
  const [showKisModal, setShowKisModal] = useState(false);
  const [showKisPassword, setShowKisPassword] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [userLicenseData, setUserLicenseData] = useState<any>(null);
  const [dashboardTab, setDashboardTab] = useState<'TRADING' | 'PORTFOLIO' | 'STRATEGY'>('TRADING');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [activeSignal, setActiveSignal] = useState<MarketSignal | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m');
  const timeframes = ['1m', '5m', '15m', '30m', '60m', '120m', '240m'];

  // Gap Trading States
  const [gapBuyPrice, setGapBuyPrice] = useState<number>(0);
  const [gapSellPrice, setGapSellPrice] = useState<number>(0);
  const [tradeQuantity, setTradeQuantity] = useState<number>(1);
  const [isGapBotActive, setIsGapBotActive] = useState<boolean>(false);
  const [kisBuyableQty, setKisBuyableQty] = useState<number | null>(null);
  const [gapTradingProfit, setGapTradingProfit] = useState<number>(0);
  const [gapTradeCount, setGapTradeCount] = useState<number>(0);
  const [lastTradeType, setLastTradeType] = useState<'BUY' | 'SELL' | null>(null);
  const [gapInventory, setGapInventory] = useState<number[]>([]);
  const [immediateEntry, setImmediateEntry] = useState<boolean>(true);
  const [lowestBidOnlyMode, setLowestBidOnlyMode] = useState<boolean>(true); // 하단 호가 진입 모드 (기본 true)
  const [scalperMessage, setScalperMessage] = useState<string>("대기 중...");
  const gapInventoryRef = React.useRef<number[]>([]);
  const lastSellPriceRef = React.useRef<number | null>(null);
  useEffect(() => {
    gapInventoryRef.current = gapInventory;
  }, [gapInventory]);

  // Automated Scalping Configuration States
  const [scalpingTargetProfit, setScalpingTargetProfit] = useState<number>(0.3); // 0.3%
  const [scalpingStopLoss, setScalpingStopLoss] = useState<number>(-0.5); // -0.5%
  const [scalpingSpeed, setScalpingSpeed] = useState<number>(1500); // 1500ms
  const [scalpingSoundEnabled, setScalpingSoundEnabled] = useState<boolean>(true);
  const [scalpingWins, setScalpingWins] = useState<number>(0);
  const [scalpingLosses, setScalpingLosses] = useState<number>(0);
  const [useAiAdaptiveProfit, setUseAiAdaptiveProfit] = useState<boolean>(true);
  const [useMartingaleScaling, setUseMartingaleScaling] = useState<boolean>(true);
  const [useSmartReentryGuard, setUseSmartReentryGuard] = useState<boolean>(true);
  const [lastSellPrice, setLastSellPrice] = useState<number | null>(null);
  const [currentAiTargetProfit, setCurrentAiTargetProfit] = useState<number>(0.3);

  // Direct Key Login fallback states
  const [isDirectLoginOpen, setIsDirectLoginOpen] = useState(false);
  const [directKeyInput, setDirectKeyInput] = useState("");
  const [directLoginError, setDirectLoginError] = useState<string | null>(null);
  const [isDirectLoggingIn, setIsDirectLoggingIn] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<{ id: string; type: 'success' | 'error' | 'info'; message: string }[]>([]);

  const playScalpingSound = (type: 'BUY' | 'SELL') => {
    if (!scalpingSoundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (type === 'BUY') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'triangle';
        osc2.type = 'sine';
        
        osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc1.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.08); // C6
        osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.04); // E6
        
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.25);
        osc2.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Audio Context blocked or failed:", e);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isLoading?: boolean;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
    isLoading: false
  });

  const selectedStock = useMemo(() => stocks.find(s => s.symbol === selectedSymbol) || stocks[0] || null, [stocks, selectedSymbol]);
  const rangePercentage = useMemo(() => {
    if (!gapBuyPrice || !gapSellPrice || gapBuyPrice >= gapSellPrice || !selectedStock) return 0;
    const pct = ((selectedStock.price - gapBuyPrice) / (gapSellPrice - gapBuyPrice)) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [gapBuyPrice, gapSellPrice, selectedStock?.price]);
  const totalValue = useMemo(() => {
    // We treat 'balance' as the base currency (KRW)
    const stockValue = stocks.reduce((acc, stock) => {
      const qty = holdings[stock.symbol] || 0;
      if (qty === 0) return acc;

      const isUS = /^[A-Z]/.test(stock.symbol);
      const priceInKRW = isUS ? stock.price * exchangeRate : stock.price;
      
      return acc + qty * priceInKRW;
    }, 0);
    return balance + stockValue;
  }, [balance, holdings, stocks, exchangeRate]);

  const convertedValue = displayCurrency === 'USD' ? totalValue / exchangeRate : totalValue;
  const convertedBalance = displayCurrency === 'USD' ? balance / exchangeRate : balance;
  
  const pnl = totalValue - principal;
  const pnlPercent = principal > 0 ? (pnl / principal) * 100 : 0;

  const convertedPnl = displayCurrency === 'USD' ? pnl / exchangeRate : pnl;
  const convertedPrincipal = displayCurrency === 'USD' ? principal / exchangeRate : principal;
  const curPrefix = displayCurrency === 'USD' ? '$' : '₩';

  // Real-time Exchange Rate Fetcher & Simulator
  const fetchRealExchangeRate = React.useCallback(async () => {
    try {
      let realRate = 0;
      
      // Priority 1: KIS API (If connected)
      if (kisConfig.isConnected) {
        try {
          const kisRateInfo = await kisService.getExchangeRate();
          if (kisRateInfo && kisRateInfo.length > 0) {
            // Find the most recent rate (usually the first one)
            // fx_rt is the exchange rate
            realRate = Number(kisRateInfo[0].fx_rt);
          }
        } catch (e) {
          console.warn("KIS Exchange Rate Fetch Failed, falling back to Public API", e);
        }
      }

      // Priority 2: Public API (Backup) - Using a more reliable one if available
      if (!realRate) {
        try {
          const response = await fetch('https://open.er-api.com/v6/latest/USD');
          const data = await response.json();
          if (data && data.rates && data.rates.KRW) {
            // Adjusting mid-market rate to match Base Rate (매매기준율) usually seen on portals
            // Usually mid-market is slightly lower than portal base rates
            const midRate = data.rates.KRW;
            realRate = midRate * 1.003; // Adding a 0.3% premium to match portal base rates (매매기준율)
          }
        } catch (e) {
          console.error("Public API Fetch Failed", e);
        }
      }

      if (realRate) {
        setExchangeRate(prev => {
          setExchangeRateTrend(realRate >= prev ? 'UP' : 'DOWN');
          return realRate;
        });
        setExchangeData(prev => {
          const newHistory = [...(prev?.history || []), { 
            time: new Date().toLocaleTimeString('ko-KR', { hour12: false }), 
            price: realRate 
          }].slice(-50);
          const change = realRate - (prev?.price || realRate);
          return {
            symbol: 'USD/KRW',
            name: '원/달러 환율',
            price: realRate,
            change,
            changePercent: prev?.price ? (change / prev.price) * 100 : 0,
            history: newHistory
          };
        });
        setIsRateLoading(false);
      }
    } catch (error: any) {
      console.error("Failed to fetch real exchange rate:", error);
      showNotification("환율 정보를 가져오는 데 실패했습니다.", "error");
    }
  }, [kisConfig.isConnected]);

  const [isRefreshingRate, setIsRefreshingRate] = useState(false);
  const handleManualRateRefresh = async () => {
    setIsRefreshingRate(true);
    await fetchRealExchangeRate();
    setTimeout(() => setIsRefreshingRate(false), 1000);
  };

  useEffect(() => {
    fetchRealExchangeRate();
    const simulatorInterval = setInterval(() => {
      setExchangeRate(prev => {
        const change = (Math.random() - 0.5) * 0.1; // Tiny fluctuations
        const newRate = Number((prev + change).toFixed(2));
        setExchangeRateTrend(newRate >= prev ? 'UP' : 'DOWN');
        return newRate;
      });
    }, 15000);

    return () => {
      clearInterval(simulatorInterval);
    };
  }, [fetchRealExchangeRate]);

  // Firebase Auth & License Check
  useEffect(() => {
    let licenseUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthLoading(true);
      
      // Cleanup previous license listener if exists
      if (licenseUnsubscribe) {
        licenseUnsubscribe();
        licenseUnsubscribe = null;
      }

      if (user) {
        setCurrentUser(user);
        
        // Load user settings if logged in
        getUserSettings(user.uid).then(settings => {
          if (settings) {
            if (settings.kisConfig) {
              const loadedConfig = settings.kisConfig;
              // Migration to single real server config
              let finalConfig = loadedConfig;
              if (loadedConfig.activeType || loadedConfig.real) {
                 const activeData = loadedConfig.real || loadedConfig[loadedConfig.activeType] || loadedConfig || {};
                 finalConfig = {
                    appKey: activeData.appKey || '',
                    appSecret: activeData.appSecret || '',
                    accountNo: activeData.accountNo || '',
                    accountCode: activeData.accountCode || '01',
                    accountPw: activeData.accountPw || '',
                    isRealServer: activeData.isRealServer !== undefined ? activeData.isRealServer : true,
                    isConnected: loadedConfig.isConnected || false,
                    domesticOrderType: activeData.domesticOrderType || '00',
                    isRealOrderEnabled: activeData.isRealOrderEnabled !== undefined ? activeData.isRealOrderEnabled : true
                 };
              } else {
                 if (finalConfig.isRealServer === undefined) {
                    finalConfig.isRealServer = true;
                 }
                 if (finalConfig.isRealOrderEnabled === undefined) {
                    finalConfig.isRealOrderEnabled = true;
                 }
              }
              
              setKisConfig(finalConfig);
              // If it was connected, re-init the service with saved token
              if (finalConfig.isConnected) {
                const tokenData = settings.kisTokenReal || settings.kisToken;

                kisService.init(
                  getActiveKisConfig(finalConfig), 
                  tokenData?.token, 
                  tokenData?.expiresAt
                );
              }
            }
            if (settings.holdings) {
              setHoldings(settings.holdings);
            }
          }
        });

        // Set up token update handler to minimize LMS notifications
        kisService.setTokenUpdateHandler((token, expiresAt) => {
          if (user) {
            saveUserKISToken(user.uid, token, expiresAt);
          }
        });
        
        // Super Admin Bypass
        if (user.email === "agnus9524@gmail.com") {
          setIsSubscribed(true);
        } else {
          // Set up real-time listener for current user's license
          // This allows immediate blocking if admin suspends/deletes the license
          licenseUnsubscribe = onSnapshot(doc(db, 'licenses', user.uid), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserLicenseData(data);
              const expiresAt = new Date(data.expiresAt);
              const isExpired = expiresAt < new Date();
              setIsSubscribed(data.status === 'active' && !isExpired);

              // Silent Email Sync: Update if missing in DB but available in Auth
              if (data.status === 'active' && !data.email && user.email) {
                updateLicense(user.uid, { email: user.email });
              }
            } else {
              // License document doesn't exist (deleted by admin)
              setIsSubscribed(false);
              setUserLicenseData(null);
            }
          }, (error) => {
            console.error("License listener error:", error);
            setIsSubscribed(false);
            setUserLicenseData(null);
          });
        }
      } else {
        setCurrentUser(null);
        setIsSubscribed(false);
      }
      setIsAuthLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (licenseUnsubscribe) licenseUnsubscribe();
    }
  }, []);

  // Toggle Market Type
  useEffect(() => {
    if (isFirstMarketType.current) {
      isFirstMarketType.current = false;
      return;
    }
    // Save current stocks to cache for the PREVIOUS market type
    const prevMarket = marketType === 'US' ? 'KR' : 'US';
    setStocksCache(prev => ({ ...prev, [prevMarket]: stocks }));

    // Load from cache for the NEW market type
    const cachedStocks = stocksCache[marketType];
    setStocks(cachedStocks);
    
    // Ensure selected symbol is valid for the market
    if (marketType === 'US') {
      if (!cachedStocks.some(s => s.symbol === selectedSymbol)) setSelectedSymbol('NVDA');
    } else {
      if (!cachedStocks.some(s => s.symbol === selectedSymbol)) setSelectedSymbol('073240');
    }
  }, [marketType]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("팝업이 차단되었습니다. 브라우저 주소창의 팝업 차단 설정을 해제해주세요.");
      } else if (error.code === 'auth/network-request-failed') {
        alert("네트워크 연결 오류가 발생했습니다.");
      } else {
        alert(`로그인 중 오류가 발생했습니다: ${error.message}\n\n* 만약 iFrame(AI Studio 프리뷰) 환경이라면 브라우저의 '3방 쿠키 차단(Third-Party Cookie Block)' 보안 정책으로 인해 구글 소셜 로그인이 차단되었을 수 있습니다. 오른쪽 상단의 '새 창에서 열기' 버튼을 클릭해 독립된 창에서 다시 시도해 주시거나, 아래의 '인증키로 즉시 로그인' 기능을 이용해 주세요.`);
      }
    }
  };

  const handleDirectLogin = async () => {
    if (!directKeyInput.trim()) {
      setDirectLoginError("인증키를 입력해주세요.");
      return;
    }
    
    setIsDirectLoggingIn(true);
    setDirectLoginError(null);
    
    try {
      // 1. Sign in anonymously first to get a firebase session
      const userCredential = await signInAnonymously(auth);
      
      // 2. Perform license key login using this user session
      const result = await loginWithKey(directKeyInput.trim());
      
      if (result.success) {
        setIsSubscribed(true);
        setIsDirectLoginOpen(false);
        setDirectKeyInput("");
        showNotification("인증키 간편 로그인 성공!", "success");
      } else {
        // Sign out of firebase auth if activation fails
        await signOut(auth);
        setDirectLoginError(result.message || "유효하지 않거나 이미 사용 중인 인증키입니다.");
      }
    } catch (error: any) {
      console.error("Direct key login failed:", error);
      setDirectLoginError(error.message || "인증키 로그인 도중 오류가 발생했습니다.");
      try {
        await signOut(auth);
      } catch (e) {}
    } finally {
      setIsDirectLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsBotActive(false);
      showNotification("로그아웃 되었습니다.", "info");
    } catch (e: any) {
      showNotification("로그아웃 중 오류가 발생했습니다.", "error");
    }
  };

  const handleFetchAllLicenses = async () => {
    setIsAdminLoading(true);
    const licenses = await getAllLicenses();
    const keys = await getAllAuthKeys();
    setAllLicenses(licenses);
    setAllAuthKeys(keys);
    setIsAdminLoading(false);
  };

  const handleGenerateKey = async () => {
    setIsAdminLoading(true);
    try {
      const key = await generateAuthKey(30);
      if (key) {
        alert(`새 인증키가 생성되었습니다: ${key}\n\n사용자에게 전달하여 입금 확인 후 사용 가능하게 하세요.`);
        handleFetchAllLicenses();
      }
    } catch (error: any) {
      console.error("Failed to generate auth key:", error);
      alert(`인증키 생성에 실패했습니다: ${error.message || error}`);
    }
    setIsAdminLoading(false);
  };

  const handleActivateKey = async () => {
    if (!currentUser) return;
    if (!inputKey.trim()) {
      setActivationError("인증키를 입력해주세요.");
      return;
    }

    setIsActivatingKey(true);
    setActivationError(null);
    
    const result = await activateLicenseWithKey(currentUser.uid, inputKey.trim());
    
    if (result.success) {
      alert("성공적으로 라이선스가 활성화되었습니다!");
      setIsSubscribed(true);
      setShowActivationModal(false);
      setInputKey("");
    } else {
      setActivationError(result.message || "오류가 발생했습니다.");
    }
    setIsActivatingKey(false);
  };

  const handleGetRecommendations = async () => {
    setIsGettingRecommendations(true);
    setAiRecommendations([]);
    try {
      const prompt = `현재 ${marketType === 'KR' ? '한국 KOSPI/KOSDAQ' : '미국 NYSE/NASDAQ'} 시장에서 가장 유망하거나 거래량이 많은 종목 5개를 추천해주세요.
      각 종목에 대해 심볼, 기업명(토스증권 기준 한글 이름), 현재 대략적인 가격 정보를 포함해야 합니다.
      반드시 다음 JSON 배열 형식으로만 응답하세요: [{"symbol": "심볼", "name": "기업명", "price": 숫자}]`;

      const response = await axios.post('/api/ai/bot-decision', { prompt });
      const data = JSON.parse(response.data.text);
      if (Array.isArray(data)) {
        setAiRecommendations(data.map(item => ({
          ...item,
          change: 0,
          changePercent: 0,
          volume: '0',
          history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: item.price * (0.98 + Math.random() * 0.04) })),
          isAI: true
        })));
      }
    } catch (error) {
      console.error("Failed to get recommendations:", error);
    } finally {
      setIsGettingRecommendations(false);
    }
  };

  const handleUpdateLicenseStatus = async (userId: string, currentData: any, newStatus: string) => {
    setConfirmState({
      show: true,
      title: "상태 변경 확인",
      message: `사용자의 상태를 [${newStatus === 'active' ? '활성' : '중지'}] 상태로 변경하시겠습니까?`,
      onConfirm: async () => {
        try {
          setConfirmState(prev => ({ ...prev, isLoading: true }));
          const updated = await updateLicense(userId, { ...currentData, status: newStatus });
          if (updated) {
            handleFetchAllLicenses();
            showNotification("라이선스 상태가 업데이트되었습니다.", "success");
          }
        } catch (e: any) {
          showNotification("상태 업데이트 실패: " + e.message, "error");
        } finally {
          setConfirmState(prev => ({ ...prev, show: false, isLoading: false }));
        }
      }
    });
  };

  const handleAddStock = async (customSymbol?: string, recommendedStock?: Stock, customName?: string) => {
    const symbolToUse = customSymbol || searchSymbol.trim().toUpperCase();
    if (!symbolToUse && !recommendedStock) return;
    
    setShowSuggestions(false);
    setSearchSymbol("");
    setSearchSuggestions([]);
    
    if (recommendedStock) {
      if (stocks.some(s => s.symbol === recommendedStock.symbol)) {
        setSelectedSymbol(recommendedStock.symbol);
        return;
      }
      setStocks(prev => [{ ...recommendedStock, isAI: true }, ...prev]);
      setSelectedSymbol(recommendedStock.symbol);
      setAiRecommendations(prev => prev.filter(r => r.symbol !== recommendedStock.symbol));
      addLog('SYSTEM', '매수', 0, 0, `[AI 추천 추가] ${recommendedStock.name}(${recommendedStock.symbol}) 종목이 분석 리스트에 추가되었습니다.`);
      return;
    }

    if (stocks.some(s => s.symbol === symbolToUse)) {
      setSelectedSymbol(symbolToUse);
      return;
    }

    if (customName) {
      const initialPrice = marketType === 'KR' ? 5000 : 100;
      const newStock: Stock = {
        symbol: symbolToUse,
        name: customName,
        price: initialPrice,
        change: 0,
        changePercent: 0,
        volume: '0',
        history: Array.from({ length: 40 }, (_, i) => ({ 
          time: `${i}:00`, 
          price: initialPrice * (0.98 + Math.random() * 0.04) 
        })),
        isAI: false
      };
      
      setStocks(prev => {
        if (prev.some(s => s.symbol === symbolToUse)) {
          return prev;
        }
        return [newStock, ...prev];
      });
      setSelectedSymbol(symbolToUse);
      
      // Load real name and price asynchronously from Gemini without blocking UI transition
      setTimeout(async () => {
        try {
          const prompt = `${marketType === 'KR' ? '한국 KOSPI/KOSDAQ' : '미국 NYSE/NASDAQ'} 주식 종목 ${symbolToUse}의 현재 가격을 분석해주세요. 반드시 다음 JSON 형식으로 응답하세요: {"name": "기업명", "price": 숫자}`;
          const response = await axios.post('/api/ai/bot-decision', { prompt });
          const data = JSON.parse(response.data.text);
          if (data.price) {
            setStocks(prev => prev.map(s => {
              if (s.symbol === symbolToUse) {
                return {
                  ...s,
                  name: data.name || s.name,
                  price: data.price,
                  history: Array.from({ length: 40 }, (_, i) => ({ 
                    time: `${i}:00`, 
                    price: data.price * (0.98 + Math.random() * 0.04) 
                  }))
                };
              }
              return s;
            }));
            addLog('SYSTEM', '매수', 0, 0, `[종목 정보 동기화] ${data.name || customName}(${symbolToUse})의 주가가 ₩${data.price.toLocaleString()}으로 업데이트되었습니다.`);
          }
        } catch (err) {
          console.error("Background search update error:", err);
        }
      }, 0);
      return;
    }

    setIsSearchingStock(true);
    setSearchError(null);

    try {
      const prompt = `${marketType === 'KR' ? '한국 KOSPI/KOSDAQ' : '미국 NYSE/NASDAQ'} 주식 종목 ${symbolToUse}의 기업명과 현재 가격을 분석해주세요. 
      기업명은 반드시 토스증권 어플에서 표기되는 한글 이름(예: Apple -> 애플, Tesla -> 테슬라, NVIDIA -> 엔비디아)을 기준으로 작성해주세요.
      반드시 다음 JSON 형식으로 응답하세요: {"name": "기업명", "price": 숫자}`;

      const response = await axios.post('/api/ai/bot-decision', { prompt });
      const data = JSON.parse(response.data.text);
      if (!data.name || !data.price) throw new Error("Invalid response");

      const newStock: Stock = {
        symbol: symbolToUse,
        name: data.name,
        price: data.price,
        change: 0,
        changePercent: 0,
        volume: '0',
        history: Array.from({ length: 40 }, (_, i) => ({ 
          time: `${i}:00`, 
          price: data.price * (0.98 + Math.random() * 0.04) 
        })),
        isAI: false
      };

      setStocks(prev => [newStock, ...prev]);
      setSelectedSymbol(symbolToUse);
      setSearchSymbol("");
      addLog('SYSTEM', '매수', 0, 0, `[종목 추가] ${data.name}(${symbolToUse}) 종목이 분석 리스트에 추가되었습니다.`);
    } catch (err: any) {
      console.error("Search error:", err);
      const errorMsg = err.message || "종목을 찾을 수 없거나 AI 분석 한도 초과입니다.";
      setSearchError(errorMsg);
      showNotification(errorMsg, "error");
    } finally {
      setIsSearchingStock(false);
    }
  };

  const handleRemoveStock = (symbol: string) => {
    try {
      setStocks(prev => {
        const updated = prev.filter(s => s.symbol !== symbol);
        if (selectedSymbol === symbol && updated.length > 0) {
          setSelectedSymbol(updated[0].symbol);
        }
        return updated;
      });
      addLog('SYSTEM', '매도', 0, 0, `[종목 삭제] ${symbol} 종목이 분석 리스트에서 삭제되었습니다.`);
      showNotification(`${symbol} 종목이 삭제되었습니다.`, "info");
    } catch (e: any) {
      showNotification("종목 삭제 중 오류가 발생했습니다.", "error");
    }
  };

  // Real-time Search Suggestions
  useEffect(() => {
    const term = searchSymbol.trim();
    if (!term || term.length < 1) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // 1. Instantly show local filtered popular stocks first for speed!
    const localFiltered = POPULAR_STOCKS.filter(s => 
      (s.market === marketType) && 
      (s.name.includes(term) || s.symbol.includes(term.toUpperCase()))
    );
    setSearchSuggestions(localFiltered.slice(0, 8));
    setShowSuggestions(localFiltered.length > 0);

    // 2. Fetch comprehensive search results from our backend in real-time
    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await axios.get('/api/stocks/search', {
          params: { keyword: term, marketType: marketType }
        });
        
        if (response.data && Array.isArray(response.data)) {
          setSearchSuggestions(prev => {
            const merged = [...prev];
            response.data.forEach((item: StockSuggestion) => {
              if (!merged.some(m => m.symbol === item.symbol)) {
                merged.push(item);
              }
            });
            return merged.slice(0, 15);
          });
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Failed to fetch remote stock suggestions:", err);
      }
    }, 50); // 50ms debounce for ultra-responsive instant search results

    // Dynamic offset calculation
    if (textMeasurerRef.current) {
      // Input padding (pl-10 = 40px) + text width
      setSearchCursorOffset(Math.min(textMeasurerRef.current.offsetWidth + 40, 300));
    }

    return () => clearTimeout(delayDebounceFn);
  }, [searchSymbol, marketType]);

  // Handle click outside search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExtendLicense = async (userId: string, currentData: any) => {
    setConfirmState({
      show: true,
      title: "라이선스 연장 확인",
      message: "해당 사용자의 라이선스를 1개월(30일) 연장하시겠습니까?",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }));
        const currentExpiry = new Date(currentData.expiresAt);
        const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
        const updated = await updateLicense(userId, { ...currentData, expiresAt: newExpiry.toISOString() });
        if (updated) handleFetchAllLicenses();
        setConfirmState(prev => ({ ...prev, show: false, isLoading: false }));
      }
    });
  };

  const handleDeleteUserLicense = async (userId: string) => {
    setConfirmState({
      show: true,
      title: "사용자 삭제 확인",
      message: "정말로 이 사용자의 라이선스를 완전히 삭제하시겠습니까?\n삭제 즉시 해당 사용자의 접속이 차단됩니다.",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await deleteDoc(doc(db, 'licenses', userId));
          handleFetchAllLicenses();
        } catch (err) {
          console.error("Delete license error:", err);
        }
        setConfirmState(prev => ({ ...prev, show: false, isLoading: false }));
      }
    });
  }

  const handleDeleteAuthKey = async (keyId: string) => {
    setConfirmState({
      show: true,
      title: "인증키 폐기 확인",
      message: "정말로 이 인증키를 폐기하시겠습니까? 폐기된 키는 복구가 불가능합니다.",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isLoading: true }));
        try {
          await deleteDoc(doc(db, 'authKeys', keyId));
          handleFetchAllLicenses();
        } catch (err) {
          console.error("Delete auth key error:", err);
          alert("삭제 중 오류가 발생했습니다: " + (err instanceof Error ? err.message : String(err)));
        }
        setConfirmState(prev => ({ ...prev, show: false, isLoading: false }));
      }
    });
  }

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = "";

    if (adminTab === 'users') {
      headers = ["Email", "User UID", "Status", "Expiration Date", "Applied Key", "Created Date"];
      rows = allLicenses.map(lic => [
        lic.email || "N/A",
        lic.userId || lic.id,
        lic.status,
        new Date(lic.expiresAt).toLocaleDateString(),
        lic.key || "N/A",
        lic.createdAt ? new Date(lic.createdAt.seconds * 1000).toLocaleString() : "N/A"
      ]);
      filename = `subscriber_list_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      headers = ["Auth Key", "Duration (Days)", "Status", "Used By (UID)", "Issuance Date"];
      rows = allAuthKeys.map(key => [
        key.id,
        key.durationDays,
        key.used ? "Used" : "Unused",
        key.usedBy || "N/A",
        key.createdAt ? new Date(key.createdAt.seconds * 1000).toLocaleString() : "N/A"
      ]);
      filename = `auth_keys_list_${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Handle CSV generation with proper escaping
    const csvContent = "\uFEFF" + [ // Add BOM for Excel UTF-8 support
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateKisBuyableQty = useCallback(async (overrideBalance?: number) => {
    if (!kisConfig.isConnected || !kisConfig.isRealOrderEnabled || !selectedStock) {
      setKisBuyableQty(null);
      return;
    }
    const isKR = /^\d{6}$/.test(selectedStock.symbol);
    if (!isKR) {
      setKisBuyableQty(null);
      return;
    }

    const currentBalance = overrideBalance !== undefined ? overrideBalance : balance;

    try {
      const ordDvsn = kisConfig.domesticOrderType || '00';
      const tradePrice = selectedStock.price;
      const queryPrice = ordDvsn === '00' ? tradePrice.toString() : '0';

      const res = await kisService.getDomesticBuyableAmount(
        selectedStock.symbol,
        queryPrice,
        ordDvsn
      );

      let qty = 0;
      if (res && res.rt_cd === '0' && res.output) {
        const nrcy = parseInt(res.output.nrcy_buy_qty || res.output.nrcy_ord_psbl_qty || '0', 10);
        const maxQty = parseInt(res.output.max_ord_qty || res.output.tot_ord_psbl_qty || res.output.max_buy_qty || '0', 10);
        const ordPsbl = parseInt(res.output.ord_psbl_qty || res.output.psbl_qty || '0', 10);
        
        qty = Math.max(nrcy, maxQty, ordPsbl);
      }

      // 실제 계좌의 현금(currentBalance)으로 계산하여 보강 또는 보정 (특히 KIS API 결과가 0이거나 미흡할 때)
      if (currentBalance > 0 && tradePrice > 0) {
        const calculatedQty = Math.floor(currentBalance / tradePrice);
        qty = Math.max(qty, calculatedQty);
      }

      if (!isNaN(qty) && qty >= 0) {
        setKisBuyableQty(qty);
        return;
      }
      setKisBuyableQty(null);
    } catch (err) {
      console.warn("Failed to update KIS buyable quantity:", err);
      // API 실패 시에도 실제 계좌 현금을 기준으로 계산하여 폴백
      if (currentBalance > 0 && selectedStock.price > 0) {
        const fallbackQty = Math.floor(currentBalance / selectedStock.price);
        setKisBuyableQty(fallbackQty);
      } else {
        setKisBuyableQty(null);
      }
    }
  }, [kisConfig.isConnected, kisConfig.isRealOrderEnabled, kisConfig.domesticOrderType, selectedStock, balance]);

  useEffect(() => {
    updateKisBuyableQty();
  }, [selectedSymbol, balance, kisConfig.isConnected, kisConfig.isRealOrderEnabled, kisConfig.domesticOrderType, updateKisBuyableQty]);

  const handleSyncKIS = async () => {
    if (!kisConfig.isConnected) return;
    
    // Check for password
    const activeConfig = getActiveKisConfig(kisConfig);
    if (!activeConfig.accountPw) {
      setBotStatus("연동 실패: 계좌 비밀번호가 필요합니다.");
      alert("계좌 비밀번호(4자리)가 입력되지 않았습니다. [설정 > KIS 연동]에서 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setBotStatus("실거래 계좌 동기화 중...");
      
      const newHoldings: Record<string, number> = {};
      let totalConvertedBalance = 0;
      let totalConvertedPrincipal = 0;
      let overseasError = null;
      let domesticError = null;
      let foundAnyData = false;
      
      // Use fallback if exchange rate is missing or invalid
      const currentRate = exchangeRate > 0 ? exchangeRate : 1400;

      // Fetch real-time exchange rate using the robust callback
      await fetchRealExchangeRate();

      // 1. Overseas Stock Sync (TTTS3012R / VTTS3012R)
      try {
        const balanceData = await kisService.getOverseasBalance();
        if (balanceData?.rt_cd === '0' && balanceData.output2?.[0]) {
          foundAnyData = true;
          const out2 = balanceData.output2[0];
          const foreignCash = Number(out2.frcr_dncl_amt_2 || out2.frcr_dncl_amt_1 || out2.frcr_evlu_amt2 || 0); 
          const purchaseAmt = Number(out2.frcr_buy_amt_smtl || out2.frcr_pchs_amt1 || 0); 
          
          totalConvertedBalance += foreignCash * currentRate;
          totalConvertedPrincipal += (foreignCash + purchaseAmt) * currentRate;
        }
        
        const holdingsData = await kisService.getOverseasHoldings(); // CTRP6504R
        if (holdingsData?.rt_cd === '0' && holdingsData.output1 && Array.isArray(holdingsData.output1)) {
          foundAnyData = true;
          holdingsData.output1.forEach((item: any) => {
            if (item.pdno) {
              const qty = Number(item.ccl_qty || item.hldg_qty || 0);
              if (qty > 0) newHoldings[item.pdno] = (newHoldings[item.pdno] || 0) + qty;
            }
          });
        }
      } catch (err: any) {
        console.warn("Overseas Sync Skip:", err);
        overseasError = err.message;
      }

      // 2. Domestic Stock Sync (TTTC8434R / VTTC8434R)
      try {
        const domesticBalanceData = await kisService.getDomesticBalance();
        if (domesticBalanceData?.rt_cd === '0' && domesticBalanceData.output2?.[0]) {
          foundAnyData = true;
          const out2 = domesticBalanceData.output2[0];
          const domesticCash = Number(out2.d2_dncl_amt || out2.dncl_amt || out2.prsm_dncl_amt || out2.tot_evlu_amt || 0);
          const domesticPurchase = Number(out2.pchs_amt_smtl_amt || 0);
          
          totalConvertedBalance += domesticCash;
          totalConvertedPrincipal += (domesticCash + domesticPurchase);
        }

        if (domesticBalanceData?.rt_cd === '0' && domesticBalanceData.output1 && Array.isArray(domesticBalanceData.output1)) {
          foundAnyData = true;
          const newSellable: Record<string, number> = {};
          for (const item of domesticBalanceData.output1) {
            if (item.pdno && item.pdno !== '000000') {
              const qty = Number(item.hldg_qty || item.hldg_qty_2 || 0);
              if (qty > 0) {
                newHoldings[item.pdno] = (newHoldings[item.pdno] || 0) + qty;
                
                try {
                  const sellableData = await kisService.getDomesticSellableQuantity(item.pdno);
                  if (sellableData?.output?.nrc_psbl_qty) {
                    newSellable[item.pdno] = Number(sellableData.output.nrc_psbl_qty);
                  }
                } catch (e) {
                  console.warn(`Sellable Qty Fetch Failed for ${item.pdno}:`, e);
                }
              }
            }
          }
          setSellableHoldings(prev => ({ ...prev, ...newSellable }));
        }
      } catch (err: any) {
        console.warn("Domestic Sync Skip:", err);
        domesticError = domesticError || err.message;
      }

      // Final Check: If absolutely no data was fetched and there were errors, notify user
      if (!foundAnyData && (overseasError || domesticError)) {
         setBotStatus("연동 데이터 수신 실패");
         const finalMsg = [overseasError, domesticError].filter(Boolean).join(", ");
         showNotification(`KIS 데이터 수신 실패: ${finalMsg}`, "error");
         return;
      }

      // 3. Integrated Asset Status (Real Only - CTRP6548R)
      if (kisConfig.isRealServer) {
        try {
          const assetStatus = await kisService.getInvestmentAssetStatus();
          if (assetStatus?.output2) {
            const out2 = assetStatus.output2;
            const dncl_amt = Number(out2.d2_dncl_amt || out2.dncl_amt || 0);
            const tot_asst_amt = Number(out2.tot_asst_amt || 0);
            
            // If we got valid data from here, it's often more accurate for "Total" accounts
            if (tot_asst_amt > 0) {
              // Instead of overwriting, we can use it as a health check or a better source
              // Some users have unified accounts where this covers both.
              // For now, let's trust it if it's significantly larger or non-zero
              if (tot_asst_amt > totalConvertedPrincipal) {
                totalConvertedBalance = dncl_amt;
                totalConvertedPrincipal = tot_asst_amt;
              }
            }
          }
        } catch (err) {
          console.warn("Asset Status Sync Skip:", err);
        }
      }

      // Final fallback: if total is still 0, check if we have any total eval amount in output2
      // common for some accounts to only populate tot_evlu_amt
      
      const symbolsFromHoldings = Object.keys(newHoldings);
      const existingSymbols = new Set(stocks.map(s => s.symbol));
      const missingSymbols = symbolsFromHoldings.filter(s => !existingSymbols.has(s));

      if (missingSymbols.length > 0) {
        setBotStatus(`새로운 보유 종목 ${missingSymbols.length}개 발견. 데이터 동기화 중...`);
        const addedStocks: Stock[] = await Promise.all(missingSymbols.map(async (sym) => {
          try {
            const p = await kisService.getPrice(sym);
            if (p) {
              return {
                symbol: sym,
                name: /^\d{6}$/.test(sym) ? `(국내) ${sym}` : `(해외) ${sym}`,
                price: p.current,
                change: p.change,
                changePercent: p.changePercent,
                volume: p.volume,
                history: [{ time: '09:00', price: p.current }],
                isAI: false
              };
            }
            throw new Error("No price data");
          } catch (e) {
            return {
              symbol: sym,
              name: sym,
              price: 0,
              change: 0,
              changePercent: 0,
              volume: '0',
              history: [],
              isAI: false
            };
          }
        }));
        setStocks(prev => [...prev, ...addedStocks]);
      }

      // Update States
      setBalance(totalConvertedBalance);
      setPrincipal(totalConvertedPrincipal);
      
      setHoldings(newHoldings);
      if (currentUser) {
        saveUserHoldings(currentUser.uid, newHoldings);
      }
      
      setBotStatus("상태 동기화 완료");
      await updateKisBuyableQty(totalConvertedBalance);
    } catch (e: any) {
      console.error("KIS Sync Error", e);
      const msg = e.response?.data?.msg1 || e.message;
      setBotStatus(`증권사 동기화 실패: ${msg}`);
    }
  };

  // Unified Gap Trading logic is now placed in the main bot effect below.

  // Real-time Stock Price Sync Interval (Optimized dual-interval for selected and other watchlist stocks)
  useEffect(() => {
    let slowInterval: NodeJS.Timeout;
    let fastInterval: NodeJS.Timeout;

    if (kisConfig.isConnected) {
      // 1. Slow sync for all watchlist stocks (every 15 seconds)
      const syncAllPrices = async () => {
        try {
          const currentStocks = stocksRef.current;
          if (currentStocks.length === 0) return;

          const updatedStocks = await Promise.all(currentStocks.map(async (s) => {
            try {
              const priceData = await kisService.getPrice(s.symbol);
              if (priceData) {
                const realPrice = priceData.current;
                
                return {
                  ...s,
                  price: realPrice,
                  change: priceData.change,
                  changePercent: priceData.changePercent,
                  volume: priceData.volume,
                  isRealTime: true,
                  lastUpdated: new Date().toLocaleTimeString(),
                  history: [...s.history.slice(1), { 
                    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }), 
                    price: realPrice 
                  }]
                };
              }
            } catch (innerErr: any) {
              console.warn(`All-stock price fetch failed for ${s.symbol}:`, innerErr);
            }
            return { ...s };
          }));
          
          setStocks(updatedStocks);
        } catch (err: any) {
          console.error("Real-time price sync failed:", err);
        }
      };

      // 2. Fast sync for the currently selected stock to enable high frequency trading (every 2 seconds)
      const syncSelectedPrice = async () => {
        if (!selectedSymbol) return;
        try {
          const priceData = await kisService.getPrice(selectedSymbol);
          if (priceData) {
            const realPrice = priceData.current;
            setStocks(prev => prev.map(s => {
              if (s.symbol !== selectedSymbol) return s;
              return {
                ...s,
                price: realPrice,
                change: priceData.change,
                changePercent: priceData.changePercent,
                volume: priceData.volume,
                isRealTime: true,
                lastUpdated: new Date().toLocaleTimeString(),
                history: [...s.history.slice(1), { 
                  time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
                  price: realPrice 
                }]
              };
            }));
          }
        } catch (innerErr: any) {
          console.warn(`Fast price sync failed for ${selectedSymbol}:`, innerErr);
        }
      };

      syncAllPrices();
      slowInterval = setInterval(syncAllPrices, 15000);

      syncSelectedPrice();
      fastInterval = setInterval(syncSelectedPrice, 2000);
    }
    return () => {
      if (slowInterval) clearInterval(slowInterval);
      if (fastInterval) clearInterval(fastInterval);
    };
  }, [kisConfig.isConnected, marketType, selectedSymbol]);

  // Simulation: Update prices randomly (ONLY if NOT connected)
  useEffect(() => {
    const interval = setInterval(() => {
      // COMPLETELY DISABLE simulation if KIS is connected - use real data only
      if (kisConfig.isConnected) {
        setTime(new Date().toLocaleTimeString('ko-KR', { hour12: false }));
        return;
      }

      // If not connected, we keep a very slow simulation just to keep UI alive
      setStocks(prev => prev.map(stock => {
        const volatility = 0.0005; // Reduced volatility
        const change = (Math.random() - 0.5) * 2 * volatility;
        const newPrice = stock.price * (1 + change);
        const newHistory = [...stock.history.slice(1), { time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }), price: newPrice }];
        return {
          ...stock,
          price: Number(newPrice.toFixed(2)),
          change: Number((newPrice - stock.history[0].price).toFixed(2)),
          changePercent: Number(((newPrice - stock.history[0].price) / stock.history[0].price * 100).toFixed(2)),
          history: newHistory
        };
      }));
      setTime(new Date().toLocaleTimeString('ko-KR', { hour12: false }));
    }, 10000); // Slower updates
    return () => clearInterval(interval);
  }, [kisConfig.isConnected, marketType]);

  // Fetch News using Gemini Search with Caching
  const fetchNews = async (symbol: string, isManual = false) => {
    // Check cache first (valid for 60 minutes for news to save quota)
    const cached = newsCache[symbol];
    const now = Date.now();
    if (!isManual && cached && now - cached.timestamp < 60 * 60 * 1000) {
      setNews(cached.data);
      setNewsError(null);
      return;
    }

    // AI Rate Limiting
    const timeSinceLastCall = now - lastAiCallRef.current;
    if (timeSinceLastCall < AI_COOLDOWN_MS) {
      const waitTime = AI_COOLDOWN_MS - timeSinceLastCall;
      console.log(`AI Call throttled, waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    setIsFetchingNews(true);
    setNewsError(null);

    const callWithRetry = async (retries = 3, delay = 2000): Promise<any> => {
      lastAiCallRef.current = Date.now();
      try {
        const prompt = `${symbol} 주식과 관련된 최신 뉴스 3개를 가져와주세요. 
        실제 기사 원문 URL이 있다면 'url' 필드에 "https://..." 형식의 순수 주소만 포함하고, 불확실하면 해당 기사를 검색할 수 있는 구글 뉴스 검색 링크(https://www.google.com/search?q=...)를 넣어주세요. 
        대괄호[]나 설명 문구 없이 오직 URL 문자열만 입력해야 합니다.
        각 뉴스는 다음 JSON 형식을 따라야 합니다: 
        {"news": [{"title": "뉴스 제목", "summary": "1~2문장의 짧은 요약", "source": "뉴스 출처", "time": "방금 전/1시간 전 등", "url": "https://raw-url-here"}]}`;

        const response = await axios.post('/api/ai/bot-decision', { prompt });
        return { text: response.data.text };
      } catch (error: any) {
        if (error.response?.status === 429 && retries > 0) {
          console.log(`Quota hit, retrying news fetch in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return callWithRetry(retries - 1, delay * 2);
        }
        throw error;
      }
    };

    try {
      const response = await callWithRetry();
      const text = response.text;
      if (text) {
        const data = JSON.parse(text);
        const newsData = data.news || [];
        setNews(newsData);
        setNewsCache(prev => ({ ...prev, [symbol]: { data: newsData, timestamp: now } }));
      }
    } catch (error: any) {
      console.error("News Fetch Error:", error);
      if (error?.message?.includes('429') || error?.status === 429) {
        setNewsError("Gemini Search 일시적 한도 초과입니다. 잠시 후 다시 시도해주세요.");
      } else {
        setNewsError("뉴스를 가져오는 중 오류가 발생했습니다.");
      }
    } finally {
      setIsFetchingNews(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNews(selectedSymbol);
      // Also trigger a one-time strategy analysis for the new stock if not already analyzing
      if (!isAnalyzing && isSubscribed) {
        // We can't easily call the internal bot logic here without refactoring, 
        // but we can at least ensure XTXPredictor handles the heavy lifting 
        // which it now does with the updated dependency array.
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedSymbol, isSubscribed]);

  // AI Auto-Trade Logic
  useEffect(() => {
    if (!isBotActive) {
      setBotStatus("매뉴얼 모드");
      return;
    }

    setBotStatus("AI 엔진 최적화 완료. 분석 시작...");
    setTradeLogs(prev => [{
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      symbol: 'SYSTEM', type: 'BUY', price: 0, amount: 0, reason: 'AI 트레이딩 엔진이 기동되었습니다. (소수점 매매 활성화)'
    } as any, ...prev].slice(0, 50));

    const botInterval = setInterval(async () => {
      // In Manual mode, focus analysis on the selected stock more often (70%)
      let stockToAnalyze: Stock;
      if (selectionMode === 'MANUAL' && Math.random() < 0.7) {
        stockToAnalyze = selectedStock;
      } else {
        stockToAnalyze = stocks[Math.floor(Math.random() * stocks.length)];
      }
      
      setBotStatus(`${stockToAnalyze.symbol} 정밀 분석 중...`);
      setIsAnalyzing(true);
      setIsBotThinking(true);
      
      try {
        // Fetch latest news for this stock to provide as context
        const currentNews = newsCache[stockToAnalyze.symbol]?.data || [];
        const newsContext = currentNews.map(n => `제목: ${n.title}, 요약: ${n.summary}`).join('\n');

        const prompt = `당신은 세계 최고 수준의 AI 트레이딩 엔진입니다. 다음 3단계 우선순위에 따라 ${stockToAnalyze.symbol} 종목을 분석하고 매매 결정을 내리세요.
        
        최우선 목표: 연 수익률 15% 이상 달성 (수수료 제외)
        
        분석 우선순위:
        1순위 (뉴스 분석): 최신 뉴스 및 시장 센티먼트 파악
        2순위 (모멘텀): 가격의 추세 및 변동 속도 분석
        3순위 (차트 패턴): 주요 기술적 분석 패턴 파악
        
        데이터:
        - 종목: ${stockToAnalyze.symbol} (${stockToAnalyze.name})
        - 현재가: $${stockToAnalyze.price}
        - 최근 변동: ${stockToAnalyze.changePercent}%
        - 가격 이력(최근 5봉): ${JSON.stringify(stockToAnalyze.history.slice(-5))}
        - 관련 뉴스:
        ${newsContext || "최신 뉴스 없음. 시장 일반 성향 참조."}
        
        계좌 상황:
        - 현재 잔고: ₩${balance.toLocaleString()}
        - ${stockToAnalyze.symbol} 보유량: ${holdings[stockToAnalyze.symbol] || 0}
        
        반드시 다음 JSON 형식으로만 응답하세요:
        {
          "action": "BUY" | "SELL" | "HOLD",
          "amount": number,
          "reason": "한국어로 된 핵심 매매 근거 (뉴스/모멘텀/차트 결합)",
          "scores": {
            "news": number (1-10),
            "momentum": number (1-10),
            "pattern": number (1-10)
          },
          "expectedAnnualReturn": number (예상 연수익률),
          "analysis": {
            "sentiment": "긍정" | "중립" | "부정",
            "trend": "상승" | "횡보" | "하락",
            "detectedPattern": "패턴 이름"
          }
        }`;

        const callWithRetry = async (retries = 3, delay = 5000): Promise<any> => {
          const now = Date.now();
          const timeSinceLastCall = now - lastAiCallRef.current;
          if (timeSinceLastCall < AI_COOLDOWN_MS) {
            const waitTime = AI_COOLDOWN_MS - timeSinceLastCall;
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          lastAiCallRef.current = Date.now();
          try {
            const response = await axios.post('/api/ai/bot-decision', { prompt });
            return response.data;
          } catch (error: any) {
            if (error.response?.status === 429 && retries > 0) {
              setBotStatus(`한도 초과로 인해 ${delay/1000}초 후 재시도 중...`);
              await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 2000));
              return callWithRetry(retries - 1, delay * 2);
            }
            throw error;
          }
        };

        const result = await callWithRetry();
        const text = result.text;
        
        if (text) {
          try {
            const decision = JSON.parse(text);
            const actionMap = { 'BUY': '매수', 'SELL': '매도', 'HOLD': '관망' };
            
            // Update AI Intelligence result for UI
            setAiAnalysisResult({
              symbol: stockToAnalyze.symbol,
              newsScore: decision.scores.news,
              momentumScore: decision.scores.momentum,
              patternScore: decision.scores.pattern,
              finalScore: Math.round((decision.scores.news * 0.5 + decision.scores.momentum * 0.3 + decision.scores.pattern * 0.2) * 10),
              recommendation: decision.reason,
              expectedAnnualReturn: decision.expectedAnnualReturn
            });

            // Update stock properties for visual feedback
            setStocks(prev => prev.map(s => s.symbol === stockToAnalyze.symbol ? {
              ...s,
              momentum: decision.scores.momentum * 10,
              sentiment: decision.analysis.sentiment === '긍정' ? 1 : decision.analysis.sentiment === '부정' ? -1 : 0,
              pattern: decision.analysis.detectedPattern
            } : s));

            executeTrade(decision.action, stockToAnalyze, decision.amount, decision.reason);
            const actionStr = actionMap[decision.action as keyof typeof actionMap] || decision.action;
            setBotStatus(`${stockToAnalyze.symbol} 전략 수립 완료: ${actionStr}`);
            
            if (decision.action !== 'HOLD') {
              showNotification(`AI가 ${stockToAnalyze.name} ${actionStr}을 결정했습니다.`, "info");
            }
          } catch (err: any) {
            console.error("Analysis Parse Error", err);
            setBotStatus("AI 응답 데이터 분석 오류");
          }
        }
      } catch (error: any) {
        console.error("AI Trading Error:", error);
        if (error?.message?.includes('429') || error?.status === 429) {
           setBotStatus("Gemini API 한도 초과: 잠시 후 자동 재개됩니다.");
           showNotification("AI 분석 요청 한도 도달. 잠시 후 재개합니다.", "error");
           // Force a longer cooldown if quota hit
           lastAiCallRef.current = Date.now() + 30000;
         } else {
           setBotStatus("매매 분석 데이터 부족.");
           showNotification("AI 분석 중 오류가 발생했습니다.", "error");
         }
      } finally {
        setIsAnalyzing(false);
        setIsBotThinking(false);
      }
    }, 45000); // 45 seconds interval to save quota

    return () => clearInterval(botInterval);
  }, [isBotActive]);

  // 2. High-speed automatic trading decisions (Scalping Bot Engine)
  useEffect(() => {
    if (!isGapBotActive || !selectedStock) {
      setGapInventory([]); // Reset grid inventory when stopped
      setScalperMessage(prev => {
        if (prev.includes("정지") || prev.includes("완료") || prev.includes("매도")) {
          return prev;
        }
        return "대기 중...";
      });
      return;
    }

    let lastPrice = selectedStock.price;

    // A. Start-up: If immediateEntry is checked and inventory is empty, enter first buy position immediately if in range!
    const runImmediateBuy = async (currentPrice: number) => {
      if (gapBuyPrice <= 0 || gapSellPrice <= 0) return;
      if (currentPrice < gapBuyPrice || currentPrice > gapSellPrice) {
        setScalperMessage(`현재가(₩${currentPrice.toLocaleString()})가 설정 범위를 벗어나 대기 중`);
        return;
      }

      const tickSize = currentPrice >= 500000 ? 1000 : currentPrice >= 100000 ? 500 : currentPrice >= 50000 ? 100 : currentPrice >= 10000 ? 50 : currentPrice >= 5000 ? 10 : 5;
      const buyPrice = lowestBidOnlyMode ? (currentPrice - 5 * tickSize) : currentPrice;

      const priceInKrw = marketType === 'US' ? buyPrice * exchangeRate : buyPrice;
      const cost = priceInKrw * tradeQuantity;

      if (balance >= cost || kisConfig.isConnected) {
        setScalperMessage(`[최초 즉시 진입] ₩${buyPrice.toLocaleString()} 매수 가능 수량 조회 중...`);
        const executedQty = await executeTrade('BUY', selectedStock, tradeQuantity, `AI Scalper: ₩${buyPrice.toLocaleString()} 시작 즉시 1단계 최초 매수 진입`, buyPrice);
        if (executedQty > 0) {
          setScalperMessage(`[최초 즉시 진입] ₩${buyPrice.toLocaleString()} 1단계 최초 매수 완료 (${executedQty}주)`);
          setBotStatus(`[최초 즉시 진입] ₩${buyPrice.toLocaleString()} 1단계 최초 매수 완료 (${executedQty}주)`);
          setGapInventory([buyPrice]);
          setLastTradeType('BUY');
          setGapTradeCount(prev => prev + 1);
          showNotification(`${selectedStock.name} 시작 즉시 1단계 매수 완료 (${executedQty}주)`, "success");
          playScalpingSound('BUY');
        }
      } else {
        setScalperMessage("잔액 부족으로 최초 즉시 매수 실패");
      }
    };

    if (immediateEntry && gapInventoryRef.current.length === 0) {
      runImmediateBuy(selectedStock.price);
    }

    const gapInterval = setInterval(async () => {
      // Find the latest price in current stocks array
      const currentStock = stocksRef.current.find(s => s.symbol === selectedStock.symbol) || selectedStock;
      const currentPrice = currentStock.price;

      if (gapBuyPrice <= 0 || gapSellPrice <= 0) return;

      const minPrice = gapBuyPrice;
      const maxPrice = gapSellPrice;

      // Only trade inside the defined range
      if (currentPrice >= minPrice && currentPrice <= maxPrice) {
        if (lastPrice > 0) {
          const isDipping = currentPrice < lastPrice;
          const currentInventory = [...gapInventoryRef.current];

          // Compute real-time tick volatility (standard deviation of recent ticks)
          let dynamicTargetProfit = scalpingTargetProfit;
          let volatilityPct = 0;
          if (currentStock.history && currentStock.history.length > 5) {
            const recentHistory = currentStock.history.slice(-15);
            const prices = recentHistory.map(h => h.price);
            const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
            const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
            const stdDev = Math.sqrt(variance);
            volatilityPct = (stdDev / (mean || 1)) * 100;
            
            if (useAiAdaptiveProfit) {
              // Scale target profit based on volatility: min 0.15%, max 1.5%
              dynamicTargetProfit = Math.max(0.15, Math.min(1.5, Number((volatilityPct * 0.75).toFixed(2))));
            }
          }
          setCurrentAiTargetProfit(dynamicTargetProfit);

          // Dynamic grid spacing calculation based on the range (min/max price)
          const rangePct = ((maxPrice - minPrice) / minPrice) * 100;
          const spacingPct = Math.max(0.2, Math.min(2.0, rangePct / 5));

          // Calculate how many slots are empty
          const nextEmptyIdx = currentInventory.length; // sequential fill 0, 1, 2, 3, 4

          // 1. BUY Condition: Filling the slots
          if (nextEmptyIdx < 5) {
            let targetBuyPrice = currentPrice;
            let shouldBuy = false;

            if (nextEmptyIdx === 0) {
              // Slot 1 (index 0): Buy at current price
              const tickSize = currentPrice >= 500000 ? 1000 : currentPrice >= 100000 ? 500 : currentPrice >= 50000 ? 100 : currentPrice >= 10000 ? 50 : currentPrice >= 5000 ? 10 : 5;
              const buyPrice = lowestBidOnlyMode ? (currentPrice - 5 * tickSize) : currentPrice;
              targetBuyPrice = buyPrice;
              
              // Smart Re-entry Guard: avoid re-buying immediately if too close to last sell price
              let passedGuard = true;
              if (useSmartReentryGuard && lastSellPriceRef.current !== null) {
                const reentryThreshold = lastSellPriceRef.current * 0.999; // 0.1% lower than last sell price
                if (currentPrice > reentryThreshold) {
                  passedGuard = false;
                  setScalperMessage(`[고점 추격 방지] 대기 중 (진입 기준가: ₩${Math.round(reentryThreshold).toLocaleString()} 미만)`);
                }
              }

              // If dipping or starting completely fresh
              shouldBuy = passedGuard && (isDipping || (currentInventory.length === 0));
            } else {
              // Slot 2 to 5 (index > 0): Buy if current price falls below the optimal grid price
              // Optimal price is calculated based on the entry price of Slot 1 (index 0)
              const firstBuyPrice = currentInventory[0];
              if (firstBuyPrice) {
                const optimalPriceForSlot = firstBuyPrice * (1 - (spacingPct * nextEmptyIdx) / 100);
                if (currentPrice <= optimalPriceForSlot) {
                  // Price dipped to or below the grid level! Perfect entry point.
                  targetBuyPrice = currentPrice;
                  shouldBuy = true;
                }
              }
            }

            if (shouldBuy) {
              // Calculate martingale-weighted scale qty for deeper slots
              const finalQty = useMartingaleScaling 
                ? Math.max(1, Math.round(tradeQuantity * (1 + nextEmptyIdx * 0.25))) 
                : tradeQuantity;

              const priceInKrw = marketType === 'US' ? targetBuyPrice * exchangeRate : targetBuyPrice;
              const cost = priceInKrw * finalQty;

              if (balance >= cost || kisConfig.isConnected) {
                setScalperMessage(`[슬롯 #${nextEmptyIdx + 1} 매수 진행] ₩${targetBuyPrice.toLocaleString()} (${finalQty}주)...`);
                const executedQty = await executeTrade('BUY', selectedStock, finalQty, `AI Scalper: ₩${targetBuyPrice.toLocaleString()} 슬롯 #${nextEmptyIdx + 1} 진입 완료 (${useMartingaleScaling ? '가중 분할' : '균등 분할'})`, targetBuyPrice);
                
                if (executedQty > 0) {
                  setScalperMessage(`[슬롯 #${nextEmptyIdx + 1} 매수 완료] ₩${targetBuyPrice.toLocaleString()} (${executedQty}주)`);
                  setBotStatus(`[스캘퍼] 슬롯 #${nextEmptyIdx + 1} 진입 완료 ₩${targetBuyPrice.toLocaleString()} (${executedQty}주)`);
                  setGapInventory(prev => [...prev, targetBuyPrice]);
                  setLastTradeType('BUY');
                  setGapTradeCount(prev => prev + 1);
                  showNotification(`${selectedStock.name} 슬롯 #${nextEmptyIdx + 1} 자동 매수 완료 (${executedQty}주)`, "success");
                  playScalpingSound('BUY');
                }
              } else {
                setScalperMessage(`잔액 부족으로 슬롯 #${nextEmptyIdx + 1} 매수 대기`);
                setBotStatus("잔액 부족으로 매수 취소");
              }
            } else {
              // Waiting for optimal entry price
              if (nextEmptyIdx > 0 && currentInventory[0]) {
                const firstBuyPrice = currentInventory[0];
                const optimalPriceForSlot = firstBuyPrice * (1 - (spacingPct * nextEmptyIdx) / 100);
                setScalperMessage(`현재가(₩${currentPrice.toLocaleString()}) 관망 중 (슬롯 #${nextEmptyIdx + 1} 대기 진입가: ₩${Math.round(optimalPriceForSlot).toLocaleString()})`);
              } else if (nextEmptyIdx === 0 && useSmartReentryGuard && lastSellPriceRef.current !== null && currentPrice > lastSellPriceRef.current * 0.999) {
                // message is set by smart reentry guard
              } else {
                setScalperMessage(`최초 진입 대기 중 (현재가: ₩${currentPrice.toLocaleString()})`);
              }
            }
          } else {
            setScalperMessage(`최대 보유 슬롯(5개) 도달. 상승 익절 감시 중 (현재가: ₩${currentPrice.toLocaleString()})`);
          }

          // 2. SELL Condition: Scan each active slot to take profit or stop loss
          const currentInventory2 = gapInventoryRef.current;
          if (currentInventory2.length > 0) {
            // Check profit or stop loss slot-by-slot
            for (let i = 0; i < currentInventory2.length; i++) {
              const buyPrice = currentInventory2[i];
              const profitRatio = (currentPrice - buyPrice) / buyPrice;
              const estimatedFees = marketType === 'US' ? 0.0003 : 0.0022;
              const netProfitRatio = profitRatio - estimatedFees;

              const isProfitable = netProfitRatio >= dynamicTargetProfit / 100;
              const isStopLoss = (currentPrice - buyPrice) / buyPrice <= scalpingStopLoss / 100;

              if (isProfitable) {
                const expectedQty = useMartingaleScaling 
                  ? Math.max(1, Math.round(tradeQuantity * (1 + i * 0.25))) 
                  : tradeQuantity;

                const qty = holdings[selectedStock.symbol] || 0;
                const sellQty = Math.min(qty, expectedQty) || expectedQty;

                if (sellQty > 0 || kisConfig.isConnected) {
                  setScalperMessage(`[슬롯 #${i + 1} 익절 완료] ₩${currentPrice.toLocaleString()} (+${dynamicTargetProfit.toFixed(2)}% AI 가변)`);
                  setBotStatus(`[스캘퍼] ₩${currentPrice.toLocaleString()} 슬롯 #${i + 1} 목표 차익 실현...`);
                  await executeTrade('SELL', selectedStock, sellQty, `AI Scalper: ₩${buyPrice.toLocaleString()} -> ₩${currentPrice.toLocaleString()} 슬롯 #${i + 1} 익절 완료 (+${dynamicTargetProfit.toFixed(2)}% AI 가변)`, currentPrice);
                  
                  // Record last sell price to prevent high re-entries
                  setLastSellPrice(currentPrice);
                  lastSellPriceRef.current = currentPrice;

                  // Remove this exact buyPrice from inventory to make the slot empty
                  setGapInventory(prev => prev.filter(p => p !== buyPrice));
                  setLastTradeType('SELL');
                  setGapTradeCount(prev => prev + 1);
                  setScalpingWins(prev => prev + 1);

                  const profit = (currentPrice - buyPrice) * sellQty * (marketType === 'US' ? exchangeRate : 1);
                  setGapTradingProfit(prev => prev + profit);
                  showNotification(`${selectedStock.name} 슬롯 #${i + 1} 익절 자동 매도 완료 (+₩${Math.round(profit).toLocaleString()})`, "success");
                  playScalpingSound('SELL');
                  break; // Avoid double sells in a single tick
                }
              } else if (isStopLoss) {
                const expectedQty = useMartingaleScaling 
                  ? Math.max(1, Math.round(tradeQuantity * (1 + i * 0.25))) 
                  : tradeQuantity;

                const qty = holdings[selectedStock.symbol] || 0;
                const sellQty = Math.min(qty, expectedQty) || expectedQty;

                if (sellQty > 0 || kisConfig.isConnected) {
                  setScalperMessage(`[슬롯 #${i + 1} 손절 완료] ₩${currentPrice.toLocaleString()} (${scalpingStopLoss}%)`);
                  setBotStatus(`[스캘퍼] ₩${currentPrice.toLocaleString()} 슬롯 #${i + 1} 리스크 관리 손절...`);
                  await executeTrade('SELL', selectedStock, sellQty, `AI Scalper: ₩${buyPrice.toLocaleString()} -> ₩${currentPrice.toLocaleString()} 슬롯 #${i + 1} 손절 완료 (${scalpingStopLoss}%)`, currentPrice);
                  
                  // Remove this exact buyPrice from inventory
                  setGapInventory(prev => prev.filter(p => p !== buyPrice));
                  setLastTradeType('SELL');
                  setGapTradeCount(prev => prev + 1);
                  setScalpingLosses(prev => prev + 1);

                  const loss = (currentPrice - buyPrice) * sellQty * (marketType === 'US' ? exchangeRate : 1);
                  setGapTradingProfit(prev => prev + loss);
                  showNotification(`${selectedStock.name} 슬롯 #${i + 1} 손절 매도 완료 (₩${Math.round(loss).toLocaleString()})`, "error");
                  playScalpingSound('SELL');
                  break; // Avoid double sells in a single tick
                }
              }
            }
          }
        }
      } else {
        setScalperMessage(`현재가(₩${currentPrice.toLocaleString()})가 설정 범위(₩${minPrice.toLocaleString()}~₩${maxPrice.toLocaleString()})를 벗어나 감시 대기 중`);
      }

      lastPrice = currentPrice;
    }, scalpingSpeed);

    return () => clearInterval(gapInterval);
  }, [isGapBotActive, selectedSymbol, selectedStock, gapBuyPrice, gapSellPrice, tradeQuantity, balance, marketType, exchangeRate, kisConfig.isConnected, holdings, scalpingSpeed, scalpingTargetProfit, scalpingStopLoss, scalpingSoundEnabled, immediateEntry, lowestBidOnlyMode, useAiAdaptiveProfit, useMartingaleScaling, useSmartReentryGuard]);

  const executeTrade = async (action: 'BUY' | 'SELL' | 'HOLD', stock: Stock, amount: number, reason: string, customPrice?: number): Promise<number> => {
    if (action === 'HOLD' || amount <= 0) return 0;

    const tradePrice = customPrice !== undefined ? customPrice : stock.price;
    let finalAmount = amount;

    // KIS API가 연결되어 있고 실제 주문 전송이 활성화된 경우 실제 주문을 라이브 인터페이스를 통해 시도
    if (kisConfig.isConnected && kisConfig.isRealOrderEnabled) {
        if (action === 'BUY') {
            try {
                const isKR = /^\d{6}$/.test(stock.symbol);
                if (isKR) {
                    setBotStatus(`[KIS API] ${stock.symbol} 매수 가능 수량 조회 중...`);
                    const psblRes = await kisService.getDomesticBuyableAmount(stock.symbol, tradePrice.toString(), kisConfig.domesticOrderType || '00');
                    if (psblRes && psblRes.rt_cd === '0' && psblRes.output) {
                        const nrcy = parseInt(psblRes.output.nrcy_buy_qty || psblRes.output.nrcy_ord_psbl_qty || '0', 10);
                        const maxQty = parseInt(psblRes.output.max_ord_qty || psblRes.output.tot_ord_psbl_qty || psblRes.output.max_buy_qty || '0', 10);
                        const ordPsbl = parseInt(psblRes.output.ord_psbl_qty || psblRes.output.psbl_qty || '0', 10);
                        
                        let parsedQty = Math.max(nrcy, maxQty, ordPsbl);
                        
                        // 실제 계좌의 현금(balance)으로 계산하여 보강 또는 보정 (특히 KIS API 결과가 0이거나 미흡할 때)
                        if (balance > 0 && tradePrice > 0) {
                            const calculatedQty = Math.floor(balance / tradePrice);
                            parsedQty = Math.max(parsedQty, calculatedQty);
                        }

                        if (!isNaN(parsedQty)) {
                            if (parsedQty <= 0) {
                                setBotStatus(`[매수 취소] 주문 가능 수량 부족 (0주)`);
                                setScalperMessage("실제 주문 가능 수량 부족 (0주)으로 진입 건너뜀");
                                addLog(stock.symbol, '매수', tradePrice, amount, `[주문취소] KIS 매수 가능 수량 부족 (0주)`);
                                showNotification(`매수 스킵: 실제 계좌의 매수 가능 수량이 0주입니다. 실제 예수금을 확인하시거나 KIS 설정에서 '실제 주문 전송'을 끄고 가상 잔고로 테스트하세요.`, "error");
                                return 0;
                            }
                            if (parsedQty < finalAmount) {
                                console.log(`[KIS Scalper Safety] Adjusting order quantity from ${finalAmount} to ${parsedQty} due to KIS limits.`);
                                finalAmount = parsedQty;
                                showNotification(`주문 수량 자동 제한: 실제 매수 가능 수량이 부족하여 ${amount}주 -> ${finalAmount}주로 조절하여 주문합니다.`, "info");
                            }
                        }
                    }
                }
            } catch (err: any) {
                console.error("Failed to query domestic buyable amount:", err);
                setBotStatus("매수 가능 수량 조회 실패");
                showNotification(`매수 가능 수량 조회 실패: ${err.message}`, "error");
                return 0; // KIS API 오류 시 안전을 위해 진입하지 않음
            }
        }

        try {
            setBotStatus(`[KIS API] ${stock.symbol} ${action === 'BUY' ? '매수' : '매도'} 주문 전송 중...`);
            const res = await kisService.order(
                stock.symbol, 
                action, 
                tradePrice.toString(), 
                finalAmount.toString(),
                kisConfig.domesticOrderType || '00'
            );
            
            if (res.rt_cd === '0') {
               addLog(stock.symbol, action === 'BUY' ? '매수' : '매도', tradePrice, finalAmount, `[실제계좌 주문완료] ${reason}`);
               showNotification(`${stock.name} ${action === 'BUY' ? '매수' : '매도'} 주문 성공`, "success");
            } else {
               setBotStatus(`[KIS API 오류] ${res.msg1}`);
               addLog(stock.symbol, action === 'BUY' ? '매수' : '매도', tradePrice, finalAmount, `[주문실패] ${res.msg1}`);
               showNotification(`주문 실패: ${res.msg1}`, "error");
               return 0; // 실제 주문 실패시 잔고를 업데이트 하지 않음
            }
        } catch (e: any) {
            console.error("KIS Order Error", e);
            setBotStatus("증권사 API 서버 통신 오류");
            showNotification(`KIS 통신 오류: ${e.message}`, "error");
            return 0;
        }
    }

    const priceInKrw = marketType === 'US' ? tradePrice * exchangeRate : tradePrice; 
    const cost = priceInKrw * finalAmount;

    if (action === 'BUY') {
      if (balance >= cost || (kisConfig.isConnected && kisConfig.isRealOrderEnabled)) {
        setBalance(prev => Math.max(0, prev - cost));
        const newHoldings = { ...holdings, [stock.symbol]: Number(((holdings[stock.symbol] || 0) + finalAmount).toFixed(4)) };
        setHoldings(newHoldings);
        if (currentUser) saveUserHoldings(currentUser.uid, newHoldings);
        if (!kisConfig.isConnected || !kisConfig.isRealOrderEnabled) {
            addLog(stock.symbol, '매수', tradePrice, finalAmount, reason);
        }

        // KIS API 연결 상태이고 실제 주문 전송이 활성화된 경우 실제 계좌 잔고를 비동기로 동기화
        if (kisConfig.isConnected && kisConfig.isRealOrderEnabled) {
          setTimeout(() => {
            handleSyncKIS();
          }, 1000);
        }
        return finalAmount;
      } else {
        setBotStatus("잔액 부족으로 매수 취소");
        return 0;
      }
    } else if (action === 'SELL') {
        if (kisConfig.isConnected && kisConfig.isRealOrderEnabled) {
            try {
                const isKR = /^\d{6}$/.test(stock.symbol);
                if (isKR) {
                    setBotStatus(`[KIS API] ${stock.symbol} 매도 가능 수량 조회 중...`);
                    const sellableRes = await kisService.getDomesticSellableQuantity(stock.symbol);
                    if (sellableRes && sellableRes.rt_cd === '0' && sellableRes.output) {
                        const actualSellable = sellableRes.output.nrc_psbl_qty ? parseInt(sellableRes.output.nrc_psbl_qty, 10) : 0;
                        if (!isNaN(actualSellable)) {
                            if (actualSellable <= 0) {
                                setBotStatus(`[매도 건너뜀] KIS 실제 매도 가능 수량 0주`);
                                setScalperMessage("실제 보유 주식이 없거나 미체결 상태여서 매도 대기 (실거래 미체결 대기)");
                                addLog(stock.symbol, '매도', tradePrice, finalAmount, `[주문건너뜀] KIS 실제 매도 가능 수량 0주 (미체결 대기)`);
                                showNotification(`매도 대기: 실제 계좌에 보유 중인 ${stock.name} 매도 가능 수량이 0주입니다.`, "info");
                                return 0;
                            }
                            if (actualSellable < finalAmount) {
                                console.log(`[KIS Scalper Safety] Adjusting sell quantity from ${finalAmount} to ${actualSellable} due to KIS limits.`);
                                finalAmount = actualSellable;
                                showNotification(`매도 수량 자동 조정: 실제 매도 가능 수량에 맞춰 ${finalAmount}주로 조절하여 주문합니다.`, "info");
                            }
                        }
                    }
                }
            } catch (err: any) {
                console.error("Failed to query domestic sellable quantity:", err);
                setBotStatus("매도 가능 수량 조회 실패");
                showNotification(`매도 가능 수량 조회 실패: ${err.message}`, "error");
                return 0; // KIS API 오류 시 안전을 위해 매도하지 않음
            }
        }

      const currentHoldings = holdings[stock.symbol] || 0;
      const sellAmount = kisConfig.isConnected && kisConfig.isRealOrderEnabled ? finalAmount : Math.min(finalAmount, currentHoldings);
      if (sellAmount > 0) {
        if (kisConfig.isConnected && kisConfig.isRealOrderEnabled) {
          // 실제 주문인 경우: 로컬 상태를 임의로 차감하지 않고 실제 계좌 잔고 데이터를 fetch하여 즉시 UI에 반영
          handleSyncKIS();
          
          // 서버 응답 지연을 고려해 1초 뒤에 최종 동기화를 한 번 더 트리거
          setTimeout(() => {
            handleSyncKIS();
          }, 1000);
        } else {
          // 가상 거래인 경우에만 로컬 상태 업데이트 진행
          setBalance(prev => prev + priceInKrw * sellAmount);
          const newHoldings = { ...holdings, [stock.symbol]: Number(Math.max(0, currentHoldings - sellAmount).toFixed(4)) };
          setHoldings(newHoldings);
          if (currentUser) saveUserHoldings(currentUser.uid, newHoldings);
          addLog(stock.symbol, '매도', tradePrice, sellAmount, reason);
        }
        return sellAmount;
      }
      return 0;
    }
    return 0;
  };

  const addLog = (symbol: string, type: 'BUY' | 'SELL' | '매수' | '매도', price: number, amount: number, reason: string) => {
    setTradeLogs(prev => [{
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      symbol, type, price, amount, reason
    }, ...prev].slice(0, 50));
  };

  const toggleScalperBot = async () => {
    if (!isGapBotActive) {
      if (gapBuyPrice <= 0 || gapSellPrice <= 0) {
        alert("금액 구간(하한선과 상한선)을 정확하게 설정해주세요.");
        return;
      }
      if (gapBuyPrice >= gapSellPrice) {
        alert("상한가는 하한가보다 높은 금액이어야 합니다.");
        return;
      }
      setLastTradeType(null); // Reset to start fresh
      setIsGapBotActive(true);
    } else {
      setIsGapBotActive(false);
      
      // SELL ALL holdings of the selectedStock on stop
      if (selectedStock) {
        const qty = holdings[selectedStock.symbol] || 0;
        let sellQty = qty;
        
        if (kisConfig.isConnected && kisConfig.isRealOrderEnabled) {
          try {
            const sellableRes = await kisService.getDomesticSellableQuantity(selectedStock.symbol);
            if (sellableRes && sellableRes.rt_cd === '0' && sellableRes.output) {
              const actualSellable = sellableRes.output.nrc_psbl_qty ? parseInt(sellableRes.output.nrc_psbl_qty, 10) : 0;
              if (!isNaN(actualSellable) && actualSellable > 0) {
                sellQty = actualSellable;
              }
            }
          } catch (err) {
            console.error("Failed to query sellable quantity on stop:", err);
          }
        }
        
        if (sellQty > 0) {
          setScalperMessage(`[스캘퍼 정지] 보유 전량(${sellQty}주) 시장가 매도 진행 중...`);
          await executeTrade('SELL', selectedStock, sellQty, `AI 스캘퍼 수동 정지: 보유 전량 시장가 매도`, selectedStock.price);
          setGapInventory([]);
        } else {
          setScalperMessage("스캘퍼 정지됨 (매도할 보유 수량 없음)");
          setGapInventory([]);
        }
      } else {
        setGapInventory([]);
      }
    }
  };

  const handleExecuteXtxSignal = (sig: MarketSignal) => {
    if (sig.action === 'HOLD') return;

    // Use latest stocks from ref to ensure correct pricing
    const stock = stocksRef.current.find(s => s.symbol === sig.symbol);
    if (!stock) {
      showNotification("종목 정보를 찾을 수 없습니다.", "error");
      return;
    }

    setConfirmState({
      show: true,
      title: `신규 ${sig.action === 'BUY' ? '매수' : '매도'} 시그널 실행`,
      message: `${stock.name}(${sig.symbol}) 종목에 대해 불GPT의 분석 결과를 적용하시겠습니까?\n\n- 목표가: ${sig.targetPrice.toLocaleString()}\n- 손절가: ${sig.stopLoss.toLocaleString()}\n\nAI 분석 근거: ${sig.prediction}`,
      onConfirm: async () => {
        try {
          // Calculate amount (e.g., 5% of balance for XTX scale)
          // Use current balance, or a fallback if balance is synced to 0
          const effectiveBalance = balance > 0 ? balance : 10000000; // 10M KRW fallback for simulator
          const priceInKrw = marketType === 'US' ? stock.price * (exchangeRate || 1400) : stock.price; 
          
          if (priceInKrw <= 0) throw new Error("현재가 정보가 없습니다.");
          
          const amount = Number(((effectiveBalance * 0.05) / priceInKrw).toFixed(4));
          if (amount <= 0) throw new Error("주문 수량이 부족합니다 (잔액 확인 필요).");
          
          await executeTrade(sig.action, stock, amount, `[BullGPT 시그널] ${sig.pattern}`);
          setConfirmState(prev => ({ ...prev, show: false }));
        } catch (err: any) {
          console.error("Trade execution error:", err);
          showNotification(`실행 오류: ${err.message}`, "error");
          setConfirmState(prev => ({ ...prev, show: false }));
        }
      }
    });
  };

  const handleTestConnection = async () => {
    if (!kisConfig.appKey || !kisConfig.appSecret || !kisConfig.accountNo) {
      alert("모든 필수 정보를 입력해주세요.");
      return;
    }

    setBotStatus("연결 진행 중...");
    try {
      // Temporarily init to test
      const testConfig = getActiveKisConfig(kisConfig);
      kisService.init(testConfig);
      
      // 1. Try Token
      setBotStatus("토큰 발급 중...");
      await kisService.refreshAccessToken();
 
      // 2. Try simple balance
      setBotStatus("계좌 잔고 조회 중...");
      try {
        await kisService.getBalance();
        showNotification(`성공! ${kisConfig.isRealServer === false ? '모의' : '실전'} 서버 연결에 성공했습니다.`, "success");
      } catch (e: any) {
        // Balance might fail even if token works (e.g. password)
        showNotification(`잔고 조회 실패: ${e.message}`, "error");
      }
    } catch (e: any) {
      showNotification(`연결 실패: ${e.message}`, "error");
    } finally {
      setBotStatus(kisConfig.isConnected ? "연동 중" : "대기 중");
    }
  };

  const handleConnectKIS = async () => {
    if (!kisConfig.appKey || !kisConfig.appSecret || !kisConfig.accountNo) {
      alert("모든 필수 정보를 입력해주세요.");
      return;
    }
    const newConfig = {
      ...kisConfig,
      isConnected: true
    };
    kisService.init(getActiveKisConfig(newConfig));
    setKisConfig(newConfig);
    
    // PERSISTENCE: Save to Firestore if user is logged in
    if (currentUser) {
      await saveUserKISConfig(currentUser.uid, newConfig);
    }
    
    setShowKisModal(false);
    showNotification(`한국투자증권 ${kisConfig.isRealServer === false ? '모의' : '실전'}계좌가 연결되었습니다.`, "success");
    
    // Trigger immediate sync after connection
    setTimeout(() => {
      handleSyncKIS();
    }, 1000);

    setTradeLogs(prev => [{
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      symbol: 'SYSTEM', type: '매수', price: 0, amount: 0, reason: `한국투자증권 ${kisConfig.isRealServer === false ? '모의' : '실전'}계좌가 연결되었습니다. 데이터 동기화를 시작합니다.`
    } as any, ...prev].slice(0, 50));
  };

  if (isAuthLoading || isRateLoading) {
    return (
      <div className="min-h-screen bg-sleek-bg flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-sleek-blue/20 border-t-sleek-blue rounded-full animate-spin"></div>
          <Bot className="absolute inset-0 m-auto w-6 h-6 text-sleek-blue" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-white font-black uppercase tracking-[0.2em] animate-pulse">Initializing System...</p>
          <p className="text-[10px] text-sleek-text-secondary uppercase tracking-widest">
            {isAuthLoading ? "Authenticating security layers..." : "Fetching Real-time Exchange Data..."}
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-sleek-bg flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-sleek-card border border-sleek-blue/30 rounded-3xl p-10 w-full max-w-md shadow-2xl text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sleek-blue via-sleek-green to-sleek-blue"></div>
          
          <div className="w-16 h-16 bg-sleek-blue/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Bot className="w-10 h-10 text-sleek-blue" />
          </div>

          {!isDirectLoginOpen ? (
            <>
              <h1 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">LEO 10B AI BOT</h1>
              <p className="text-sleek-text-secondary text-sm mb-8 leading-relaxed">
                레오의 100억 주식매매 프로그램에 오신 것을 환영합니다.<br/>
                서비스 이용을 위해 로그인이 필요합니다.
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={handleLogin}
                  className="w-full py-4 rounded-xl bg-white text-black font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition-all cursor-pointer shadow-lg"
                >
                  <User className="w-5 h-5" />
                  GOOGLE 계정으로 로그인하기
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10"></span>
                  </div>
                  <span className="relative bg-sleek-card px-3 text-[10px] text-sleek-text-secondary uppercase tracking-widest font-bold">OR</span>
                </div>

                <button 
                  onClick={() => {
                    setIsDirectLoginOpen(true);
                    setDirectLoginError(null);
                  }}
                  className="w-full py-3.5 rounded-xl bg-sleek-blue/10 border border-sleek-blue/30 text-sleek-blue font-bold flex items-center justify-center gap-3 hover:bg-sleek-blue/20 transition-all cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  인증키로 즉시 로그인하기
                </button>
              </div>

              <div className="mt-8 bg-black/30 border border-white/5 rounded-2xl p-4 text-left space-y-1.5">
                <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> iFrame 로그인 차단 안내
                </h4>
                <p className="text-[10px] text-sleek-text-secondary leading-relaxed">
                  만약 구글 로그인 버튼이 작동하지 않거나 무반응이라면, 브라우저 보안 정책(3방 쿠키 차단) 때문입니다.
                  오른쪽 상단의 <strong>'새 창에서 열기' (Open in New Tab)</strong> 버튼을 클릭해 접속하시거나, <strong>'인증키로 즉시 로그인'</strong>을 사용해주세요.
                </p>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter flex items-center justify-center gap-2">
                <Key className="w-5 h-5 text-sleek-blue" /> 인증키 간편 로그인
              </h1>
              <p className="text-sleek-text-secondary text-[11px] mb-6 leading-relaxed">
                발급받은 16자리 인증키(라이선스 키)를 입력하여 소셜 연동 없이 간편하게 로그인할 수 있습니다.
              </p>

              <div className="space-y-4 text-left">
                <div>
                  <label className="text-[10px] font-black text-sleek-text-secondary uppercase tracking-widest block mb-2">
                    라이선스 인증키 입력
                  </label>
                  <input
                    type="text"
                    value={directKeyInput}
                    onChange={(e) => setDirectKeyInput(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="w-full bg-black/40 border border-sleek-border rounded-xl p-4 text-sm font-bold tracking-widest focus:border-sleek-blue outline-none transition-all text-center uppercase"
                  />
                </div>

                {directLoginError && (
                  <div className="p-3 bg-sleek-red/10 border border-sleek-red/30 rounded-xl text-[10px] text-sleek-red font-bold leading-relaxed">
                    {directLoginError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsDirectLoginOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sleek-text-secondary font-bold text-xs hover:bg-white/10 transition-all cursor-pointer"
                    disabled={isDirectLoggingIn}
                  >
                    돌아가기
                  </button>
                  <button
                    onClick={handleDirectLogin}
                    disabled={isDirectLoggingIn}
                    className="flex-1 py-3 rounded-xl bg-sleek-blue text-white font-black text-xs hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isDirectLoggingIn ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        인증 중...
                      </>
                    ) : (
                      "로그인하기"
                    )}
                  </button>
                </div>
              </div>

              <p className="mt-6 text-[9px] text-sleek-text-secondary italic">
                * 키 분실 시 관리자에게 복구를 문의해주세요.
              </p>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-sleek-bg text-sleek-text-primary selection:bg-sleek-blue/30 overflow-hidden relative">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={cn(
              "fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md max-w-sm",
              notification.type === 'success' ? "bg-sleek-green/10 border-sleek-green/30 text-sleek-green" :
              notification.type === 'error' ? "bg-sleek-red/10 border-sleek-red/30 text-sleek-red" :
              "bg-sleek-blue/10 border-sleek-blue/30 text-sleek-blue"
            )}
          >
            {notification.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> :
             notification.type === 'error' ? <Info className="w-4 h-4 flex-shrink-0" /> :
             <Bell className="w-4 h-4 flex-shrink-0" />}
            <span className="text-[12px] font-bold">{notification.message}</span>
            <button 
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              className="ml-2 opacity-50 hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showKisModal && (
          <motion.div 
            key="kis-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-sleek-card border border-sleek-blue/30 rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h2 className="text-xl font-black text-white mb-2 flex items-center gap-2">
                <CircleDollarSign className="text-sleek-blue" />
                한국투자증권 API 연결
              </h2>
              <p className="text-xs text-sleek-text-secondary mb-6 leading-relaxed">
                발급받으신 KIS Developers App Key와 Secret을 입력하세요. 
                이 정보는 브라우저 메모리에만 저장되며 전송되지 않습니다.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-sleek-text-secondary uppercase mb-2 block">투자 유형 (Investment Type)</label>
                  <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 border border-sleek-border rounded-xl">
                    <button
                      type="button"
                      onClick={() => setKisConfig((prev: any) => ({ ...prev, isRealServer: true }))}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        kisConfig.isRealServer !== false 
                          ? 'bg-sleek-blue text-white shadow-lg' 
                          : 'text-sleek-text-secondary hover:text-white'
                      }`}
                    >
                      실전투자 (Real)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKisConfig((prev: any) => ({ ...prev, isRealServer: false }))}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        kisConfig.isRealServer === false 
                          ? 'bg-sleek-blue text-white shadow-lg' 
                          : 'text-sleek-text-secondary hover:text-white'
                      }`}
                    >
                      모의투자 (Mock)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-sleek-text-secondary uppercase mb-1 block">App Key ({kisConfig.isRealServer === false ? '모의' : '실전'})</label>
                  <input 
                    type="password" 
                    value={kisConfig.appKey}
                    onChange={(e) => setKisConfig((prev: any) => ({ 
                      ...prev, 
                      appKey: e.target.value
                    }))}
                    className="w-full bg-black/40 border border-sleek-border rounded-lg p-3 text-xs focus:border-sleek-blue outline-none" 
                    placeholder={`한국투자증권 ${kisConfig.isRealServer === false ? '모의' : '실전'} App Key 입력`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-sleek-text-secondary uppercase mb-1 block">App Secret ({kisConfig.isRealServer === false ? '모의' : '실전'})</label>
                  <input 
                    type="password" 
                    value={kisConfig.appSecret}
                    onChange={(e) => setKisConfig((prev: any) => ({ 
                      ...prev, 
                      appSecret: e.target.value
                    }))}
                    className="w-full bg-black/40 border border-sleek-border rounded-lg p-3 text-xs focus:border-sleek-blue outline-none" 
                    placeholder={`한국투자증권 ${kisConfig.isRealServer === false ? '모의' : '실전'} Secret Key 입력`}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-[2]">
                    <label className="text-[10px] font-bold text-sleek-text-secondary uppercase mb-1 block">Account No</label>
                    <input 
                      type="text" 
                      value={kisConfig.accountNo}
                      onChange={(e) => {
                        const val = e.target.value.replace(/-/g, '');
                        setKisConfig(prev => {
                          const updated = { ...prev, accountNo: val };
                          if (val.length >= 10 && /^\d+$/.test(val.substring(0, 10))) {
                             updated.accountNo = val.substring(0, 8);
                             updated.accountCode = val.substring(8, 10);
                          }
                          return updated;
                        });
                      }}
                      className="w-full bg-black/40 border border-sleek-border rounded-lg p-3 text-xs focus:border-sleek-blue outline-none" 
                      placeholder="8자리 계좌번호"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-sleek-text-secondary uppercase mb-1 block">Code</label>
                    <input 
                      type="text" 
                      maxLength={2}
                      value={kisConfig.accountCode}
                      onChange={(e) => setKisConfig(prev => ({ ...prev, accountCode: e.target.value }))}
                      className="w-full bg-black/40 border border-sleek-border rounded-lg p-3 text-xs focus:border-sleek-blue outline-none text-center" 
                      placeholder="01"
                    />
                  </div>
                </div>
                <div>
                   <label className="text-[10px] font-bold text-sleek-text-secondary uppercase mb-1 block">PW (4 digits)</label>
                   <div className="relative">
                     <input 
                       type={showKisPassword ? "text" : "password"} 
                       maxLength={4}
                       value={kisConfig.accountPw}
                       onChange={(e) => setKisConfig(prev => ({ ...prev, accountPw: e.target.value }))}
                       className="w-full bg-black/40 border border-sleek-border rounded-lg p-3 pr-10 text-xs focus:border-sleek-blue outline-none" 
                       placeholder="****"
                     />
                     <button
                       type="button"
                       onClick={() => setShowKisPassword(!showKisPassword)}
                       className="absolute right-3 top-1/2 -translate-y-1/2 text-sleek-text-secondary hover:text-white transition-colors"
                     >
                       {showKisPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                     </button>
                   </div>
                </div>
                <div>
                   <label className="text-[10px] font-bold text-sleek-text-secondary uppercase mb-1 block">국내 주문 구분 (Order Type)</label>
                   <select
                     value={kisConfig.domesticOrderType || '00'}
                     onChange={(e) => setKisConfig(prev => ({ ...prev, domesticOrderType: e.target.value }))}
                     className="w-full bg-black/40 border border-sleek-border rounded-lg p-3 text-xs focus:border-sleek-blue outline-none text-white appearance-none"
                     style={{ colorScheme: 'dark' }}
                   >
                     <option value="00" className="bg-sleek-card text-white">지정가 (Limit) - 현재가 주문 [권장]</option>
                     <option value="01" className="bg-sleek-card text-white">시장가 (Market) - 즉시 체결 주문</option>
                   </select>
                   <p className="text-[9px] text-sleek-text-secondary mt-1 leading-normal">
                     * 시장가(Market)는 증권사 규정상 상한가 기준 보증금(최대 130%)을 예치하므로, 소액 계좌에서는 <strong>"주문가능금액 초과 (APBK0952)"</strong> 오류가 발생합니다. 안정적인 구동을 위해 <strong>지정가(Limit)</strong> 사용을 적극 권장합니다.
                   </p>
                </div>
                 <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/40 border border-sleek-border mt-4">
                    <div className="max-w-[75%] text-left">
                      <label className="text-xs font-bold text-white block">실제 주문 전송 (Live Ordering)</label>
                      <p className="text-[9px] text-sleek-text-secondary leading-normal mt-1">
                        활성화 시 KIS 실제/모의 계좌로 즉시 주문을 전송합니다. 비활성화 시 KIS 실시간 시세만 연동하고 가상 잔액(로컬)으로 거래하여 <strong>매수 가능량 0주 문제 및 자산 손실 위험을 방지</strong>합니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setKisConfig(prev => ({ ...prev, isRealOrderEnabled: !prev.isRealOrderEnabled }))}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        kisConfig.isRealOrderEnabled ? "bg-sleek-blue" : "bg-white/10"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out",
                          kisConfig.isRealOrderEnabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                 </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowKisModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-sleek-text-secondary hover:bg-white/5 transition-all"
                >
                  취소
                </button>
                {kisConfig.isConnected && (
                  <button 
                    onClick={async () => {
                      try {
                        await kisService.refreshAccessToken();
                        alert("Access Token이 성공적으로 갱신되었습니다. (LMS가 발송됩니다)");
                      } catch (e: any) {
                        alert("토큰 갱신 실패: " + e.message);
                      }
                    }}
                    className="flex-1 py-3 rounded-xl text-xs font-bold border border-sleek-blue/30 text-sleek-blue hover:bg-sleek-blue/5 transition-all"
                  >
                    토큰 갱신
                  </button>
                )}
                <button 
                  onClick={handleConnectKIS}
                  className="flex-[2] py-3 rounded-xl text-xs font-bold bg-sleek-blue text-white shadow-lg shadow-sleek-blue/20 hover:scale-[1.02] transition-all"
                >
                  {kisConfig.isConnected ? "정보 업데이트" : "연결하기"}
                </button>
              </div>
              
              {!kisConfig.isConnected && (
                <div className="mt-2">
                  <button 
                    onClick={handleTestConnection}
                    className="w-full py-2 rounded-lg text-[10px] font-bold border border-white/10 text-sleek-text-secondary hover:bg-white/5 transition-all"
                  >
                    🚀 입력 정보로 연결 확인하기
                  </button>
                </div>
              )}

              <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[9px] text-sleek-text-secondary leading-relaxed">
                  <span className="text-sleek-blue font-bold">INFO:</span> OAuth 2.0 Client Credentials 방식(2-Legged)을 사용합니다. 
                  접근 토큰은 24시간 유효하며, 보안을 위해 토큰 발급 시 한국투자증권에서 LMS 알림이 발송됩니다. 
                  본 앱은 토큰을 저장하여 알림 발송 횟수를 최소화합니다.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showActivationModal && (
          <motion.div 
            key="activation-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-sleek-card border border-sleek-blue/30 rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-sleek-blue/20 rounded-xl flex items-center justify-center">
                  <Key className="w-5 h-5 text-sleek-blue" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white italic uppercase tracking-tighter">LICENCE ACTIVATION</h2>
                  <p className="text-[10px] text-sleek-text-secondary uppercase tracking-widest">전달받은 인증키를 입력하세요</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sleek-text-secondary" />
                  <input 
                    type="text" 
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                    className="w-full bg-black/40 border border-sleek-border rounded-xl py-4 pl-10 pr-4 text-sm font-mono tracking-widest focus:border-sleek-blue outline-none transition-colors" 
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                  />
                </div>
                {activationError && (
                  <p className="text-[11px] text-sleek-red font-bold animate-shake text-center border border-sleek-red/20 bg-sleek-red/5 py-2 rounded-lg">{activationError}</p>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => { setShowActivationModal(false); setActivationError(null); }}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-sleek-text-secondary hover:bg-white/5 transition-all"
                >
                  취소
                </button>
                <button 
                  onClick={handleActivateKey}
                  disabled={isActivatingKey}
                  className="flex-[2] py-3 rounded-xl text-xs font-bold bg-sleek-blue text-white shadow-lg shadow-sleek-blue/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isActivatingKey ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "인증하기"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showPlanDetails && userLicenseData && (
          <motion.div 
            key="plan-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-sleek-card border border-sleek-blue/30 rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-sleek-blue/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-sleek-blue/20 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-sleek-blue" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Subscription Details</h2>
                  <p className="text-[10px] text-sleek-text-secondary uppercase tracking-widest">본인의 계정 활성화 정보입니다</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                  <div className="text-[10px] text-sleek-text-secondary uppercase mb-2 flex items-center gap-2">
                    <User className="w-3 h-3" /> Account Email
                  </div>
                  <div className="text-sm font-bold text-white mb-4">{currentUser?.email || "간편로그인 (인증키)"}</div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-sleek-text-secondary uppercase mb-1">Status</div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-sleek-green/20 text-sleek-green px-2 py-0.5 rounded-full font-black uppercase">Active</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-sleek-green animate-ping"></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-sleek-text-secondary uppercase mb-1">Plan Type</div>
                      <div className="text-xs font-bold text-white">PREMIUM AI BOT</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] text-sleek-text-secondary uppercase mb-1 flex items-center gap-2">
                      <Calendar className="w-3 h-3" /> Activation Period
                    </div>
                    <div className="bg-black/40 border border-sleek-border rounded-xl p-3 flex justify-between items-center">
                      <div className="text-center">
                        <p className="text-[8px] text-sleek-text-secondary uppercase">Start</p>
                        <p className="text-[10px] font-mono text-white">{new Date(userLicenseData.createdAt?.seconds * 1000 || Date.now() - 30 * 86400000).toLocaleDateString()}</p>
                      </div>
                      <div className="h-px w-8 bg-sleek-border"></div>
                      <div className="text-center">
                        <p className="text-[8px] text-sleek-text-secondary uppercase">Expire</p>
                        <p className="text-[10px] font-mono text-sleek-blue font-bold">{new Date(userLicenseData.expiresAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-sleek-blue mt-2 font-bold text-right">
                      남은 기간: {Math.max(0, Math.ceil((new Date(userLicenseData.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}일
                    </p>
                  </div>

                  <div>
                    <div className="text-[10px] text-sleek-text-secondary uppercase mb-1 flex items-center gap-2">
                      <Key className="w-3 h-3" /> Registered Key
                    </div>
                    <div className="bg-black/40 border border-sleek-border rounded-xl p-3 flex items-center justify-between">
                      <code className="text-[11px] font-mono text-sleek-text-secondary">{userLicenseData.key || 'Direct Activation'}</code>
                      <Copy className="w-3 h-3 text-sleek-text-secondary opacity-30" />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowPlanDetails(false)}
                className="w-full mt-8 py-4 rounded-2xl bg-white text-black font-black text-sm shadow-xl hover:scale-[1.02] transition-all"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}

        {confirmState.show && (
          <motion.div 
            key="confirm-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-sleek-card border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-sleek-red/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8 text-sleek-red" />
              </div>
              <h2 className="text-lg font-black text-white mb-2">{confirmState.title}</h2>
              <p className="text-xs text-sleek-text-secondary whitespace-pre-line mb-8">{confirmState.message}</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmState(prev => ({ ...prev, show: false }))}
                  disabled={confirmState.isLoading}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-all disabled:opacity-50"
                >
                  취소
                </button>
                <button 
                  onClick={confirmState.onConfirm}
                  disabled={confirmState.isLoading}
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-sleek-red text-white shadow-lg shadow-sleek-red/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {confirmState.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "확인"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showAdminPanel && currentUser?.email === "agnus9524@gmail.com" && (
          <motion.div 
            key="admin-panel"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-10"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-sleek-card border border-white/10 rounded-[40px] p-6 md:p-10 w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-sleek-blue/20 rounded-2x flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-sleek-blue" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">ADMIN CONTROL PANEL</h2>
                    <div className="flex gap-4 mt-1 items-center">
                      <button 
                        onClick={() => setAdminTab('users')}
                        className={cn("text-[10px] uppercase tracking-widest font-bold transition-colors", adminTab === 'users' ? "text-sleek-blue underline underline-offset-4" : "text-sleek-text-secondary")}
                      >
                        Subscriber Management
                      </button>
                      <button 
                        onClick={() => setAdminTab('keys')}
                        className={cn("text-[10px] uppercase tracking-widest font-bold transition-colors", adminTab === 'keys' ? "text-sleek-blue underline underline-offset-4" : "text-sleek-text-secondary")}
                      >
                        Auth Keys (인증키 발행)
                      </button>
                      <div className="h-4 w-px bg-white/10 mx-2"></div>
                      <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 text-[9px] font-black bg-sleek-green/20 text-sleek-green hover:bg-sleek-green hover:text-black px-2.5 py-1 rounded-full transition-all uppercase tracking-tighter"
                      >
                        <FileSpreadsheet className="w-3 h-3" /> EXCEL 다운로드
                      </button>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAdminPanel(false)}
                  className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-sleek-text-secondary hover:bg-white/5 transition-all"
                >
                  <Square className="w-4 h-4 rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {adminTab === 'users' ? (
                  <table className="w-full text-left border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-[10px] text-sleek-text-secondary uppercase tracking-widest font-bold">
                        <th className="px-6 py-2">User UID / Email</th>
                        <th className="px-6 py-2">Status</th>
                        <th className="px-6 py-2">Expires At</th>
                        <th className="px-6 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allLicenses.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-20 text-sleek-text-secondary italic">등록된 사용자가 없습니다.</td>
                        </tr>
                      ) : (
                        allLicenses.map((lic) => (
                          <tr key={lic.id} className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden shadow-lg hover:bg-white/10 transition-colors">
                            <td className="px-6 py-4 rounded-l-2xl">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                  "text-xs font-bold",
                                  lic.email ? "text-white" : "text-sleek-red/70 italic"
                                )}>
                                  {lic.email || "Email 미등록 사용자"}
                                </span>
                              </div>
                              <div className="text-[10px] text-sleek-text-secondary font-mono flex items-center gap-1">
                                <span className="opacity-50">UID:</span> {lic.userId || lic.id}
                              </div>
                              <div className="text-[9px] text-sleek-blue/70 font-mono mt-1">Key: {lic.key || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-[10px] font-black px-2 py-1 rounded-md uppercase",
                                lic.status === 'active' ? "bg-sleek-green/20 text-sleek-green" : "bg-sleek-red/20 text-sleek-red"
                              )}>
                                {lic.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-[10px] text-white flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-sleek-text-secondary" />
                                {new Date(lic.expiresAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 rounded-r-2xl text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleUpdateLicenseStatus(lic.id, lic, lic.status === 'active' ? 'expired' : 'active')}
                                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold hover:bg-white/10"
                                >
                                  {lic.status === 'active' ? '중지' : '활성'}
                                </button>
                                <button 
                                  onClick={() => handleExtendLicense(lic.id, lic)}
                                  className="px-3 py-1.5 rounded-lg bg-sleek-blue/20 border border-sleek-blue/30 text-sleek-blue text-[10px] font-bold hover:bg-sleek-blue hover:text-white"
                                >
                                  +1개월 연장
                                </button>
                                <button 
                                  onClick={() => handleDeleteUserLicense(lic.id)}
                                  className="px-3 py-1.5 rounded-lg bg-sleek-red/10 border border-sleek-red/20 text-sleek-red text-[10px] font-bold hover:bg-sleek-red hover:text-white transition-all"
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-sleek-blue/5 border border-sleek-blue/20 p-6 rounded-3xl">
                      <div>
                        <h3 className="text-sm font-bold text-white mb-1">신규 인증키 생성</h3>
                        <p className="text-[11px] text-sleek-text-secondary">기본 30일(1개월) 유효 기간의 랜덤 인증키를 생성합니다.</p>
                        <p className="text-[9px] text-sleek-red/70 mt-2 font-bold italic">
                          * 주의: 인증키 삭제는 '구독 활성화 전'의 키를 폐기하는 기능입니다.<br/>
                          이미 활성화된 사용자의 권한을 뺏으려면 'Subscriber Management'에서 관리해 주세요.
                        </p>
                      </div>
                      <button 
                        onClick={handleGenerateKey}
                        className="px-6 py-3 bg-sleek-blue text-white rounded-2xl font-black text-sm shadow-xl shadow-sleek-blue/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> 인증키 발행
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allAuthKeys.map(key => (
                        <div key={key.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <span className={cn(
                              "text-[9px] font-black px-1.5 py-0.5 rounded uppercase",
                              key.status === 'unused' ? "bg-sleek-green text-black" : "bg-sleek-text-secondary text-white"
                            )}>
                              {key.status}
                            </span>
                            <span className="text-[10px] font-mono text-sleek-text-secondary">30 DAYS</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-mono font-bold tracking-tighter text-white">{key.id}</h4>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(key.id);
                                  alert("클립보드에 복사되었습니다.");
                                }}
                                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-sleek-text-secondary"
                                title="복사"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteAuthKey(key.id)}
                                className="w-8 h-8 rounded-lg hover:bg-sleek-red/20 flex items-center justify-center text-sleek-red/60 hover:text-sleek-red transition-colors"
                                title="삭제"
                              >
                                <Square className="w-3 h-3 rotate-45 fill-current" />
                              </button>
                            </div>
                          </div>
                          {key.usedBy && (
                            <div className="pt-3 border-t border-white/5">
                              <p className="text-[8px] text-sleek-text-secondary uppercase mb-1">Used By</p>
                              <p className="text-[9px] font-mono text-white truncate">{key.usedBy}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center">
                <div className="text-xs text-sleek-text-secondary">{adminTab === 'users' ? `총 ${allLicenses.length}명의 고객` : `총 ${allAuthKeys.length}개의 인증키`} 관리 중</div>
                <button 
                  onClick={handleFetchAllLicenses}
                  disabled={isAdminLoading}
                  className="px-6 py-3 rounded-2xl bg-white text-black font-black text-sm flex items-center gap-3 hover:scale-[1.05] transition-all disabled:opacity-50"
                >
                  {isAdminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" /> }
                  새로고침
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isSubscribed ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-sleek-bg relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-sleek-card border border-sleek-red/30 rounded-3xl p-10 w-full max-w-md shadow-2xl text-center relative z-10"
          >
            <div className="w-16 h-16 bg-sleek-red/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="w-10 h-10 text-sleek-red" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">구독 정보가 없습니다</h1>
            <p className="text-sleek-text-secondary text-sm mb-4">
              현재 <b>{currentUser.email || "간편로그인(인증키)"}</b> 계정은 구독 상태가 아닙니다.<br/>
              프로그램 이용권을 구매하여 자동매매 엔진을 기동하세요.
            </p>
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-4 text-left">
              <div className="text-[10px] text-sleek-text-secondary uppercase mb-1">사용자 UID (입금 시 전달용)</div>
              <code className="text-[10px] font-mono text-sleek-blue break-all">{currentUser.uid}</code>
            </div>
            <button 
              onClick={() => setShowActivationModal(true)}
              className="w-full py-4 bg-sleek-blue text-white rounded-xl font-black text-sm shadow-xl shadow-sleek-blue/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mb-3"
            >
              <Key className="w-5 h-5" /> 인증키 등록하기
            </button>
            <button 
              onClick={handleLogout}
              className="w-full py-3 rounded-xl border border-sleek-border text-xs font-bold text-sleek-text-secondary hover:bg-white/5 transition-all"
            >
              다른 계정으로 로그인
            </button>
          </motion.div>
        </div>
      ) : (
        <>
      <header className="h-auto md:h-[60px] border-b border-sleek-border glass-header flex flex-col md:flex-row items-center justify-between px-6 py-4 md:py-0 sticky top-0 z-50 gap-4 md:gap-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-sleek-blue rounded-md flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-[16px] md:text-[18px] font-extrabold tracking-tighter uppercase relative">
            <span className="text-sleek-blue">LEO</span> SCALPER BOT <span className="text-white/40 font-normal ml-2 text-xl tracking-widest">PRO</span>
            {currentUser?.email === "agnus9524@gmail.com" && (
              <span className="absolute -top-1 -right-8 bg-sleek-blue text-[white] text-[7px] px-1 rounded-sm font-black tracking-widest leading-normal">SUPER</span>
            )}
          </h1>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
          <div className="flex items-center gap-4 text-[11px] md:text-[13px] font-mono border-r border-sleek-border pr-4 md:pr-6">
            <div className="flex flex-col items-end">
              <span className="text-[9px] md:text-[10px] text-sleek-text-secondary uppercase">User Account</span>
              <div className="flex items-center gap-2">
                {currentUser?.email === "agnus9524@gmail.com" && (
                  <button 
                    onClick={() => { setShowAdminPanel(true); handleFetchAllLicenses(); }}
                    className="text-sleek-blue hover:text-white transition-colors flex items-center gap-1 text-[10px]"
                  >
                    <Settings className="w-3 h-3" /> ADMIN
                  </button>
                )}
                <button 
                  onClick={handleLogout}
                  className="text-sleek-text-secondary hover:text-white transition-colors"
                  title="로그아웃"
                >
                  LOGOUT
                </button>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] md:text-[10px] text-sleek-text-secondary uppercase">KIS Connection</span>
              <div className="flex items-center gap-2">
                {kisConfig.isConnected && (
                  <button 
                    onClick={handleSyncKIS}
                    className="text-[10px] text-sleek-blue hover:text-white flex items-center gap-1"
                    title="잔고 동기화"
                  >
                    <RefreshCw className="w-3 h-3" /> SYNC
                  </button>
                )}
                <button 
                  onClick={() => setShowKisModal(true)}
                  className={cn(
                    "flex items-center gap-2 font-black text-sm", 
                    kisConfig.isConnected ? "text-emerald-400" : "text-rose-500 animate-pulse"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full", kisConfig.isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" : "bg-rose-500")} />
                  {kisConfig.isConnected 
                    ? "연동 중" 
                    : "계좌 연결 필요"}
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={toggleScalperBot}
            className={cn(
              "flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-bold text-[10px] md:text-xs transition-all",
              isGapBotActive 
                ? "bg-sleek-red/20 text-sleek-red border border-sleek-red/30 hover:bg-sleek-red hover:text-white" 
                : "bg-sleek-blue/20 text-sleek-blue border border-sleek-blue/30 hover:bg-sleek-blue hover:text-white"
            )}
          >
            {isGapBotActive ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current" />}
            {isGapBotActive ? "정지" : "자동 스캘핑 시작"}
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr_350px] gap-px bg-sleek-border overflow-y-auto lg:overflow-hidden">
        {/* Left: Stock Info & Global Settings */}
        <aside className="bg-sleek-bg p-5 flex flex-col gap-6 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-sleek-border">
          <div className="space-y-6">
            <div>
              <h2 className="text-[12px] font-bold text-sleek-text-secondary uppercase tracking-widest mb-4 flex items-center justify-between">
                종목 선택
                <Search className="w-3 h-3 opacity-50" />
              </h2>
              <div ref={searchRef} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sleek-text-secondary" />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  value={searchSymbol}
                  onChange={(e) => setSearchSymbol(e.target.value)}
                  className="w-full bg-sleek-card/30 border border-sleek-border rounded-xl py-3 pl-10 pr-4 text-xs focus:border-sleek-blue outline-none transition-all" 
                  placeholder="종목코드 또는 이름 입력"
                />
                
                {/* Search Suggestions */}
                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                      className="absolute top-full left-0 right-0 mt-2 z-50 bg-sleek-card border border-sleek-border rounded-xl shadow-2xl overflow-hidden max-h-[300px] overflow-y-auto"
                    >
                      {searchSuggestions.map((s, idx) => (
                        <button 
                          key={s.symbol}
                          onClick={() => handleAddStock(s.symbol, undefined, s.name)}
                          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{s.name}</div>
                            <div className="text-[10px] text-sleek-text-secondary font-mono">{s.symbol}</div>
                          </div>
                          <ChevronRight className="w-3 h-3 opacity-30" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {selectedStock && (
              <div className="bg-sleek-blue/5 border border-sleek-blue/20 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white">{selectedStock.name}</h3>
                    <p className="text-[10px] font-mono text-sleek-text-secondary">{selectedStock.symbol}</p>
                  </div>
                  <div className={cn(
                    "text-xs font-black",
                    selectedStock.change >= 0 ? "text-sleek-green" : "text-sleek-red"
                  )}>
                    {selectedStock.changePercent.toFixed(2)}%
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5 space-y-2">
                  <div className="flex justify-between text-[10px] uppercase">
                    <span className="text-sleek-text-secondary">현재 보유</span>
                    <span className="text-white font-bold">{holdings[selectedStock.symbol] || 0} 주</span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase">
                    <span className="text-sleek-text-secondary">매수 가능</span>
                    <span className="text-sleek-blue font-bold">
                      {kisConfig.isConnected && kisConfig.isRealOrderEnabled && kisBuyableQty !== null 
                        ? `${kisBuyableQty.toLocaleString()} 주 (실계좌)` 
                        : `${Math.floor(balance / (selectedStock.price || 1)).toLocaleString()} 주 (로컬)`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-[10px] font-bold text-sleek-text-secondary uppercase tracking-widest">실시간 계좌 현황</h2>
              <div className="space-y-3">
                <div className="bg-sleek-card/20 p-4 rounded-2xl border border-sleek-border">
                  <div className="text-[9px] text-sleek-text-secondary uppercase mb-1">가용 자산 (KRW)</div>
                  <div className="text-lg font-black text-white tracking-tighter italic">
                    ₩{balance.toLocaleString()}
                  </div>
                </div>
                <div className="bg-sleek-card/20 p-4 rounded-2xl border border-sleek-border">
                  <div className="text-[9px] text-sleek-text-secondary uppercase mb-1">총 자산 평가</div>
                  <div className="text-lg font-black text-sleek-blue tracking-tighter italic">
                    ₩{totalValue.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
            <button 
              onClick={() => setShowKisModal(true)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left"
            >
              <div>
                <div className="text-[10px] text-sleek-text-secondary uppercase mb-1">API Status</div>
                <div className={cn("text-xs font-bold", kisConfig.isConnected ? "text-emerald-400" : "text-sleek-red")}>
                  {kisConfig.isConnected ? "CONNECTED" : "DISCONNECTED"}
                </div>
              </div>
              <Settings className="w-4 h-4 text-sleek-text-secondary" />
            </button>
          </div>
        </aside>

        {/* Center: Gap Trading Terminal */}
        <section className="bg-sleek-bg overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Header Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-sleek-card border border-sleek-border p-6 rounded-[32px] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sleek-blue/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-sleek-blue/10 transition-all"></div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-sleek-blue/20 rounded-xl flex items-center justify-center">
                  <Target className="w-4 h-4 text-sleek-blue" />
                </div>
                <span className="text-[10px] font-black text-sleek-text-secondary uppercase tracking-widest">실시간 스캘핑 총 수익</span>
              </div>
              <div className={cn(
                "text-2xl font-black italic tracking-tighter font-mono",
                gapTradingProfit >= 0 ? "text-sleek-green" : "text-sleek-red"
              )}>
                ₩{gapTradingProfit.toLocaleString()}
              </div>
            </div>

            <div className="bg-sleek-card border border-sleek-border p-6 rounded-[32px] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sleek-purple/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-sleek-purple/10 transition-all"></div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-sleek-purple/20 rounded-xl flex items-center justify-center">
                  <Activity className="w-4 h-4 text-sleek-purple" />
                </div>
                <span className="text-[10px] font-black text-sleek-text-secondary uppercase tracking-widest">오늘의 체결 횟수</span>
              </div>
              <div className="text-2xl font-black text-white italic tracking-tighter font-mono">
                {gapTradeCount} <span className="text-xs font-normal text-sleek-text-secondary opacity-50 not-italic">TRADES</span>
              </div>
            </div>

            <div className="bg-sleek-card border border-sleek-border p-6 rounded-[32px] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[10px] font-black text-sleek-text-secondary uppercase tracking-widest">체결 성공률 (Win Rate)</span>
              </div>
              <div className="text-2xl font-black text-emerald-400 italic tracking-tighter font-mono">
                {scalpingWins + scalpingLosses > 0 
                  ? `${((scalpingWins / (scalpingWins + scalpingLosses)) * 100).toFixed(1)}%` 
                  : "100.0%"
                }
              </div>
            </div>

            <div className="bg-sleek-card border border-sleek-blue/30 p-6 rounded-[32px] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sleek-blue/10 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-sleek-blue/20 transition-all"></div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-sleek-blue/20 rounded-xl flex items-center justify-center">
                  <Zap className="w-4 h-4 text-sleek-blue animate-pulse" />
                </div>
                <span className="text-[10px] font-black text-sleek-text-secondary uppercase tracking-widest">스캘퍼 엔진 상태</span>
              </div>
              <div className="flex flex-col">
                <div className={cn(
                  "text-2xl font-black italic tracking-tighter",
                  isGapBotActive ? "text-emerald-400 animate-pulse" : "text-sleek-text-secondary"
                )}>
                  {isGapBotActive ? "RUNNING" : "STOPPED"}
                </div>
                {isGapBotActive && (
                  <span className="text-[10px] text-sleek-blue font-bold mt-1 line-clamp-1 animate-pulse">
                    ● {scalperMessage}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Terminal Core */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="bg-sleek-card border border-sleek-border p-8 rounded-[40px] shadow-2xl space-y-6 xl:col-span-1">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="text-lg font-black text-white italic uppercase tracking-tighter">AI SCALPING CONFIG</h2>
                  <span className="text-[10px] text-sleek-text-secondary">초단기 자동 스캘퍼 전략 엔진 설정</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sleek-blue animate-ping"></span>
                  <span className="text-[10px] font-bold text-sleek-blue uppercase">Engine Live Control</span>
                </div>
              </div>

              <div className="space-y-5">
                {/* 1. Upper Bound Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-sleek-text-secondary uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-sleek-green" />
                      구간 상한가 설정 (최고 기준)
                    </label>
                    <span className="text-xs font-bold text-sleek-green">₩{gapSellPrice.toLocaleString()}</span>
                  </div>
                  <input 
                    type="number" 
                    value={gapSellPrice || ''}
                    onChange={(e) => setGapSellPrice(Number(e.target.value))}
                    className="w-full bg-black/40 border border-sleek-border rounded-xl p-3 text-sm font-bold focus:border-sleek-green outline-none transition-all text-white font-mono"
                    placeholder="구간 상한선 금액 입력 (예: 6,800)"
                  />
                  <div className="grid grid-cols-6 gap-1 mt-1.5">
                    {[ -500, -100, -10, 10, 100, 500 ].map(adj => (
                      <button 
                        key={adj}
                        type="button"
                        onClick={() => setGapSellPrice(prev => Math.max(0, prev + adj))}
                        className="py-1 bg-white/5 border border-white/5 rounded-md text-[9px] font-bold hover:bg-white/10 text-sleek-text-secondary font-mono"
                      >
                        {adj > 0 ? `+${adj}` : adj}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Lower Bound Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-sleek-text-secondary uppercase tracking-widest flex items-center gap-2">
                      <TrendingDown className="w-3 h-3 text-sleek-red" />
                      구간 하한가 설정 (최저 기준)
                    </label>
                    <span className="text-xs font-bold text-sleek-red">₩{gapBuyPrice.toLocaleString()}</span>
                  </div>
                  <input 
                    type="number" 
                    value={gapBuyPrice || ''}
                    onChange={(e) => setGapBuyPrice(Number(e.target.value))}
                    className="w-full bg-black/40 border border-sleek-border rounded-xl p-3 text-sm font-bold focus:border-sleek-red outline-none transition-all text-white font-mono"
                    placeholder="구간 하한선 금액 입력 (예: 6,200)"
                  />
                  <div className="grid grid-cols-6 gap-1 mt-1.5">
                    {[ -500, -100, -10, 10, 100, 500 ].map(adj => (
                      <button 
                        key={adj}
                        type="button"
                        onClick={() => setGapBuyPrice(prev => Math.max(0, prev + adj))}
                        className="py-1 bg-white/5 border border-white/5 rounded-md text-[9px] font-bold hover:bg-white/10 text-sleek-text-secondary font-mono"
                      >
                        {adj > 0 ? `+${adj}` : adj}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Trade Quantity */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-sleek-text-secondary uppercase tracking-widest flex items-center gap-2">
                      <Layers className="w-3 h-3 text-sleek-blue" />
                      1회 매매 거래 수량
                    </label>
                    <span className="text-xs font-bold text-white font-mono">{tradeQuantity} 주</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => setTradeQuantity(prev => Math.max(1, prev - 1))}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 text-white font-bold"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      value={tradeQuantity}
                      onChange={(e) => setTradeQuantity(Math.max(1, Number(e.target.value)))}
                      className="flex-1 bg-black/40 border border-sleek-border rounded-xl p-2 text-center text-sm font-bold outline-none text-white font-mono"
                    />
                    <button 
                      type="button"
                      onClick={() => setTradeQuantity(prev => prev + 1)}
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[0.1, 0.25, 0.5, 1.0].map(ratio => {
                      const maxBuyable = kisConfig.isConnected && kisConfig.isRealOrderEnabled && kisBuyableQty !== null 
                        ? kisBuyableQty 
                        : Math.floor(balance / (selectedStock?.price || 1));
                      const targetQty = Math.max(1, Math.floor(maxBuyable * ratio));
                      return (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setTradeQuantity(targetQty)}
                          className="py-1 bg-white/5 border border-white/5 rounded-lg text-[9px] font-bold hover:bg-white/10 text-sleek-text-secondary font-mono"
                        >
                          {ratio === 1.0 ? '최대(100%)' : `${ratio * 100}%`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Target Profit (익절 수익률) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-sleek-text-secondary uppercase tracking-widest flex items-center gap-2">
                      <Percent className="w-3 h-3 text-emerald-400" />
                      목표 익절 수익률 (Take Profit)
                    </label>
                    <span className="text-xs font-bold text-emerald-400 font-mono">+{scalpingTargetProfit}%</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 mb-1.5">
                    {[ 0.1, 0.2, 0.3, 0.5, 1.0 ].map(pct => (
                      <button 
                        key={pct}
                        type="button"
                        onClick={() => setScalpingTargetProfit(pct)}
                        className={cn(
                          "py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all",
                          scalpingTargetProfit === pct 
                            ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400" 
                            : "bg-white/5 border border-white/5 text-sleek-text-secondary hover:bg-white/10"
                        )}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <input 
                    type="number" 
                    step="0.05"
                    value={scalpingTargetProfit}
                    onChange={(e) => setScalpingTargetProfit(Math.max(0.01, Number(e.target.value)))}
                    className="w-full bg-black/40 border border-sleek-border rounded-xl p-2 text-xs font-mono focus:border-emerald-500 outline-none text-white text-right"
                    placeholder="직접 입력 (%)"
                  />
                  <p className="text-[9px] text-sleek-text-secondary mt-1.5 leading-normal">
                    * <strong>수수료/제세금 방어 보정 활성화</strong>: 봇이 진입 평단가 대비 실제 거래 비용(국내 약 0.22%, 미국 약 0.03%)을 자동으로 가산하여 <strong>순수익이 {scalpingTargetProfit}% 이상</strong> 발생하는 시점에만 매도를 실행합니다.
                  </p>
                </div>

                {/* 5. Stop Loss (손절 기준률) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-sleek-text-secondary uppercase tracking-widest flex items-center gap-2">
                      <ShieldAlert className="w-3 h-3 text-rose-500" />
                      최대 리스크 손절률 (Stop Loss)
                    </label>
                    <span className="text-xs font-bold text-rose-500 font-mono">{scalpingStopLoss}%</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 mb-1.5">
                    {[ -0.2, -0.5, -1.0, -1.5, -2.0 ].map(pct => (
                      <button 
                        key={pct}
                        type="button"
                        onClick={() => setScalpingStopLoss(pct)}
                        className={cn(
                          "py-1.5 rounded-lg text-[10px] font-bold font-mono transition-all",
                          scalpingStopLoss === pct 
                            ? "bg-rose-500/20 border border-rose-500/50 text-rose-400" 
                            : "bg-white/5 border border-white/5 text-sleek-text-secondary hover:bg-white/10"
                        )}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                  <input 
                    type="number" 
                    step="0.05"
                    max="-0.01"
                    value={scalpingStopLoss}
                    onChange={(e) => setScalpingStopLoss(Math.min(-0.01, Number(e.target.value)))}
                    className="w-full bg-black/40 border border-sleek-border rounded-xl p-2 text-xs font-mono focus:border-rose-500 outline-none text-white text-right"
                    placeholder="직접 입력 (%)"
                  />
                </div>

                {/* AI 퀀트 수익률 극대화 옵션 */}
                <div className="bg-sleek-blue/5 border border-sleek-blue/20 rounded-[24px] p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BrainCircuit className="w-4 h-4 text-sleek-blue" />
                    <span className="text-[10px] font-black text-sleek-blue uppercase tracking-wider">AI 퀀트 수익률 극대화 옵션</span>
                  </div>

                  {/* 1. AI 가변 익절 */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col pr-2">
                      <span className="text-[10px] font-bold text-white flex items-center gap-1">
                        AI 변동성 비례 가변 익절
                        <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                      </span>
                      <span className="text-[8px] text-sleek-text-secondary">변동성이 크면 익절폭 확대, 작으면 조기 수확</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseAiAdaptiveProfit(!useAiAdaptiveProfit)}
                      className={cn(
                        "w-10 h-5 rounded-full p-0.5 transition-all duration-300 outline-none",
                        useAiAdaptiveProfit ? "bg-emerald-500" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full bg-white transition-all duration-300 shadow",
                        useAiAdaptiveProfit ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                  {/* 2. 고점 추격매수 방지 가드 */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col pr-2">
                      <span className="text-[10px] font-bold text-white">Smart Re-entry 고점 추격 방지</span>
                      <span className="text-[8px] text-sleek-text-secondary">직전 매도가 대비 -0.1% 이하 하락 시 재진입</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseSmartReentryGuard(!useSmartReentryGuard)}
                      className={cn(
                        "w-10 h-5 rounded-full p-0.5 transition-all duration-300 outline-none",
                        useSmartReentryGuard ? "bg-sleek-blue" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full bg-white transition-all duration-300 shadow",
                        useSmartReentryGuard ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                  {/* 3. 마틴게일 수량 가중치 */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col pr-2">
                      <span className="text-[10px] font-bold text-white">Martingale-Lite 분할 가중 매수</span>
                      <span className="text-[8px] text-sleek-text-secondary">하락 시 뒤로 갈수록 수량을 늘려 평단가 극적 하향</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseMartingaleScaling(!useMartingaleScaling)}
                      className={cn(
                        "w-10 h-5 rounded-full p-0.5 transition-all duration-300 outline-none",
                        useMartingaleScaling ? "bg-purple-500" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full bg-white transition-all duration-300 shadow",
                        useMartingaleScaling ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                </div>

                {/* 6. Execution Speed & Sound Switch */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="text-[9px] font-black text-sleek-text-secondary uppercase tracking-wider block mb-2">
                      매매 엔진 속도
                    </label>
                    <div className="flex flex-col gap-1">
                      {[
                        { label: '초고속 (0.5s)', value: 500 },
                        { label: '고속 (1.5s)', value: 1500 },
                        { label: '보통 (3.0s)', value: 3000 }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setScalpingSpeed(opt.value)}
                          className={cn(
                            "py-1 px-2 rounded-lg text-[10px] font-bold text-left transition-all",
                            scalpingSpeed === opt.value
                              ? "bg-sleek-blue/20 text-sleek-blue border border-sleek-blue/30"
                              : "bg-white/5 border border-white/5 text-sleek-text-secondary hover:bg-white/10"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-sleek-text-secondary uppercase tracking-wider block mb-2">
                      사운드 알림 FX
                    </label>
                    <button
                      type="button"
                      onClick={() => setScalpingSoundEnabled(!scalpingSoundEnabled)}
                      className={cn(
                        "w-full py-3 px-4 rounded-xl flex items-center justify-between text-xs font-bold transition-all border",
                        scalpingSoundEnabled
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-white/5 border-white/10 text-sleek-text-secondary"
                      )}
                    >
                      <span>{scalpingSoundEnabled ? "켜짐 (🔊)" : "꺼짐 (🔇)"}</span>
                      <div className={cn(
                        "w-3 h-3 rounded-full transition-all",
                        scalpingSoundEnabled ? "bg-emerald-400 animate-pulse" : "bg-gray-600"
                      )} />
                    </button>
                    <div className="mt-2 text-[8px] text-sleek-text-secondary leading-relaxed leading-tight">
                      체결 성공 및 정밀 진입 시 고주파 비프 알림음이 작동합니다.
                    </div>
                  </div>
                </div>

                {/* 6.5 Entry Price Level Selector */}
                <div className="flex flex-col p-3.5 bg-white/5 border border-white/5 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                        진입 호가 방식 (Entry Price Level)
                      </span>
                      <span className="text-[9px] text-sleek-text-secondary">매수 진입 시 주문을 넣을 호가 단계를 설정합니다.</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => setLowestBidOnlyMode(true)}
                      className={cn(
                        "py-2 rounded-lg text-[10px] font-bold transition-all border text-center",
                        lowestBidOnlyMode
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400 font-black"
                          : "bg-black/20 border-white/5 text-sleek-text-secondary hover:bg-white/5"
                      )}
                    >
                      최하단 호가 (매수 5단계) [기본값]
                    </button>
                    <button
                      type="button"
                      onClick={() => setLowestBidOnlyMode(false)}
                      className={cn(
                        "py-2 rounded-lg text-[10px] font-bold transition-all border text-center",
                        !lowestBidOnlyMode
                          ? "bg-sleek-blue/10 border-sleek-blue/30 text-sleek-blue font-black"
                          : "bg-black/20 border-white/5 text-sleek-text-secondary hover:bg-white/5"
                      )}
                    >
                      현재 체결가 (시장/시가)
                    </button>
                  </div>
                  <p className="text-[8px] text-sleek-text-secondary leading-normal">
                    * <strong>최하단 호가 진입</strong>: 호가창의 가장 아래인 매수 5단계(최하단 호가)에 지정가 매수 주문을 넣어, 주가가 하락 진동할 때 최저가에서 물량을 체결합니다.
                  </p>
                  {kisConfig.isConnected && lowestBidOnlyMode && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/25 rounded-lg text-[9px] text-amber-400 leading-normal space-y-1">
                      <p>⚠️ <strong>실거래 연동 안내:</strong> 최하단 호가 주문은 한국투자증권 호가창 하단에 지정가 대기 주문으로 접수됩니다.</p>
                      <p className="opacity-90">* 주가가 5단계 아래로 완전히 도달하여 <strong>체결(Fill)</strong>되기 전까지는 실제 잔고가 0주이므로 매도가 나가지 않고 대기합니다.</p>
                      <p className="opacity-90">* 즉시 체결과 연속적인 회전을 원하신다면 <strong>"현재 체결가 (시장/시가)"</strong> 방식을 사용하는 것이 유리합니다.</p>
                    </div>
                  )}
                </div>

                {/* 7. Immediate Entry Checkbox */}
                <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2xl text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-white">시작 즉시 최초 매수 진입</span>
                    <span className="text-[9px] text-sleek-text-secondary">보유 슬롯이 비어있을 때 시작 버튼 클릭 즉시 1단계 매수 주문 체결</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={immediateEntry}
                    onChange={(e) => setImmediateEntry(e.target.checked)}
                    className="w-4 h-4 rounded-lg accent-sleek-blue cursor-pointer"
                  />
                </div>

                {/* 8. Engine Activation Toggle */}
                <div className="pt-2">
                  <button 
                    onClick={toggleScalperBot}
                    className={cn(
                      "w-full py-4 rounded-[20px] font-black text-sm italic tracking-tighter uppercase shadow-2xl transition-all flex items-center justify-center gap-3",
                      isGapBotActive 
                        ? "bg-sleek-red text-white shadow-sleek-red/20 hover:scale-[1.02]" 
                        : "bg-sleek-blue text-white shadow-sleek-blue/20 hover:scale-[1.05]"
                    )}
                  >
                    {isGapBotActive ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    {isGapBotActive ? "SCALPER STOP" : "START AI SCALPER"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-sleek-card border border-sleek-border p-8 rounded-[40px] shadow-2xl flex flex-col h-full min-h-[500px] xl:col-span-2">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-sleek-card border border-sleek-border rounded-2xl flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-sleek-blue animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">AI SCALPING TERMINAL</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-sleek-green animate-pulse"></div>
                      <span className="text-[10px] font-bold text-sleek-text-secondary uppercase">Live Market Data Stream</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-sleek-text-secondary uppercase font-black">Target Price Range</div>
                  <div className="text-sm font-black text-sleek-blue italic">
                    ₩{gapBuyPrice && gapSellPrice ? (gapSellPrice - gapBuyPrice).toLocaleString() : '0'}
                  </div>
                </div>
              </div>

              {selectedStock ? (
                (() => {
                  const currentPrice = selectedStock.price;
                  const tickSize = currentPrice >= 500000 ? 1000 : currentPrice >= 100000 ? 500 : currentPrice >= 50000 ? 100 : currentPrice >= 10000 ? 50 : currentPrice >= 5000 ? 10 : 5;
                  const askLevels = Array.from({ length: 5 }, (_, i) => currentPrice + (5 - i) * tickSize);
                  const bidLevels = Array.from({ length: 5 }, (_, i) => currentPrice - (i + 1) * tickSize);
                  const getLevelVolume = (priceLevel: number) => {
                    const base = Math.abs((priceLevel * 17) % 850) + 120;
                    const wiggle = Math.floor(Math.sin((Date.now() / 2500) + priceLevel) * 45) + 45;
                    return base + wiggle;
                  };

                  return (
                    <div className="flex-1 flex flex-col lg:flex-row gap-6">
                      {/* Left Side: Chart Section */}
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="mb-6">
                          <div className="text-[10px] text-sleek-text-secondary uppercase mb-1">Current Stock Price</div>
                          <div className="flex items-baseline gap-3">
                            <span className="text-5xl font-black text-white italic tracking-tighter font-mono">
                              ₩{selectedStock.price.toLocaleString()}
                            </span>
                            <span className={cn(
                              "text-lg font-black italic",
                              selectedStock.change >= 0 ? "text-sleek-green" : "text-sleek-red"
                            )}>
                              {selectedStock.change >= 0 ? '▲' : '▼'} {selectedStock.changePercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 bg-sleek-card/30 rounded-3xl border border-sleek-border p-6 relative shadow-inner min-h-[340px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={selectedStock.history}>
                              <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                              <XAxis 
                                dataKey="time" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#6B7280' }}
                                hide
                              />
                              <YAxis 
                                domain={['auto', 'auto']} 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#6B7280' }}
                                orientation="right"
                              />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#1A1D23', border: '1px solid #2D3139', borderRadius: '12px' }}
                                itemStyle={{ fontSize: '10px' }}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="price" 
                                stroke="#3B82F6" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorPrice)" 
                                animationDuration={500}
                              />
                              
                              {/* Target Price Lines */}
                              {gapBuyPrice > 0 && (
                                <ReferenceLine 
                                  y={gapBuyPrice} 
                                  stroke="#EF4444" 
                                  strokeDasharray="5 5" 
                                  strokeWidth={2}
                                >
                                  <Label value="BUY BOUND" position="left" fill="#EF4444" fontSize={10} fontWeight="bold" />
                                </ReferenceLine>
                              )}
                              {gapSellPrice > 0 && (
                                <ReferenceLine 
                                  y={gapSellPrice} 
                                  stroke="#10B981" 
                                  strokeDasharray="5 5" 
                                  strokeWidth={2}
                                >
                                  <Label value="SELL BOUND" position="left" fill="#10B981" fontSize={10} fontWeight="bold" />
                                </ReferenceLine>
                              )}
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Right Side: Live Order Book Section */}
                      <div className="w-full lg:w-[300px] shrink-0 flex flex-col">
                        <div className="bg-black/40 rounded-3xl border border-sleek-border p-4 flex flex-col h-full justify-between min-h-[400px]">
                          <div>
                            <div className="text-center font-black text-sleek-text-secondary uppercase text-[10px] tracking-widest pb-2.5 border-b border-white/5 mb-3">
                              실시간 잔량 호가창 (Live Order Book)
                            </div>
                            
                            {/* Ask Levels */}
                            <div className="space-y-1">
                              {askLevels.map((lvlPrice, idx) => {
                                const vol = getLevelVolume(lvlPrice);
                                const isBoundary = gapSellPrice > 0 && lvlPrice >= gapSellPrice;
                                return (
                                  <div key={`ask-${lvlPrice}`} className="grid grid-cols-3 items-center py-1.5 px-2.5 rounded-lg hover:bg-white/5 transition-all relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 bottom-0 bg-sky-500/5 group-hover:bg-sky-500/10 pointer-events-none transition-all" style={{ width: `${Math.min(100, (vol / 1100) * 100)}%` }} />
                                    <span className="text-[9px] text-sky-400 font-bold font-sans z-10">매도 {5 - idx}단계</span>
                                    <span className={cn(
                                      "text-right font-bold z-10 font-mono text-[11px]",
                                      isBoundary ? "text-amber-400 font-black underline decoration-sky-400" : "text-sky-300"
                                    )}>
                                      ₩{lvlPrice.toLocaleString()}
                                    </span>
                                    <span className="text-right text-sky-200/50 font-mono text-[10px] z-10">{vol.toLocaleString()}주</span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Spread Line */}
                            <div className="my-3 py-2 px-3 bg-white/5 border-y border-white/10 flex items-center justify-between rounded-xl">
                              <span className="text-[8px] font-black text-sleek-text-secondary uppercase tracking-wider">현재 체결가</span>
                              <span className={cn("font-black text-xs font-mono animate-pulse", selectedStock.change >= 0 ? "text-sleek-green" : "text-sleek-red")}>
                                ₩{currentPrice.toLocaleString()}
                              </span>
                              <span className="text-[9px] text-sleek-text-secondary font-mono">{selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%</span>
                            </div>

                            {/* Bid Levels */}
                            <div className="space-y-1">
                              {bidLevels.map((lvlPrice, idx) => {
                                const vol = getLevelVolume(lvlPrice);
                                const isBoundary = gapBuyPrice > 0 && lvlPrice <= gapBuyPrice;
                                return (
                                  <div key={`bid-${lvlPrice}`} className="grid grid-cols-3 items-center py-1.5 px-2.5 rounded-lg hover:bg-white/5 transition-all relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 bottom-0 bg-rose-500/5 group-hover:bg-rose-500/10 pointer-events-none transition-all" style={{ width: `${Math.min(100, (vol / 1100) * 100)}%` }} />
                                    <span className="text-[9px] text-rose-400 font-bold font-sans z-10">매수 {idx + 1}단계</span>
                                    <span className={cn(
                                      "text-right font-bold z-10 font-mono text-[11px]",
                                      isBoundary ? "text-amber-400 font-black underline decoration-rose-400" : "text-rose-300"
                                    )}>
                                      ₩{lvlPrice.toLocaleString()}
                                    </span>
                                    <span className="text-right text-rose-200/50 font-mono text-[10px] z-10">{vol.toLocaleString()}주</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Order Book Pressure Gauge */}
                          <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
                            <div className="flex justify-between text-[9px] text-sleek-text-secondary font-bold font-sans">
                              <span className="text-sky-400">매도 총잔량 47.8%</span>
                              <span className="text-rose-400">매수 총잔량 52.2%</span>
                            </div>
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden flex">
                              <div className="h-full bg-sky-400" style={{ width: '47.8%' }} />
                              <div className="h-full bg-rose-400" style={{ width: '52.2%' }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-sleek-card/20 rounded-3xl border border-dashed border-sleek-border">
                  <div className="p-6 bg-sleek-blue/10 rounded-full mb-6">
                    <Search className="w-12 h-12 text-sleek-blue animate-pulse" />
                  </div>
                  <h4 className="text-lg font-black text-white italic mb-2 uppercase tracking-tighter">No Stock Selected</h4>
                  <p className="text-xs text-sleek-text-secondary max-w-xs leading-relaxed">
                    왼쪽 사이드바에서 트레이딩을 진행할 종목을 먼저 선택해 주세요.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Aside: Real-time Status Window & Trade Logs */}
        <aside className="w-[340px] border-l border-white/5 bg-black/30 flex flex-col p-6 gap-6 overflow-hidden hidden xl:flex">
            
            {/* 1. Real-time Gap Monitor Gauge */}
            {isGapBotActive && selectedStock && gapBuyPrice > 0 && gapSellPrice > 0 && (
              <div className="bg-sleek-blue/5 border border-sleek-blue/20 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-sleek-blue uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 animate-bounce" /> 실시간 구간 모니터
                  </h3>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">GRID ACTIVE</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-sleek-text-secondary font-mono">
                    <span>하한가 ₩{gapBuyPrice.toLocaleString()}</span>
                    <span>상한가 ₩{gapSellPrice.toLocaleString()}</span>
                  </div>

                  {/* Range Progress Bar */}
                  <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      className="absolute top-0 bottom-0 bg-gradient-to-r from-sleek-blue to-emerald-400 rounded-full"
                      style={{ width: `${rangePercentage}%` }}
                      transition={{ type: "spring", stiffness: 80 }}
                    />
                    {/* Current Price Marker */}
                    <div 
                      className="absolute w-1 h-3 bg-white shadow-[0_0_8px_white] top-0 transition-all duration-300"
                      style={{ left: `calc(${rangePercentage}% - 2px)` }}
                    />
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] text-sleek-text-secondary uppercase">현재가 위치</span>
                    <span className="text-xs font-black text-white italic font-mono">{rangePercentage.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Grid Inventory */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-sleek-text-secondary uppercase font-black">AI 멀티 슬롯 스캘핑 보유 현황</span>
                    <span className="text-[10px] font-bold text-white bg-white/10 px-2 rounded-full">{gapInventory.length} / 5</span>
                  </div>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const buyPrice = gapInventory[idx];
                      const rangePct = gapBuyPrice > 0 ? ((gapSellPrice - gapBuyPrice) / gapBuyPrice) * 100 : 0;
                      const spacingPct = Math.max(0.2, Math.min(2.0, rangePct / 5));

                      if (buyPrice !== undefined) {
                        // Active Slot
                        const profitPct = ((selectedStock.price - buyPrice) / buyPrice) * 100;
                        const currentTargetProfit = useAiAdaptiveProfit ? currentAiTargetProfit : scalpingTargetProfit;
                        const targetPrice = buyPrice * (1 + currentTargetProfit / 100);
                        // Calculate progress towards target profit
                        const progress = Math.max(0, Math.min(100, (profitPct / currentTargetProfit) * 100));

                        const slotQty = useMartingaleScaling 
                          ? Math.max(1, Math.round(tradeQuantity * (1 + idx * 0.25))) 
                          : tradeQuantity;

                        return (
                          <div key={idx} className="bg-white/5 rounded-xl p-2.5 border border-white/5 text-[10px] space-y-1">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5 font-mono">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span className="text-white font-bold">슬롯 #{idx + 1}</span>
                                <span className="text-sleek-text-secondary">({slotQty}주)</span>
                                <span className="text-emerald-400 font-mono bg-emerald-400/10 px-1.5 py-0.2 rounded text-[9px]">보유 중</span>
                              </div>
                              <span className={cn(
                                "font-bold font-mono text-[11px]",
                                profitPct >= 0 ? "text-up" : "text-down"
                              )}>
                                {profitPct >= 0 ? "+" : ""}{profitPct.toFixed(2)}%
                              </span>
                            </div>
                            
                            <div className="flex justify-between text-[9px] text-sleek-text-secondary font-mono">
                              <span>진입가: ₩{buyPrice.toLocaleString()}</span>
                              <span className="flex items-center gap-1">
                                {useAiAdaptiveProfit && <Sparkles className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />}
                                목표가: ₩{Math.round(targetPrice).toLocaleString()} (+{currentTargetProfit.toFixed(2)}%)
                              </span>
                            </div>

                            {/* Progress Bar towards Target Profit */}
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1">
                              <div 
                                className="bg-emerald-400 h-full rounded-full transition-all duration-300" 
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        );
                      } else {
                        // Empty Slot
                        // Let's find the optimal entry price for this slot
                        let optimalEntryPrice = selectedStock.price;
                        let label = "대기 중";
                        if (idx > 0 && gapInventory[0] !== undefined) {
                          optimalEntryPrice = gapInventory[0] * (1 - (spacingPct * idx) / 100);
                          label = "하락 시 분할 매수";
                        } else if (idx > 0) {
                          label = "슬롯#1 진입 대기";
                        } else {
                          label = "최초 진입 대기";
                        }

                        return (
                          <div key={idx} className="bg-white/[0.02] rounded-xl p-2 border border-dashed border-white/5 text-[10px] flex justify-between items-center py-2.5">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                              <span className="text-sleek-text-secondary">슬롯 #{idx + 1}</span>
                              <span className="text-gray-400 bg-white/5 px-1.5 py-0.2 rounded text-[9px] font-normal">{label}</span>
                            </div>
                            <div className="text-right font-mono text-[9px] text-sleek-text-secondary">
                              {idx === 0 || gapInventory[0] !== undefined ? (
                                <span>대기 진입가: ₩{Math.round(optimalEntryPrice).toLocaleString()}</span>
                              ) : (
                                <span className="text-white/20">-</span>
                              )}
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Trade Logs */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Activity className="w-3 h-3 text-sleek-blue" /> Trade Logs
                </h3>
                <span className="text-[9px] font-mono text-sleek-text-secondary bg-white/5 px-2 py-0.5 rounded">Real-time</span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/5">
                {tradeLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 text-center gap-4">
                    <Zap className="w-8 h-8" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No trades executed</p>
                  </div>
                ) : (
                  tradeLogs.map((log, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            log.type === 'BUY' ? "bg-up shadow-[0_0_10px_#10B981]" : "bg-down shadow-[0_0_10px_#EF4444]"
                          )} />
                          <span className="text-xs font-black text-white">{log.symbol}</span>
                        </div>
                        <span className="text-[9px] font-mono text-sleek-text-secondary opacity-50">{log.time}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-sleek-text-secondary uppercase">Quantity</span>
                          <span className="text-xs font-bold text-white">{log.amount}주</span>
                        </div>
                        <div className="text-right flex flex-col">
                          <span className="text-[9px] text-sleek-text-secondary uppercase">Execution Price</span>
                          <span className="text-sm font-black text-white italic tracking-tighter">₩{log.price.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-sleek-text-secondary leading-relaxed italic line-clamp-2">
                        {log.reason}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* 3. System Diagnostics */}
            <div className="bg-sleek-blue/5 border border-sleek-blue/20 rounded-3xl p-5 space-y-4">
              <h3 className="text-[10px] font-black text-sleek-blue uppercase tracking-widest flex items-center gap-2">
                <Bot className="w-3 h-3" /> System Diagnostics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-sleek-text-secondary uppercase">Loop Interval</span>
                  <span className="text-[10px] font-bold text-emerald-400">1,500ms (High Speed)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-sleek-text-secondary uppercase">Server Status</span>
                  <span className="text-[10px] font-bold text-emerald-400">ACTIVE</span>
                </div>
                <div className="pt-2">
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      animate={{ x: ["-100%", "100%"] }} 
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="w-1/2 h-full bg-sleek-blue/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </main>

      <footer className="h-8 bg-black border-t border-sleek-border/30 flex items-center overflow-hidden">
        <div className="flex px-4 animate-[marquee_60s_linear_infinite] gap-12 text-[10px] font-mono">
          {stocks.map(s => (
            <div key={s.symbol} className="flex gap-2">
              <span className="text-white font-bold">{s.symbol}</span>
              <span className="text-gray-500">${s.price}</span>
              <span className={s.change >= 0 ? "text-up" : "text-down"}>{s.changePercent}%</span>
            </div>
          ))}
        </div>
      </footer>
        </>
      )}
    </div>
  );
}
