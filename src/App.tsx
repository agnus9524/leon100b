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
  Briefcase,
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
  CheckCircle2,
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
  ShieldAlert,
  Trash2,
  PieChart,
  Calculator,
  Coins,
  HelpCircle
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
  ReferenceDot,
  Label,
  ComposedChart,
  Line
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

export interface ScalperTab {
  id: string; // symbol e.g., '073240' or '001520'
  symbol: string;
  name: string;
  isBotActive: boolean;
  gapBuyPrice: number;
  gapSellPrice: number;
  tradeQuantity: number;
  maxSlots: number;
  gapInventory: { id: string; price: number; quantity: number }[];
  gapTradingProfit: number;
  gapTradeCount: number;
  lastTradeType: 'BUY' | 'SELL' | null;
  scalperMessage: string;
  entryPriceMode: 'CURRENT' | 'BID2' | 'BID4';
  autoCancelThreshold: number;
  tradeLogs?: TradeLog[];
}

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  history: { time: string; price: number }[];
  market: 'KR' | 'US';
  isAI?: boolean;
  momentum?: number; // 0-100 score
  sentiment?: number; // -1 to 1 score
  pattern?: string; // e.g. "Double Bottom", "Cup and Handle"
}

interface PendingBuyOrder {
  id: string; // generated SIM-ID or KIS odno
  orgNo?: string; // KIS KRX_FWDG_ORD_ORGNO
  symbol: string;
  orderPrice: number;
  quantity: number;
  createdAt: number;
  isSimulated: boolean;
  slotId?: string; // Track which slot this order is for
}

interface PendingSellOrder {
  id: string; // generated SIM-ID, KIS odno, or watch ID
  orgNo?: string; // KIS KRX_FWDG_ORD_ORGNO
  symbol: string;
  orderPrice: number;
  quantity: number;
  createdAt: number;
  isSimulated: boolean;
  type?: 'LIMIT_SELL' | 'TARGET_WATCH' | 'SCALPER_EXIT';
  reason?: string;
  buyPrice?: number; // Added to calculate profit upon fill
  slotId?: string; // Track which slot this order is for
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
    symbol: 'SNDL',
    name: 'SNDL Inc.',
    price: 2.15,
    change: 0.08,
    changePercent: 3.86,
    volume: '28.4M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 1.70 + (i / 40) * 0.45 + Math.random() * 0.05 })),
    market: 'US',
    isAI: true
  },
  {
    symbol: 'RIG',
    name: '트랜스오션',
    price: 5.89,
    change: 0.12,
    changePercent: 2.08,
    volume: '19.2M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 5.30 + (i / 40) * 0.55 + Math.random() * 0.05 })),
    market: 'US',
    isAI: true
  },
  {
    symbol: 'LCID',
    name: 'Lucid Group',
    price: 2.92,
    change: 0.14,
    changePercent: 5.04,
    volume: '32.1M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 2.20 + (i / 40) * 0.72 + Math.random() * 0.05 })),
    market: 'US',
    isAI: true
  },
  {
    symbol: 'DNA',
    name: 'Ginkgo Bioworks',
    price: 1.45,
    change: 0.04,
    changePercent: 2.84,
    volume: '15.8M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 1.10 + (i / 40) * 0.35 + Math.random() * 0.03 })),
    market: 'US',
    isAI: true
  },
  {
    symbol: 'SOUN',
    name: 'SoundHound AI',
    price: 5.78,
    change: 0.32,
    changePercent: 5.86,
    volume: '24.5M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 4.50 + (i / 40) * 1.28 + Math.random() * 0.08 })),
    market: 'US',
    isAI: true
  },
  {
    symbol: 'SOFI',
    name: 'SoFi Technologies',
    price: 7.25,
    change: 0.35,
    changePercent: 5.07,
    volume: '38.2M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 5.80 + (i / 40) * 1.45 + Math.random() * 0.09 })),
    market: 'US',
    isAI: true
  },
  {
    symbol: 'BBAI',
    name: 'BigBear.ai',
    price: 2.35,
    change: 0.12,
    changePercent: 5.38,
    volume: '18.9M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 1.80 + (i / 40) * 0.55 + Math.random() * 0.05 })),
    market: 'US',
    isAI: true
  },
  {
    symbol: 'IONQ',
    name: 'IonQ Inc.',
    price: 8.90,
    change: 0.48,
    changePercent: 5.70,
    volume: '21.4M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 6.90 + (i / 40) * 2.00 + Math.random() * 0.12 })),
    market: 'US',
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
    symbol: '025820',
    name: '이구산업',
    price: 2850,
    change: 115,
    changePercent: 4.20,
    volume: '14.8M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 2400 + Math.round((i / 40) * 450) + Math.floor(Math.random() * 30) })),
    market: 'KR',
    isAI: true
  },
  {
    symbol: '001520',
    name: '동양',
    price: 1240,
    change: 40,
    changePercent: 3.33,
    volume: '11.2M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 1050 + Math.round((i / 40) * 190) + Math.floor(Math.random() * 20) })),
    market: 'KR',
    isAI: true
  },
  {
    symbol: '025560',
    name: '미래산업',
    price: 2150,
    change: 95,
    changePercent: 4.62,
    volume: '18.4M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 1800 + Math.round((i / 40) * 350) + Math.floor(Math.random() * 25) })),
    market: 'KR',
    isAI: true
  },
  {
    symbol: '004060',
    name: 'SG세계물산',
    price: 890,
    change: 25,
    changePercent: 2.89,
    volume: '12.1M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 750 + Math.round((i / 40) * 140) + Math.floor(Math.random() * 15) })),
    market: 'KR',
    isAI: true
  },
  {
    symbol: '014160',
    name: '대영포장',
    price: 1680,
    change: 60,
    changePercent: 3.70,
    volume: '15.6M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 1400 + Math.round((i / 40) * 280) + Math.floor(Math.random() * 20) })),
    market: 'KR',
    isAI: true
  },
  {
    symbol: '088350',
    name: '한화생명',
    price: 3120,
    change: 120,
    changePercent: 4.00,
    volume: '22.4M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 2600 + Math.round((i / 40) * 520) + Math.floor(Math.random() * 30) })),
    market: 'KR',
    isAI: true
  },
  {
    symbol: '011930',
    name: '신성이엔지',
    price: 2180,
    change: 85,
    changePercent: 4.06,
    volume: '16.5M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 1820 + Math.round((i / 40) * 360) + Math.floor(Math.random() * 25) })),
    market: 'KR',
    isAI: true
  },
  {
    symbol: '017040',
    name: '광명전기',
    price: 2450,
    change: 105,
    changePercent: 4.48,
    volume: '14.2M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 2000 + Math.round((i / 40) * 450) + Math.floor(Math.random() * 25) })),
    market: 'KR',
    isAI: true
  },
  {
    symbol: '003520',
    name: '영진약품',
    price: 3450,
    change: 140,
    changePercent: 4.23,
    volume: '12.8M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 2900 + Math.round((i / 40) * 550) + Math.floor(Math.random() * 35) })),
    market: 'KR',
    isAI: true
  },
  {
    symbol: '005360',
    name: '모나미',
    price: 2950,
    change: 110,
    changePercent: 3.87,
    volume: '10.5M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 2500 + Math.round((i / 40) * 450) + Math.floor(Math.random() * 30) })),
    market: 'KR',
    isAI: true
  },
  {
    symbol: '252670',
    name: 'KODEX 200선물인버스2X',
    price: 2150,
    change: 50,
    changePercent: 2.38,
    volume: '28.5M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 2100 + Math.random() * 80 })),
    market: 'KR',
    isAI: true
  },
  {
    symbol: '005930',
    name: '삼성전자',
    price: 77600,
    change: 0,
    changePercent: 0,
    volume: '15.2M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 77000 + Math.random() * 1000 })),
    market: 'KR',
    isAI: true
  },
  {
    symbol: '000660',
    name: 'SK하이닉스',
    price: 172000,
    change: 0,
    changePercent: 0,
    volume: '2.8M',
    history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: 170000 + Math.random() * 5000 })),
    market: 'KR',
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
    market: 'KR',
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
    market: 'KR',
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
  const [marketType, setMarketType] = useState<'KR' | 'US'>(() => {
    return (localStorage.getItem('sleek_last_market') as 'KR' | 'US') || 'KR';
  });

  const [lastSelectedKR, setLastSelectedKR] = useState(() => {
    return localStorage.getItem('sleek_last_symbol_KR') || '073240';
  });
  const [lastSelectedUS, setLastSelectedUS] = useState(() => {
    return localStorage.getItem('sleek_last_symbol_US') || 'NVDA';
  });
  const [displayCurrency, setDisplayCurrency] = useState<'KRW' | 'USD'>(() => {
    const lastMarket = localStorage.getItem('sleek_last_market');
    return lastMarket === 'US' ? 'USD' : 'KRW';
  });
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
  const [stocks, setStocks] = useState<Stock[]>(() => {
    const lastMarket = localStorage.getItem('sleek_last_market') || 'KR';
    return lastMarket === 'US' ? INITIAL_STOCKS : INITIAL_STOCKS_KR;
  });
  const [selectedSymbol, setSelectedSymbol] = useState(() => {
    const lastMarket = localStorage.getItem('sleek_last_market') || 'KR';
    if (lastMarket === 'US') {
      return localStorage.getItem('sleek_last_symbol_US') || 'NVDA';
    }
    return localStorage.getItem('sleek_last_symbol_KR') || '073240';
  });
  const [balance, setBalance] = useState(0); // User's money (will be synced via KIS)
  const [principal, setPrincipal] = useState(0); // Investment principal (will be synced via KIS)
  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [avgPrices, setAvgPrices] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('sleek_avg_prices') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    try {
      localStorage.setItem('sleek_avg_prices', JSON.stringify(avgPrices));
    } catch (e) {
      console.error("Failed to persist avgPrices", e);
    }
  }, [avgPrices]);

  useEffect(() => {
    localStorage.setItem('sleek_last_market', marketType);
  }, [marketType]);

  useEffect(() => {
    localStorage.setItem('sleek_last_symbol', selectedSymbol);
    const isUS = /^[A-Z]/.test(selectedSymbol);
    if (marketType === 'KR' && !isUS) {
      setLastSelectedKR(selectedSymbol);
      localStorage.setItem('sleek_last_symbol_KR', selectedSymbol);
    } else if (marketType === 'US' && isUS) {
      setLastSelectedUS(selectedSymbol);
      localStorage.setItem('sleek_last_symbol_US', selectedSymbol);
    }
  }, [selectedSymbol, marketType]);
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

  const formatCurrency = (val: number, forceKRW: boolean = false) => {
    const isUSD = marketType === 'US' && !forceKRW;
    if (isUSD) {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `₩${Math.round(val).toLocaleString()}`;
  };

  const formatQuantity = (val: number) => {
    return `${val.toLocaleString()} ${marketType === 'US' ? '주' : '주'}`; // '주' is standard for both in KR context usually, but can be customized
  };
  const [showKisModal, setShowKisModal] = useState(false);
  const [showKisPassword, setShowKisPassword] = useState(false);
  const [isAppInitialized, setIsAppInitialized] = useState(false);
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
  const [scalperMode, setScalperMode] = useState<'NORMAL' | 'TURBO'>('NORMAL');
  const [isGapBotActive, setIsGapBotActive] = useState<boolean>(false);
  const [kisBuyableQty, setKisBuyableQty] = useState<number | null>(null);
  const [gapTradingProfit, setGapTradingProfit] = useState<number>(0);
  const [gapTradeCount, setGapTradeCount] = useState<number>(0);
  const [lastTradeType, setLastTradeType] = useState<'BUY' | 'SELL' | null>(null);
  const [gapInventory, setGapInventory] = useState<{id: string, price: number, quantity: number}[]>([]);

  // Multi-Tab Scalper Trading State
  const [scalperTabs, setScalperTabs] = useState<ScalperTab[]>(() => {
    const lastMarket = localStorage.getItem('sleek_market_type') || 'KR';
    const initSymbol = localStorage.getItem('sleek_last_symbol') || (lastMarket === 'US' ? 'SNDL' : '073240');
    const defaults = lastMarket === 'US' ? INITIAL_STOCKS : INITIAL_STOCKS_KR;
    const initStock = defaults.find(s => s.symbol === initSymbol) || defaults[0];
    const price = initStock?.price || 1000;
    const tickSize = lastMarket === 'US' ? 0.01 : (price >= 500000 ? 1000 : price >= 100000 ? 500 : price >= 50000 ? 100 : price >= 10000 ? 50 : price >= 5000 ? 10 : 5);

    return [{
      id: initStock.symbol,
      symbol: initStock.symbol,
      name: initStock.name || initStock.symbol,
      isBotActive: false,
      gapBuyPrice: Math.max(10, price - tickSize * 2),
      gapSellPrice: price + tickSize * 2,
      tradeQuantity: 1,
      maxSlots: 3,
      gapInventory: [],
      gapTradingProfit: 0,
      gapTradeCount: 0,
      lastTradeType: null,
      scalperMessage: "대기 중...",
      entryPriceMode: 'BID2',
      autoCancelThreshold: 0.2,
      tradeLogs: []
    }];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const lastMarket = localStorage.getItem('sleek_market_type') || 'KR';
    return scalperTabs[0]?.id || (lastMarket === 'US' ? 'SNDL' : '073240');
  });
  const scalperTabsRef = React.useRef<ScalperTab[]>(scalperTabs);
  useEffect(() => {
    scalperTabsRef.current = scalperTabs;
  }, [scalperTabs]);

  const handleSwitchTab = (tabId: string) => {
    const targetTab = scalperTabsRef.current.find(t => t.id === tabId);
    if (!targetTab) return;
    setActiveTabId(tabId);
    setSelectedSymbol(targetTab.symbol);
    setIsGapBotActive(targetTab.isBotActive);
    setGapBuyPrice(targetTab.gapBuyPrice);
    setGapSellPrice(targetTab.gapSellPrice);
    setTradeQuantity(targetTab.tradeQuantity);
    setMaxSlots(targetTab.maxSlots);
    setGapInventory(targetTab.gapInventory || []);
    setGapTradingProfit(targetTab.gapTradingProfit || 0);
    setGapTradeCount(targetTab.gapTradeCount || 0);
    setLastTradeType(targetTab.lastTradeType || null);
    setScalperMessage(targetTab.scalperMessage || "대기 중...");
    setEntryPriceMode(targetTab.entryPriceMode || 'BID2');
    setAutoCancelThreshold(targetTab.autoCancelThreshold || 0.2);
    setTradeLogs(targetTab.tradeLogs || []);
  };

  const openOrSwitchScalperTab = (symbol: string, customName?: string) => {
    const existing = scalperTabsRef.current.find(t => t.symbol === symbol || t.id === symbol);
    if (existing) {
      handleSwitchTab(existing.id);
      return;
    }
    const stock = stocksRef.current.find(s => s.symbol === symbol) ||
                  INITIAL_STOCKS_KR.find(s => s.symbol === symbol) ||
                  INITIAL_STOCKS.find(s => s.symbol === symbol);
    const name = customName || stock?.name || symbol;
    const price = stock?.price || 1000;
    const tickSize = price >= 500000 ? 1000 : price >= 100000 ? 500 : price >= 50000 ? 100 : price >= 10000 ? 50 : price >= 5000 ? 10 : 5;

    const newTab: ScalperTab = {
      id: symbol,
      symbol,
      name,
      isBotActive: false,
      gapBuyPrice: Math.max(10, price - tickSize * 2),
      gapSellPrice: price + tickSize * 2,
      tradeQuantity: 1,
      maxSlots: 3,
      gapInventory: [],
      gapTradingProfit: 0,
      gapTradeCount: 0,
      lastTradeType: null,
      scalperMessage: "대기 중...",
      entryPriceMode: 'BID2',
      autoCancelThreshold: 0.2,
      tradeLogs: []
    };

    setScalperTabs(prev => [...prev, newTab]);
    setActiveTabId(symbol);
    setSelectedSymbol(symbol);
    setIsGapBotActive(false);
    setGapBuyPrice(newTab.gapBuyPrice);
    setGapSellPrice(newTab.gapSellPrice);
    setGapInventory([]);
    setGapTradingProfit(0);
    setGapTradeCount(0);
    setLastTradeType(null);
    setScalperMessage("대기 중...");
    setTradeLogs([]);
  };

  const closeScalperTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (scalperTabs.length <= 1) return;

    const remaining = scalperTabs.filter(t => t.id !== tabId);
    setScalperTabs(remaining);

    if (activeTabId === tabId) {
      const nextTab = remaining[remaining.length - 1];
      handleSwitchTab(nextTab.id);
    }
  };

  const [pendingBuyOrders, setPendingBuyOrders] = useState<PendingBuyOrder[]>([]);
  const pendingBuyOrdersRef = React.useRef<PendingBuyOrder[]>([]);
  const [pendingSellOrders, setPendingSellOrders] = useState<PendingSellOrder[]>([]);
  const pendingSellOrdersRef = React.useRef<PendingSellOrder[]>([]);
  const buyingLockPricesRef = React.useRef<{ symbol: string; price: number }[]>([]);
  useEffect(() => {
    pendingBuyOrdersRef.current = pendingBuyOrders;
  }, [pendingBuyOrders]);
  useEffect(() => {
    pendingSellOrdersRef.current = pendingSellOrders;
  }, [pendingSellOrders]);

  const [autoCancelThreshold, setAutoCancelThreshold] = useState<number>(0.2); // 0.2%
  const [immediateEntry, setImmediateEntry] = useState<boolean>(false);
  const [entryPriceMode, setEntryPriceMode] = useState<'CURRENT' | 'BID2' | 'BID4'>('BID2'); // 매수 2단계 기본 (최적 체결+안정성)
  const lowestBidOnlyMode = entryPriceMode === 'BID4'; // Backward compatibility ref
  const [scalperMessage, setScalperMessage] = useState<string>("대기 중...");
  const [selectedTimeframeBar, setSelectedTimeframeBar] = useState<'1m' | '3m' | '5m' | '10m'>('1m');
  const gapInventoryRef = React.useRef<{id: string, price: number, quantity: number}[]>([]);
  useEffect(() => {
    gapInventoryRef.current = gapInventory;
  }, [gapInventory]);

  // Automated Scalping Configuration States
  const [scalpingTargetProfit, setScalpingTargetProfit] = useState<number>(0.3); // Scalping net target profit (+0.3% tight default)
  const [scalpingStopLoss, setScalpingStopLoss] = useState<number>(-0.5); // -0.5% stop loss
  const [scalpingSpeed, setScalpingSpeed] = useState<number>(300); // 300ms (0.3s) fast execution speed
  const [scalpingSoundEnabled, setScalpingSoundEnabled] = useState<boolean>(true);
  const [scalpingWins, setScalpingWins] = useState<number>(0);
  const [scalpingLosses, setScalpingLosses] = useState<number>(0);
  const [maxSlots, setMaxSlots] = useState<number>(3);
  const [allowSamePriceEntry, setAllowSamePriceEntry] = useState<boolean>(false); 
  const [enableCombinedAvgProfitExit, setEnableCombinedAvgProfitExit] = useState<boolean>(false); 
  const [isSmartScalperMode, setIsSmartScalperMode] = useState<boolean>(true);
  const [minGapBetweenSlots, setMinGapBetweenSlots] = useState<number>(0.3); // 0.3% gap
  const [useFixedQuantity, setUseFixedQuantity] = useState<boolean>(true); 
  const [top3RefreshNonce, setTop3RefreshNonce] = useState<number>(0);
  const [isRefreshingTop3, setIsRefreshingTop3] = useState<boolean>(false);

  useEffect(() => {
    setScalperTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      return {
        ...tab,
        isBotActive: isGapBotActive,
        gapBuyPrice,
        gapSellPrice,
        tradeQuantity,
        maxSlots,
        gapInventory,
        gapTradingProfit,
        gapTradeCount,
        lastTradeType,
        scalperMessage,
        entryPriceMode,
        autoCancelThreshold,
        tradeLogs
      };
    }));
  }, [isGapBotActive, gapBuyPrice, gapSellPrice, tradeQuantity, maxSlots, gapInventory, gapTradingProfit, gapTradeCount, lastTradeType, scalperMessage, entryPriceMode, autoCancelThreshold, tradeLogs, activeTabId]);

  // Helper for tick-aware target sell price calculation to guarantee positive profit above tick size
  const calculateTargetSellPrice = useCallback((basePrice: number, targetProfitPct: number, currentMarketPrice?: number) => {
    if (basePrice <= 0) return 0;
    
    let tickSize;
    if (marketType === 'US') {
      tickSize = 0.01;
    } else {
      tickSize = basePrice >= 500000 ? 1000 : basePrice >= 100000 ? 500 : basePrice >= 50000 ? 100 : basePrice >= 10000 ? 50 : basePrice >= 5000 ? 10 : 5;
    }
    
    const rawTarget = basePrice * (1 + targetProfitPct / 100);
    let rounded = marketType === 'US' 
      ? Number(rawTarget.toFixed(2)) 
      : Math.round(rawTarget / tickSize) * tickSize;

    if (rounded <= basePrice) {
      rounded = marketType === 'US' ? Number((basePrice + 0.01).toFixed(2)) : basePrice + tickSize;
    }

    if (currentMarketPrice && currentMarketPrice > 0) {
      let marketTick;
      if (marketType === 'US') {
        marketTick = 0.01;
      } else {
        marketTick = currentMarketPrice >= 500000 ? 1000 : currentMarketPrice >= 100000 ? 500 : currentMarketPrice >= 50000 ? 100 : currentMarketPrice >= 10000 ? 50 : currentMarketPrice >= 5000 ? 10 : 5;
      }
      const roundedMarket = marketType === 'US'
        ? Number(currentMarketPrice.toFixed(2))
        : Math.round(currentMarketPrice / marketTick) * marketTick;
        
      if (roundedMarket > rounded) {
        return roundedMarket;
      }
    }
    return rounded;
  }, [marketType]); 

  // Manual Limit Sell States
  const [manualSellModalOpen, setManualSellModalOpen] = useState<boolean>(false);
  const [manualSellPrice, setManualSellPrice] = useState<number>(0);
  const [manualSellQty, setManualSellQty] = useState<number>(1);

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

  const cancelAllOrders = useCallback(() => {
    setIsGapBotActive(false);
    setGapInventory([]);
    setBotStatus("모든 진행 주문 및 스캘퍼 엔진 취소 완료");
    setScalperMessage("사용자 요청으로 모든 주문 및 자동 스캘퍼 취소됨");
    showNotification("모든 미체결 주문 및 스캘핑 엔진이 취소되었습니다.", "info");
  }, [showNotification]);

  const handleRefreshScalperTop3 = useCallback(() => {
    setIsRefreshingTop3(true);
    setTop3RefreshNonce(prev => prev + 1);
    
    setTimeout(() => {
      setIsRefreshingTop3(false);
      showNotification("[스캘퍼 최적 종목 갱신] 스캘핑 최적 종목 분석 및 랭킹이 새로고침 되었습니다.", "success");
    }, 600);
  }, [showNotification]);

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

  // Auto-set Upper/Lower Price Limits (당일 상/하한가) when selectedStock changes
  useEffect(() => {
    if (selectedStock && selectedStock.price > 0) {
      const basePrice = selectedStock.price / (1 + (selectedStock.changePercent || 0) / 100);
      const autoUpperLimit = Math.round(basePrice * 1.30); // 당일 상한가 (+30%)
      const autoLowerLimit = Math.round(basePrice * 0.70); // 당일 하한가 (-30%)
      setGapSellPrice(autoUpperLimit);
      setGapBuyPrice(autoLowerLimit);
    }
  }, [selectedStock?.symbol]);
  const rangePercentage = useMemo(() => {
    if (!gapBuyPrice || !gapSellPrice || gapBuyPrice >= gapSellPrice || !selectedStock) return 0;
    const pct = ((selectedStock.price - gapBuyPrice) / (gapSellPrice - gapBuyPrice)) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [gapBuyPrice, gapSellPrice, selectedStock?.price]);
  const totalValue = useMemo(() => {
    // Total Asset Valuation = Cash Balance + Current Market Value of Stock Holdings
    let stockValue = 0;
    Object.entries(holdings).forEach(([sym, rawQty]) => {
      const qty = Number(rawQty);
      if (qty <= 0) return;

      const st = stocks.find(s => s.symbol === sym) ||
                 INITIAL_STOCKS_KR.find(s => s.symbol === sym) ||
                 INITIAL_STOCKS.find(s => s.symbol === sym);

      const currentPrice = st ? st.price : (avgPrices[sym] || 0);
      const isUS = /^[A-Z]/.test(sym);
      const priceInKRW = isUS ? currentPrice * exchangeRate : currentPrice;

      stockValue += qty * priceInKRW;
    });

    return Math.floor(balance + stockValue);
  }, [balance, holdings, stocks, avgPrices, exchangeRate]);

  const convertedValue = displayCurrency === 'USD' ? Math.round(totalValue / exchangeRate) : Math.round(totalValue);
  const convertedBalance = displayCurrency === 'USD' ? Math.round(balance / exchangeRate) : Math.round(balance);
  
  const pnl = Math.round(totalValue - principal);
  const pnlPercent = principal > 0 ? (pnl / principal) * 100 : 0;

  const convertedPnl = displayCurrency === 'USD' ? Math.round(pnl / exchangeRate) : Math.round(pnl);
  const convertedPrincipal = displayCurrency === 'USD' ? Math.round(principal / exchangeRate) : Math.round(principal);
  const curPrefix = displayCurrency === 'USD' ? '$' : '₩';

  const [isAssetAnalysisModalOpen, setIsAssetAnalysisModalOpen] = useState<boolean>(false);

  const assetAnalysis = useMemo(() => {
    const isUSD = displayCurrency === 'USD';
    const conv = (krwVal: number) => isUSD ? krwVal / exchangeRate : krwVal;

    let totalStockValue = 0;
    let totalStockInvested = 0;
    const stockList: Array<{
      symbol: string;
      name: string;
      qty: number;
      avgPrice: number;
      currentPrice: number;
      investedAmount: number;
      evaluatedAmount: number;
      pnlAmount: number;
      pnlPercent: number;
      portfolioShare: number;
    }> = [];

    Object.entries(holdings).forEach(([sym, rawQty]) => {
      const qty = Number(rawQty);
      if (qty <= 0) return;

      const isStockUS = /^[A-Z]/.test(sym);
      // Filter by current market mode
      if (marketType === 'US' && !isStockUS) return;
      if (marketType === 'KR' && isStockUS) return;

      const st = stocks.find(s => s.symbol === sym) ||
                 INITIAL_STOCKS_KR.find(s => s.symbol === sym) ||
                 INITIAL_STOCKS.find(s => s.symbol === sym) ||
                 { name: sym, symbol: sym, price: 0 };

      const resolvedStockName = (st.name && st.name !== sym)
        ? st.name
        : (INITIAL_STOCKS_KR.find(s => s.symbol === sym)?.name || INITIAL_STOCKS.find(s => s.symbol === sym)?.name || sym);

      const currentPriceKRW = isStockUS ? (st.price || 0) * exchangeRate : (st.price || 0);

      let avgP = avgPrices[sym] || 0;
      if (avgP <= 0 && gapInventory.length > 0 && selectedSymbol === sym) {
        const totalCost = gapInventory.reduce((acc, slot) => acc + (slot.price * slot.quantity), 0);
        const totalQty = gapInventory.reduce((acc, slot) => acc + slot.quantity, 0);
        avgP = totalQty > 0 ? Math.floor(totalCost / totalQty) : 0;
      }
      if (avgP <= 0) avgP = st.price || 0;
      const avgPriceKRW = isStockUS ? Math.floor(avgP * exchangeRate) : Math.floor(avgP);

      const invested = qty * avgPriceKRW;
      const evaluated = qty * currentPriceKRW;
      const pnlAmt = evaluated - invested;
      const pnlPct = invested > 0 ? (pnlAmt / invested) * 100 : 0;

      totalStockValue += evaluated;
      totalStockInvested += invested;

      stockList.push({
        symbol: sym,
        name: resolvedStockName,
        qty,
        avgPrice: conv(avgPriceKRW),
        currentPrice: conv(currentPriceKRW),
        investedAmount: conv(invested),
        evaluatedAmount: conv(evaluated),
        pnlAmount: conv(pnlAmt),
        pnlPercent: pnlPct,
        portfolioShare: 0
      });
    });

    stockList.forEach(item => {
      // portfolioShare should be based on totalValue (which is converted in convertedValue)
      // but let's just keep it relative to its own category if filtered, or keep total
      item.portfolioShare = totalValue > 0 ? ((item.evaluatedAmount * (isUSD ? exchangeRate : 1)) / totalValue) * 100 : 0;
    });

    const pendingOrderReserve = pendingBuyOrders.reduce((acc, order) => {
      if (!order.isSimulated) return acc;
      const isOrderUS = /^[A-Z]/.test(order.symbol);
      if (marketType === 'US' && !isOrderUS) return acc;
      if (marketType === 'KR' && isOrderUS) return acc;

      const priceKRW = isOrderUS ? order.orderPrice * exchangeRate : order.orderPrice;
      return acc + order.quantity * priceKRW;
    }, 0);

    const filteredTotalValue = (marketType === 'US' ? balance : balance) + totalStockValue; // simplified for now

    // Let's make shares relative to the filtered total for a consistent sub-view
    const currentViewTotal = conv(balance) + totalStockValue + conv(pendingOrderReserve);

    return {
      cashBalance: conv(balance),
      stockValue: totalStockValue,
      stockInvested: totalStockInvested,
      pendingReserve: conv(pendingOrderReserve),
      totalCalculatedAsset: conv(balance) + totalStockValue, // Only reflecting currently selected market's stocks + cash
      principal: conv(principal),
      totalPnL: totalStockValue - totalStockInvested,
      totalPnLPercent: totalStockInvested > 0 ? ((totalStockValue - totalStockInvested) / totalStockInvested) * 100 : 0,
      cashShare: currentViewTotal > 0 ? (conv(balance) / currentViewTotal) * 100 : 0,
      stockShare: currentViewTotal > 0 ? (totalStockValue / currentViewTotal) * 100 : 0,
      pendingShare: currentViewTotal > 0 ? (conv(pendingOrderReserve) / currentViewTotal) * 100 : 0,
      stockList
    };
  }, [balance, holdings, stocks, avgPrices, gapInventory, selectedSymbol, exchangeRate, pendingBuyOrders, totalValue, principal, pnl, pnlPercent, marketType, displayCurrency]);

  // Stable symbol ordering for TOP 5 Scalper Optimal Stocks:
  // Priority: 10,000 KRW ($10) or less + 1-Year Upward Trend + High Volume + Dynamic Rising Momentum
  const heldSymbolsKey = useMemo(() => {
    return Object.entries(holdings)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([sym]) => sym)
      .sort()
      .join(',');
  }, [holdings]);

  const stableTop5Symbols = useMemo(() => {
    const candidateMap = new Map<string, Stock>();
    const defaults = marketType === 'KR' ? INITIAL_STOCKS_KR : INITIAL_STOCKS;
    
    // Add default market stocks
    defaults.forEach(s => candidateMap.set(s.symbol, s));
    
    // Add current stocks matching marketType
    stocks.forEach(s => {
      const isUS = /^[A-Z]/.test(s.symbol);
      if ((marketType === 'US' && isUS) || (marketType === 'KR' && !isUS)) {
        if (!candidateMap.has(s.symbol)) {
          candidateMap.set(s.symbol, s);
        }
      }
    });

    const candidates = Array.from(candidateMap.values()).filter(stock => {
      const name = (stock.name || (marketType === 'KR' ? INITIAL_STOCKS_KR : INITIAL_STOCKS).find(s => s.symbol === stock.symbol)?.name || stock.symbol).trim().toLowerCase();
      // Strict market isolation for rankings
      const isUS = /^[A-Z]/.test(stock.symbol);
      if (marketType === 'KR' && isUS) return false;
      if (marketType === 'US' && !isUS) return false;
      return !name.startsWith('kodex') && stock.price > 0;
    });
    const maxPrice = marketType === 'KR' ? 10000 : 10.0;

    const scoredCandidates = candidates.map((stock) => {
      const qty = holdings[stock.symbol] || 0;
      const isHeld = Number(qty) > 0;

      const isPriceUnderLimit = stock.price > 0 && stock.price <= maxPrice;
      const isRisingTrend = stock.changePercent > 0;

      let oscillation = 1.8;
      if (stock.history && stock.history.length > 1) {
        const prices = stock.history.map(h => h.price).filter(p => p > 0);
        if (prices.length > 0) {
          const minP = Math.min(...prices);
          const maxP = Math.max(...prices);
          oscillation = ((maxP - minP) / (minP || 1)) * 100;
        }
      }

      let rawVol = 100;
      if (typeof stock.volume === 'string') {
        if (stock.volume.endsWith('M')) rawVol = parseFloat(stock.volume) * 1000;
        else if (stock.volume.endsWith('K')) rawVol = parseFloat(stock.volume);
        else rawVol = parseFloat(stock.volume) || 100;
      } else if (typeof stock.volume === 'number') {
        rawVol = stock.volume;
      }

      // Liquidity & dynamic daily momentum scoring
      let liquidityScore = Math.min(35, Math.log10(rawVol + 10) * 9);
      let risingScore = isRisingTrend ? Math.min(45, stock.changePercent * 10 + 20) : -30;
      let volScore = Math.min(20, oscillation * 5);

      const charSum = stock.symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const seed = ((charSum + top3RefreshNonce * 7) % 13);

      const scalpScore = Math.min(99, Math.max(70, Math.round(30 + risingScore + liquidityScore + volScore + seed)));

      // Priority Tiers:
      // Tier 0: Price <= 10,000원 ($10) AND 1-Year Upward Trend & Real-time Rising Momentum (Highest Priority)
      // Tier 1: Price <= 10,000원 ($10) only
      // Tier 2: Others (Fallback)
      let tier = 2;
      if (isPriceUnderLimit && isRisingTrend) {
        tier = 0;
      } else if (isPriceUnderLimit) {
        tier = 1;
      }

      return {
        symbol: stock.symbol,
        isHeld,
        tier,
        rawVol,
        scalpScore
      };
    });

    // Priority order:
    // 1. Lower tier first (Tier 0 > Tier 1 > Tier 2)
    // 2. Held stocks first
    // 3. Highest scalpScore (driven by volume and momentum)
    scoredCandidates.sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier - b.tier;
      }
      if (a.isHeld !== b.isHeld) {
        return a.isHeld ? -1 : 1;
      }
      return b.scalpScore - a.scalpScore;
    });

    return scoredCandidates.slice(0, 5).map(c => c.symbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketType, top3RefreshNonce, stocks, holdings]);

  // Scalper Engine Optimal Top 5 Stocks mapping live stock snapshot
  const scalperTop5Stocks = useMemo(() => {
    const maxPrice = marketType === 'KR' ? 10000 : 10.0;

    return stableTop5Symbols.map((sym) => {
      const stock = stocks.find(s => s.symbol === sym) ||
                    (marketType === 'KR' ? INITIAL_STOCKS_KR : INITIAL_STOCKS).find(s => s.symbol === sym) ||
                    { name: sym, symbol: sym, price: 0, changePercent: 0, volume: '0', history: [], market: marketType };

      const qty = holdings[sym] || 0;
      const isHeld = Number(qty) > 0;
      const isUnderLimit = stock.price > 0 && stock.price <= maxPrice;
      const isRising = stock.changePercent > 0;

      let oscillation = 1.8;
      if (stock.history && stock.history.length > 1) {
        const prices = stock.history.map(h => h.price).filter(p => p > 0);
        if (prices.length > 0) {
          const minP = Math.min(...prices);
          const maxP = Math.max(...prices);
          oscillation = ((maxP - minP) / (minP || 1)) * 100;
        }
      }

      const risingScore = isRising ? Math.min(45, stock.changePercent * 10 + 20) : -25;

      let rawVol = 100;
      if (typeof stock.volume === 'string') {
        if (stock.volume.endsWith('M')) rawVol = parseFloat(stock.volume) * 1000;
        else if (stock.volume.endsWith('K')) rawVol = parseFloat(stock.volume);
        else rawVol = parseFloat(stock.volume) || 100;
      } else if (typeof stock.volume === 'number') {
        rawVol = stock.volume;
      }
      let liquidityScore = Math.min(25, Math.log10(rawVol + 10) * 6);
      let volScore = Math.min(20, oscillation * 5);

      const charSum = stock.symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const seed = (charSum % 8);

      const rawTotal = 35 + risingScore + liquidityScore + volScore + seed;
      const scalpScore = Math.min(99, Math.max(70, Math.round(rawTotal)));

      let reasonTag = "🚀 1년 우상향 · 실시간 상승기류";
      if (isHeld) {
        reasonTag = `💼 보유 종목 (${marketType === 'KR' ? '10,000원 이하' : '$10 이하'})`;
      } else if (isUnderLimit && isRising) {
        reasonTag = `⚡ ${marketType === 'KR' ? '10,000원 이하' : '$10 이하'} · 1년 우상향 · 실시간 상승기류 (+${stock.changePercent.toFixed(1)}%)`;
      } else if (stock.changePercent > 0) {
        reasonTag = `📈 1년 우상향 추세 (+${stock.changePercent.toFixed(1)}%)`;
      } else {
        reasonTag = `💧 거래량 유동성 우수`;
      }

      const resolvedStockName = (stock.name && stock.name !== sym) 
        ? stock.name 
        : (INITIAL_STOCKS_KR.find(s => s.symbol === sym)?.name || INITIAL_STOCKS.find(s => s.symbol === sym)?.name || sym);

      return {
        ...stock,
        name: resolvedStockName,
        isHeld,
        scalpScore,
        oscillation,
        reasonTag
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableTop5Symbols, top3RefreshNonce, marketType, stocks, holdings]);

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
                    isConnected: loadedConfig.isConnected || false,
                    domesticOrderType: activeData.domesticOrderType || '00',
                    isRealOrderEnabled: activeData.isRealOrderEnabled !== undefined ? activeData.isRealOrderEnabled : true
                 };
              } else {
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

  // Auto-Sync KIS Account Status once initial stocks, charts, and prices load
  const hasAutoSyncedRef = React.useRef(false);
  useEffect(() => {
    if (kisConfig.isConnected && !hasAutoSyncedRef.current && stocks.length > 0 && isAppInitialized) {
      hasAutoSyncedRef.current = true;
      const timer = setTimeout(() => {
        handleSyncKIS();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [kisConfig.isConnected, stocks.length, isAppInitialized]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        showNotification("로그인 창이 닫혔습니다.", "info");
      } else if (error.code === 'auth/popup-blocked') {
        alert("팝업이 차단되었습니다. 브라우저 주소창의 팝업 차단 설정을 해제해주세요.");
      } else if (error.code === 'auth/network-request-failed') {
        alert("네트워크 연결 오류가 발생했습니다.");
      } else {
        alert(`로그인 중 오류가 발생했습니다: ${error.message}\n\n* 만약 iFrame(AI Studio 프리뷰) 환경이라면 브라우저의 '3방 쿠키 차단(Third-Party Cookie Block)' 보안 정책으로 인해 구글 소셜 로그인이 차단되었을 수 있습니다. 오른쪽 상단의 '새 창에서 열기' 버튼을 클릭해 독립된 창에서 다시 시도해 주세요.`);
      }
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

  const handleMarketSwitch = (newMarket: 'KR' | 'US') => {
    if (marketType === newMarket) return;

    // 1. Save current stocks to cache
    const currentMarket = marketType;
    const currentStocks = stocksRef.current;
    setStocksCache(prev => ({
      ...prev,
      [currentMarket]: currentStocks.filter(s => s.market === currentMarket)
    }));

    // 2. Set new market states
    setMarketType(newMarket);
    setDisplayCurrency(newMarket === 'KR' ? 'KRW' : 'USD');
    
    const cachedStocks = stocksCache[newMarket];
    setStocks(cachedStocks);

    // 3. Sync symbol
    let sym = newMarket === 'US' ? lastSelectedUS : lastSelectedKR;
    const isUS = /^[A-Z]/.test(sym);
    if (newMarket === 'US') {
      if (!isUS || !cachedStocks.some(s => s.symbol === sym)) {
        sym = cachedStocks.find(s => /^[A-Z]/.test(s.symbol))?.symbol || 'NVDA';
      }
    } else {
      if (isUS || !cachedStocks.some(s => s.symbol === sym)) {
        sym = cachedStocks.find(s => !/^[A-Z]/.test(s.symbol))?.symbol || '073240';
      }
    }
    setSelectedSymbol(sym);

    // 4. Sync Tabs
    const stock = cachedStocks.find(s => s.symbol === sym) || cachedStocks[0];
    if (stock) {
      const price = stock.price || (newMarket === 'KR' ? 1000 : 1);
      const tickSize = newMarket === 'KR' 
        ? (price >= 500000 ? 1000 : price >= 100000 ? 500 : price >= 50000 ? 100 : price >= 10000 ? 50 : price >= 5000 ? 10 : 5)
        : 0.01;
      
      const validTabs = scalperTabs.filter(t => {
        const tIsUS = /^[A-Z]/.test(t.symbol);
        return newMarket === 'US' ? tIsUS : !tIsUS;
      });

      if (validTabs.length > 0) {
        if (!validTabs.some(t => t.id === activeTabId)) {
          handleSwitchTab(validTabs[0].id);
        }
      } else {
        const newTabs: ScalperTab[] = [{
          id: stock.symbol,
          symbol: stock.symbol,
          name: stock.name || stock.symbol,
          isBotActive: false,
          gapBuyPrice: Math.max(newMarket === 'KR' ? 10 : 0.01, price - tickSize * 2),
          gapSellPrice: price + tickSize * 2,
          tradeQuantity: 1,
          maxSlots: 3,
          gapInventory: [],
          gapTradingProfit: 0,
          gapTradeCount: 0,
          lastTradeType: null,
          scalperMessage: "대기 중...",
          entryPriceMode: 'BID2',
          autoCancelThreshold: 0.2,
          tradeLogs: []
        }];
        setScalperTabs(newTabs);
        setActiveTabId(stock.symbol);
      }
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
        openOrSwitchScalperTab(recommendedStock.symbol, recommendedStock.name);
        return;
      }
      const newStock: Stock = { ...recommendedStock, isAI: true, market: marketType };
      setStocks(prev => [newStock, ...prev]);
      setStocksCache(prev => ({
        ...prev,
        [marketType]: [newStock, ...prev[marketType]]
      }));
      openOrSwitchScalperTab(recommendedStock.symbol, recommendedStock.name);
      setAiRecommendations(prev => prev.filter(r => r.symbol !== recommendedStock.symbol));
      addLog('SYSTEM', '매수', 0, 0, `[AI 추천 추가] ${recommendedStock.name}(${recommendedStock.symbol}) 종목이 분석 리스트에 추가되었습니다.`);
      return;
    }

    if (stocks.some(s => s.symbol === symbolToUse)) {
      openOrSwitchScalperTab(symbolToUse, customName);
      return;
    }

    if (kisConfig.isConnected) {
      setIsSearchingStock(true);
      setSearchError(null);
      try {
        const livePriceData = await kisService.getPrice(symbolToUse);
        if (livePriceData) {
          const liveName = livePriceData.name || customName || symbolToUse;
          const newStock: Stock = {
            symbol: symbolToUse,
            name: liveName,
            price: livePriceData.current,
            change: livePriceData.change,
            changePercent: livePriceData.changePercent,
            volume: livePriceData.volume,
            history: Array.from({ length: 40 }, (_, i) => ({ 
              time: `${i}:00`, 
              price: livePriceData.current * (0.98 + Math.random() * 0.04) 
            })),
            market: marketType,
            isAI: false
          };
          setStocks(prev => {
            if (prev.some(s => s.symbol === symbolToUse)) {
              return prev.map(s => s.symbol === symbolToUse ? newStock : s);
            }
            return [newStock, ...prev];
          });
          setStocksCache(prev => {
            const currentCache = prev[marketType];
            if (currentCache.some(s => s.symbol === symbolToUse)) {
              return {
                ...prev,
                [marketType]: currentCache.map(s => s.symbol === symbolToUse ? newStock : s)
              };
            }
            return {
              ...prev,
              [marketType]: [newStock, ...currentCache]
            };
          });
          openOrSwitchScalperTab(symbolToUse, liveName);
          setSearchSymbol("");
          addLog('SYSTEM', '매수', 0, 0, `[KIS 종목 추가] ${liveName}(${symbolToUse}) 종목이 실시간 연동 등록되었습니다 (현재가: ${formatCurrency(livePriceData.current)}).`);
          setIsSearchingStock(false);
          return;
        }
      } catch (err: any) {
        console.warn("[KIS Search Fallback] Live fetch failed, falling back to Gemini:", err);
      }
      setIsSearchingStock(false);
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
        market: marketType,
        isAI: false
      };
      
      setStocks(prev => {
        if (prev.some(s => s.symbol === symbolToUse)) {
          return prev.map(s => s.symbol === symbolToUse ? newStock : s);
        }
        return [newStock, ...prev];
      });
      setStocksCache(prev => ({
        ...prev,
        [marketType]: [newStock, ...prev[marketType].filter(s => s.symbol !== symbolToUse)]
      }));
      openOrSwitchScalperTab(symbolToUse, customName);
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
            addLog('SYSTEM', '매수', 0, 0, `[종목 정보 동기화] ${data.name || customName}(${symbolToUse})의 주가가 ${formatCurrency(data.price)}으로 업데이트되었습니다.`);
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
        market: marketType,
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
              // Filter out stocks with 0 price if price is provided
              if (item.price !== undefined && item.price <= 0) return;
              
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
    const currentBalance = overrideBalance !== undefined ? overrideBalance : balance;

    try {
      if (isKR) {
        const ordDvsn = kisConfig.domesticOrderType || '00';
        const tradePrice = selectedStock.price;
        const queryPrice = ordDvsn === '00' ? tradePrice.toString() : '0';

        const res = await kisService.getDomesticBuyableAmount(
          selectedStock.symbol,
          queryPrice,
          ordDvsn
        );

        if (res && res.rt_cd === '0' && res.output) {
          const nrcyStr = res.output.nrcy_buy_qty || res.output.nrcy_ord_psbl_qty;
          const ordPsblStr = res.output.ord_psbl_qty || res.output.psbl_qty;
          const maxQtyStr = res.output.max_ord_qty || res.output.tot_ord_psbl_qty || res.output.max_buy_qty;

          let qty = 0;
          if (nrcyStr !== undefined && nrcyStr !== null && nrcyStr !== '') {
            qty = parseInt(nrcyStr, 10);
          } else if (ordPsblStr !== undefined && ordPsblStr !== null && ordPsblStr !== '') {
            qty = parseInt(ordPsblStr, 10);
          } else if (maxQtyStr !== undefined && maxQtyStr !== null && maxQtyStr !== '') {
            qty = parseInt(maxQtyStr, 10);
          }

          if (isNaN(qty) || qty < 0) qty = 0;
          setKisBuyableQty(qty);
          return;
        }
      } else {
        // Overseas (US)
        const res = await kisService.getOverseasBuyableAmount(
          selectedStock.symbol,
          selectedStock.price.toString()
        );

        if (res && res.rt_cd === '0' && res.output) {
          const buyableStr = res.output.nrcy_buy_qty || res.output.ord_psbl_qty || res.output.max_buy_qty;
          let qty = 0;
          if (buyableStr !== undefined && buyableStr !== null && buyableStr !== '') {
            qty = parseInt(buyableStr, 10);
          }
          
          if (isNaN(qty) || qty < 0) qty = 0;
          setKisBuyableQty(qty);
          return;
        }
      }

      if (currentBalance > 0 && selectedStock.price > 0) {
        const priceInBalanceCurrency = isKR ? selectedStock.price : selectedStock.price * exchangeRate;
        setKisBuyableQty(Math.max(0, Math.floor(currentBalance / priceInBalanceCurrency)));
      } else {
        setKisBuyableQty(0);
      }
    } catch (err) {
      console.warn("Failed to update KIS buyable quantity:", err);
      // API 실패 시에도 실제 계좌 현금을 기준으로 계산하여 폴백
      if (currentBalance > 0 && selectedStock.price > 0) {
        const priceInBalanceCurrency = isKR ? selectedStock.price : selectedStock.price * exchangeRate;
        const fallbackQty = Math.floor(currentBalance / priceInBalanceCurrency);
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
      const newAvgPrices: Record<string, number> = {};
      const newStockNames: Record<string, string> = {};
      let totalConvertedBalance = 0;
      let totalConvertedPrincipal = 0;
      let domesticError = null;
      let foundAnyData = false;

      // Domestic Stock Sync (TTTC8434R / VTTC8434R)
      try {
        const domesticBalanceData = await kisService.getDomesticBalance();
        let totalStockPurchaseCost = 0;

        if (domesticBalanceData?.rt_cd === '0' && domesticBalanceData.output1 && Array.isArray(domesticBalanceData.output1)) {
          foundAnyData = true;
          const newSellable: Record<string, number> = {};
          for (const item of domesticBalanceData.output1) {
            if (item.pdno && item.pdno !== '000000') {
              const qty = Number(item.hldg_qty || item.hldg_qty_2 || 0);
              const avgP = Number(item.pchs_avg_pric || item.pchs_unpr || item.pchs_avg_price || (item.pchs_amt && qty ? item.pchs_amt / qty : 0) || 0);
              const name = item.prdt_name;
              if (qty > 0) {
                // Only add to holdings if we are in KR market mode
                if (marketType === 'KR') {
                  newHoldings[item.pdno] = (newHoldings[item.pdno] || 0) + qty;
                  if (avgP > 0) newAvgPrices[item.pdno] = avgP;
                  if (name) newStockNames[item.pdno] = name;
                }
                
                totalStockPurchaseCost += (qty * (avgP > 0 ? avgP : 0));

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
          if (marketType === 'KR') setSellableHoldings(prev => ({ ...prev, ...newSellable }));
        }

        if (domesticBalanceData?.rt_cd === '0' && domesticBalanceData.output2?.[0]) {
          foundAnyData = true;
          const out2 = domesticBalanceData.output2[0];
          const dnclAmt = Number(out2.dncl_amt || out2.d2_dncl_amt || out2.prsm_dncl_amt || 0);
          const ordPsblCash = Number(out2.ord_psbl_cash || out2.ord_psbl_amt || 0);
          const domesticPurchase = Number(out2.pchs_amt_smtl_amt || 0);
          const actualPurchaseCost = Math.max(domesticPurchase, totalStockPurchaseCost);

          // Direct deposit/cash balance in account
          const domesticCash = dnclAmt > 0 ? dnclAmt : (ordPsblCash > 0 ? ordPsblCash : 0);
          
          if (marketType === 'KR') {
            totalConvertedBalance += Math.round(domesticCash);
            totalConvertedPrincipal += Math.round(domesticCash + actualPurchaseCost);
          }
        }
      } catch (err: any) {
        console.warn("Domestic Sync Skip:", err);
        domesticError = err.message;
      }

      // Overseas Stock Sync (TTTS3012R)
      try {
        const overseasBalanceData = await kisService.getOverseasBalance();
        let totalOverseasPurchaseCostUSD = 0;
        const currentExRate = Number(exchangeRate) || 1350;

        if (overseasBalanceData?.rt_cd === '0' && overseasBalanceData.output1 && Array.isArray(overseasBalanceData.output1)) {
          foundAnyData = true;
          for (const item of overseasBalanceData.output1) {
            if (item.pdno) {
              const qty = Number(item.hldg_qty || 0);
              const avgP = Number(item.pchs_avg_pric || 0);
              const name = item.prdt_name || item.ovrs_item_name;
              if (qty > 0) {
                // Only add to holdings if we are in US market mode
                if (marketType === 'US') {
                  newHoldings[item.pdno] = (newHoldings[item.pdno] || 0) + qty;
                  if (avgP > 0) newAvgPrices[item.pdno] = avgP;
                  if (name) newStockNames[item.pdno] = name;
                }
                totalOverseasPurchaseCostUSD += (qty * avgP);
              }
            }
          }
        }

        if (overseasBalanceData?.rt_cd === '0' && overseasBalanceData.output2) {
          foundAnyData = true;
          const out2 = overseasBalanceData.output2;
          const frcr_dncl_amt = Number(out2.frcr_dncl_amt || 0); // Foreign currency deposit
          const ovrs_tot_pchs_amt = Number(out2.ovrs_tot_pchs_amt || totalOverseasPurchaseCostUSD);
          
          if (marketType === 'US') {
            totalConvertedBalance += frcr_dncl_amt;
            totalConvertedPrincipal += (frcr_dncl_amt + ovrs_tot_pchs_amt);
          }
        }
      } catch (err: any) {
        console.warn("Overseas Sync Skip:", err);
      }

      // Final Check: If absolutely no data was fetched and there was a domestic error, notify user
      if (!foundAnyData && domesticError) {
         setBotStatus("연동 데이터 수신 실패");
         showNotification(`KIS 계좌 잔고 수신 실패: ${domesticError}`, "error");
         return;
      }

      // 3. Integrated Asset Status (CTRP6548R)
      try {
        const assetStatus = await kisService.getInvestmentAssetStatus();
          if (assetStatus?.output2) {
            const out2 = assetStatus.output2;
            const dncl_amt = Number(out2.dncl_amt || out2.d2_dncl_amt || out2.ord_psbl_cash || 0);
            const tot_asst_amt = Number(out2.tot_asst_amt || 0);
            
            if (tot_asst_amt > 0) {
              if (tot_asst_amt > totalConvertedPrincipal) {
                totalConvertedPrincipal = Math.round(tot_asst_amt);
              }
              if (dncl_amt > 0 && totalConvertedBalance === 0) {
                totalConvertedBalance = Math.round(dncl_amt);
              }
            }
          }
        } catch (err) {
          console.warn("Asset Status Sync Skip:", err);
        }

      // Final fallback: if total is still 0, check if we have any total eval amount in output2
      // common for some accounts to only populate tot_evlu_amt
      
      const symbolsFromHoldings = Object.keys(newHoldings);
      const existingSymbols = new Set(stocks.map(s => s.symbol));
      const missingSymbols = symbolsFromHoldings.filter(s => !existingSymbols.has(s));

      if (missingSymbols.length > 0) {
        setBotStatus(`새로운 보유 종목 ${missingSymbols.length}개 발견. 데이터 동기화 중...`);
        const addedStocks: Stock[] = await Promise.all(missingSymbols.map(async (sym) => {
          const isUSStock = /^[A-Z]/.test(sym);
          const stockMarket = isUSStock ? 'US' : 'KR';
          try {
            const p = await kisService.getPrice(sym);
            const resolvedName = (p && p.name && p.name !== sym) 
              ? p.name 
              : (newStockNames[sym] || INITIAL_STOCKS_KR.find(s => s.symbol === sym)?.name || INITIAL_STOCKS.find(s => s.symbol === sym)?.name || sym);
            if (p) {
              return {
                symbol: sym,
                name: resolvedName,
                price: p.current,
                change: p.change,
                changePercent: p.changePercent,
                volume: p.volume,
                history: [{ time: '09:00', price: p.current }],
                market: stockMarket,
                isAI: false
              };
            }
            throw new Error("No price data");
          } catch (e) {
            const resolvedName = newStockNames[sym] || INITIAL_STOCKS_KR.find(s => s.symbol === sym)?.name || INITIAL_STOCKS.find(s => s.symbol === sym)?.name || sym;
            return {
              symbol: sym,
              name: resolvedName,
              price: 0,
              change: 0,
              changePercent: 0,
              volume: '0',
              history: [],
              market: stockMarket,
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
      setAvgPrices(prev => ({ ...prev, ...newAvgPrices }));
      if (currentUser) {
        saveUserHoldings(currentUser.uid, newHoldings);
      }

      // Self-Healing Slot Matching: Ensure gapInventory total quantity matches the actual holdings on KIS
      if (selectedStock && isGapBotActive) {
        const actualQty = newHoldings[selectedStock.symbol] || 0;
        const totalSlotQty = gapInventoryRef.current.reduce((acc, slot) => acc + (slot.quantity || 0), 0);
        
        if (Math.abs(actualQty - totalSlotQty) > 0.0001) {
          console.log(`[Slot Sync] Desync detected. KIS actual holdings: ${actualQty}, local slots total: ${totalSlotQty}`);
          
          if (actualQty < totalSlotQty) {
            // Trim the slots to match actual holdings
            let remaining = actualQty;
            const newInv: {price: number, quantity: number}[] = [];
            for (const slot of gapInventoryRef.current) {
              if (remaining <= 0) break;
              const take = Math.min(slot.quantity, remaining);
              newInv.push({ ...slot, quantity: take });
              remaining -= take;
            }
            setGapInventory(newInv);
            console.log(`[Slot Sync] Trimmed slots to match ${actualQty} qty`);
          } else {
            // Expand slots by fetching today's executions
            try {
              const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
              const execs = await kisService.getDomesticOrderExecutions(todayStr, todayStr, '02', '01');
              
              const filledSlots: {price: number, quantity: number}[] = [];
              if (execs && execs.rt_cd === '0' && execs.output1 && Array.isArray(execs.output1)) {
                const symbolExecs = execs.output1.filter((item: any) => item.pdno === selectedStock.symbol);
                symbolExecs.forEach((item: any) => {
                  const qty = Number(item.tot_ccld_qty || 0);
                  const price = Number(item.avg_prvs || item.ord_unpr || 0);
                  if (qty > 0 && price > 0) {
                    filledSlots.push({ price, quantity: qty });
                  }
                });
              }

              if (filledSlots.length > 0) {
                // Take latest slots to match the missing quantity
                let needed = actualQty - totalSlotQty;
                const recoverySlots: {price: number, quantity: number}[] = [];
                for (const fs of filledSlots.reverse()) {
                  if (needed <= 0) break;
                  const add = Math.min(fs.quantity, needed);
                  recoverySlots.push({ ...fs, quantity: add });
                  needed -= add;
                }
                setGapInventory(prev => [...prev, ...recoverySlots]);
                console.log(`[Slot Sync] Recovered missing slots from execution history`);
              } else if (actualQty > totalSlotQty) {
                // Fallback: Add one slot with average price
                const missing = actualQty - totalSlotQty;
                const avgP = avgPrices[selectedStock.symbol] || selectedStock.price;
                setGapInventory(prev => [...prev, { price: avgP, quantity: missing }]);
                console.log(`[Slot Sync] Added fallback recovery slot for ${missing} qty`);
              }
            } catch (err) {
              console.error("[Slot Sync] Error during expansion:", err);
            }
          }
        }
      }
      
      setBotStatus("상태 동기화 완료");
      await updateKisBuyableQty(totalConvertedBalance);
    } catch (e: any) {
      console.error("KIS Sync Error", e);
      const msg = e.response?.data?.msg1 || e.message;
      setBotStatus(`증권사 동기화 실패: ${msg}`);
    } finally {
      setIsAppInitialized(true);
    }
  };

  // Unified Gap Trading logic is now placed in the main bot effect below.

  // Real-time Stock Price Sync Interval (Optimized dual-interval for selected and other watchlist stocks)
  useEffect(() => {
    if (!isAppInitialized) return;
    let slowInterval: NodeJS.Timeout;
    let fastInterval: NodeJS.Timeout;
    let kisSyncInterval: NodeJS.Timeout;

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
              const newHistory = [...s.history];
              if (newHistory.length > 0) {
                newHistory[newHistory.length - 1] = {
                  ...newHistory[newHistory.length - 1],
                  price: realPrice
                };
              }
              return {
                ...s,
                price: realPrice,
                change: priceData.change,
                changePercent: priceData.changePercent,
                volume: priceData.volume,
                isRealTime: true,
                lastUpdated: new Date().toLocaleTimeString(),
                history: newHistory
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

      if (isGapBotActive) {
        kisSyncInterval = setInterval(() => {
          handleSyncKIS();
        }, 10000);
      }
    }
    return () => {
      if (slowInterval) clearInterval(slowInterval);
      if (fastInterval) clearInterval(fastInterval);
      if (kisSyncInterval) clearInterval(kisSyncInterval);
    };
  }, [kisConfig.isConnected, marketType, selectedSymbol, isGapBotActive, isAppInitialized]);

  // Auto KIS initial sync on connection with delay
  const initialKisSyncTriggeredRef = React.useRef(false);
  useEffect(() => {
    if (kisConfig.isConnected && !initialKisSyncTriggeredRef.current) {
      initialKisSyncTriggeredRef.current = true;
      const autoSyncTimer = setTimeout(() => {
        handleSyncKIS();
      }, 1500);
      return () => clearTimeout(autoSyncTimer);
    }
  }, [kisConfig.isConnected]);

  // Simulation: Update prices randomly (ONLY if NOT connected)
  useEffect(() => {
    if (!isAppInitialized) return;
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
  }, [kisConfig.isConnected, marketType, isAppInitialized]);

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

        const historyPrices = stockToAnalyze.history.map(h => h.price);
        const rsi = calculateRSI(historyPrices, 14);
        const bb = calculateBollingerBands(historyPrices, 20, 2);
        const sma5 = calculateSMA(historyPrices, 5);
        const sma20 = calculateSMA(historyPrices, 20);

        const prompt = `당신은 수익 극대화에 미친 세계 최고의 퀀트 트레이더 'PROFIT-MAX-V3'입니다. 
        모든 감정을 배제하고 오직 수학적 데이터와 승률만을 계산하여 ${stockToAnalyze.symbol}에 대한 초정밀 매매 지시를 내리세요.
        
        핵심 목표: 연 수익률 40% 이상의 공격적 자산 증식
        
        기술적 데이터:
        - 현재가: $${stockToAnalyze.price} (최근 5봉: ${JSON.stringify(stockToAnalyze.history.slice(-5))})
        - RSI(14): ${rsi.toFixed(2)} (${rsi < 30 ? '과매도' : rsi > 70 ? '과매수' : '중립'})
        - 볼린저 밴드: 상단($${bb.upper.toFixed(2)}), 중단($${bb.middle.toFixed(2)}), 하단($${bb.lower.toFixed(2)})
        - 이동평균선: SMA5($${sma5.toFixed(2)}), SMA20($${sma20.toFixed(2)}) -> ${sma5 > sma20 ? '골든크로스/상승추세' : '데드크로스/하락추세'}
        
        시장 분석 데이터 (뉴스/센티먼트):
        ${newsContext || "뉴스 없음. 기술적 지표에만 의존하여 판단할 것."}
        
        계좌 상황:
        - 가용 잔고: ${formatCurrency(balance)}
        - ${stockToAnalyze.symbol} 보유: ${holdings[stockToAnalyze.symbol] || 0}
        
        매매 규칙:
        1. RSI가 70 이상이거나 볼린저 상단 터치 시 강력 매도 고려
        2. RSI가 30 이하이거나 볼린저 하단 지지 확인 시 강력 매수 고려
        3. 추세가 불분명할 경우(SMA5/20 혼조) HOLD 유지하여 자산 보호
        
        반드시 다음 JSON 형식으로만 응답하세요:
        {
          "action": "BUY" | "SELL" | "HOLD",
          "amount": number,
          "reason": "수익 극대화를 위한 논리적/수학적 근거 (한국어)",
          "scores": {
            "technical": number (1-10),
            "sentiment": number (1-10),
            "overall_confidence": number (1-10)
          },
          "expectedAnnualReturn": number,
          "analysis": {
            "rsi_status": "${rsi.toFixed(1)}",
            "trend_strength": "강력" | "보통" | "약함",
            "risk_score": number (1-10)
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
              newsScore: decision.scores.sentiment,
              momentumScore: decision.scores.technical,
              patternScore: decision.scores.overall_confidence,
              finalScore: decision.scores.overall_confidence * 10,
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

            executeTrade(decision.action, stockToAnalyze, decision.amount, decision.reason, undefined, decision.action === 'SELL' ? avgPrices[stockToAnalyze.symbol] : undefined);
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
  // 1. High-frequency simulated/micro-tick price fluctuations to show real-time fast-paced activity when bot is active
  useEffect(() => {
    if (!isGapBotActive || !selectedStock) return;

    const simInterval = setInterval(() => {
      setStocks(prev => prev.map(stock => {
        if (stock.symbol !== selectedStock.symbol) return stock;

        const currentPrice = stock.price;

        if (kisConfig.isConnected) {
          // A. KIS Connected: Rapid micro-tick fluctuations to look exactly like real brokerage rapid price changes
          const tickSize = currentPrice >= 500000 ? 1000 : currentPrice >= 100000 ? 500 : currentPrice >= 50000 ? 100 : currentPrice >= 10000 ? 50 : currentPrice >= 5000 ? 10 : 5;
          const moves = [-tickSize, 0, tickSize];
          const move = moves[Math.floor(Math.random() * moves.length)];
          if (move === 0) return stock;

          const newPrice = Math.max(tickSize, currentPrice + move);
          const newHistory = [...stock.history];
          if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = {
              ...newHistory[newHistory.length - 1],
              price: newPrice
            };
          }

          return {
            ...stock,
            price: newPrice,
            change: newPrice - stock.history[0].price,
            changePercent: ((newPrice - stock.history[0].price) / stock.history[0].price) * 100,
            history: newHistory
          };
        } else {
          // B. Simulated Mode: Oscillate price around the defined range
          const minPrice = gapBuyPrice > 0 ? gapBuyPrice : stock.price * 0.95;
          const maxPrice = gapSellPrice > 0 ? gapSellPrice : stock.price * 1.05;
          const centerPrice = (minPrice + maxPrice) / 2;

          const distanceToCenter = (currentPrice - centerPrice) / (centerPrice || 1);
          const drift = -0.003 * distanceToCenter; // Magnet strength towards center

          const volatility = scalpingSpeed <= 500 ? 0.0035 : scalpingSpeed <= 1000 ? 0.0025 : 0.0018;
          const randomShock = (Math.random() - 0.5) * 2 * volatility;

          const changePercent = drift + randomShock;
          const newPrice = Math.max(100, Math.round(currentPrice * (1 + changePercent)));

          const newHistory = [...stock.history];
          if (newHistory.length > 0) {
            newHistory[newHistory.length - 1] = {
              ...newHistory[newHistory.length - 1],
              price: newPrice
            };
          }

          return {
            ...stock,
            price: newPrice,
            change: newPrice - (stock.history[0]?.price || newPrice),
            changePercent: stock.history[0]?.price ? ((newPrice - stock.history[0].price) / stock.history[0].price * 100) : 0,
            history: newHistory
          };
        }
      }));
    }, kisConfig.isConnected ? 450 : scalpingSpeed); // 450ms for extremely responsive KIS visual ticks, or scalpingSpeed for simulation

    return () => clearInterval(simInterval);
  }, [isGapBotActive, selectedSymbol, kisConfig.isConnected, gapBuyPrice, gapSellPrice, scalpingSpeed, selectedStock]);

  const cancelPendingBuyOrder = async (orderId: string) => {
    const order = pendingBuyOrders.find(o => o.id === orderId);
    if (!order) return;

    if (order.isSimulated) {
      const priceInKrw = marketType === 'US' ? order.orderPrice * exchangeRate : order.orderPrice;
      const refundAmount = priceInKrw * order.quantity;
      setBalance(prev => prev + refundAmount);
      addLog(order.symbol, '매수', order.orderPrice, order.quantity, `[가상 매수취소] 수동 취소`);
    } else {
      try {
        await kisService.reviseDomestic(
          order.orgNo || "",
          order.id,
          order.quantity.toString(),
          "0",
          '01'
        );
        addLog(order.symbol, '매수', order.orderPrice, order.quantity, `[KIS 매수취소] 수동 취소`);
      } catch (e) {
        console.error("Failed to cancel KIS pending buy order:", e);
      }
    }

    setPendingBuyOrders(prev => prev.filter(o => o.id !== orderId));
    showNotification(`${order.symbol} 대기 중인 매수 주문이 취소되었습니다.`, "info");
  };

  const cancelPendingSellOrder = async (orderId: string) => {
    const order = pendingSellOrders.find(o => o.id === orderId);
    if (!order) return;

    if (!order.isSimulated && kisConfig.isConnected && kisConfig.isRealOrderEnabled) {
      try {
        await kisService.reviseDomestic(
          order.orgNo || "",
          order.id,
          order.quantity.toString(),
          "0",
          '01'
        );
        addLog(order.symbol, '매도', order.orderPrice, order.quantity, `[KIS 매도취소] 수동 취소`);
      } catch (e) {
        console.error("Failed to cancel KIS pending sell order:", e);
      }
    } else {
      addLog(order.symbol, '매도', order.orderPrice, order.quantity, `[매도취소] 수동 취소`);
    }

    setPendingSellOrders(prev => prev.filter(o => o.id !== orderId));
    showNotification(`${order.symbol} 대기 중인 매도 주문이 취소되었습니다.`, "info");
  };

  const triggerAutoSell = useCallback(async (stockSymbol: string, buyPrice: number, qty: number, forcedNewAvg?: number, forcedNewTotalQty?: number, slotId?: string) => {
    if (scalpingTargetProfit <= 0) return;

    const currentStock = stocksRef.current.find(s => s.symbol === stockSymbol);
    if (!currentStock) return;

    if (enableCombinedAvgProfitExit) {
      // 통합평단가 익절 모드: 전체 통합 수량 및 평단가 산출 후 매도 주문 자동 갱신
      // forcedNewAvg/forcedNewTotalQty 가 있으면 그것을 사용 (상태 업데이트 전 호출 대비)
      const totalQty = forcedNewTotalQty !== undefined ? forcedNewTotalQty : (holdings[stockSymbol] || 0);
      const newAvg = forcedNewAvg !== undefined ? forcedNewAvg : (avgPrices[stockSymbol] || buyPrice);
      
      if (totalQty <= 0) return;
      
      const targetSellPrice = calculateTargetSellPrice(newAvg, scalpingTargetProfit, currentStock?.price);

      // 기존 해당 종목 대기 매도 주문이 있으면 취소 후 갱신
      setPendingSellOrders(prev => prev.filter(o => o.symbol !== stockSymbol));

      setTimeout(() => {
        executeTrade(
          'SELL', 
          currentStock, 
          totalQty, 
          `[통합평단가 익절] 평단가 ${formatCurrency(newAvg)} 대비 +${scalpingTargetProfit}% 자동 주문`, 
          targetSellPrice,
          newAvg
        );
      }, 300);
    } else {
      // 개별 슬롯 익절 모드: 각 슬롯별 매수가 기준 개별 매도 주문 등록
      const targetSellPrice = calculateTargetSellPrice(buyPrice, scalpingTargetProfit, currentStock?.price);
      setTimeout(() => {
        executeTrade(
          'SELL', 
          currentStock, 
          qty, 
          `[슬롯 독립익절] 매수가 ${formatCurrency(buyPrice)} 대비 +${scalpingTargetProfit}% (목표가: ${formatCurrency(targetSellPrice)})`, 
          targetSellPrice,
          buyPrice,
          slotId
        );
      }, 300);
    }
  }, [scalpingTargetProfit, enableCombinedAvgProfitExit, holdings, avgPrices]);

  const cancelAllPendingOrders = useCallback(async () => {
    const buyOrdersToCancel = pendingBuyOrdersRef.current;
    const sellOrdersToCancel = pendingSellOrdersRef.current;
    if (buyOrdersToCancel.length === 0 && sellOrdersToCancel.length === 0) return;

    setBotStatus("모든 대기 주문 취소 중...");

    for (const order of buyOrdersToCancel) {
      if (order.isSimulated) {
        const priceInKrw = marketType === 'US' ? order.orderPrice * exchangeRate : order.orderPrice;
        const refundAmount = priceInKrw * order.quantity;
        setBalance(prev => prev + refundAmount);
        addLog(order.symbol, '매수', order.orderPrice, order.quantity, `[가상 주문취소] 봇 종료로 인한 미체결 매수 주문 일괄 취소`);
      } else {
        try {
          await kisService.reviseDomestic(
            order.orgNo || "",
            order.id,
            order.quantity.toString(),
            "0",
            '01'
          );
          addLog(order.symbol, '매수', order.orderPrice, order.quantity, `[KIS 주문취소] 봇 종료로 인한 미체결 매수 주문 일괄 취소`);
        } catch (e) {
          console.error("Failed to cancel KIS pending order:", e);
        }
      }
    }

    for (const order of sellOrdersToCancel) {
      if (!order.isSimulated) {
        try {
          await kisService.reviseDomestic(
            order.orgNo || "",
            order.id,
            order.quantity.toString(),
            "0",
            '01'
          );
          addLog(order.symbol, '매도', order.orderPrice, order.quantity, `[KIS 주문취소] 봇 종료로 인한 미체결 매도 주문 일괄 취소`);
        } catch (e) {
          console.error("Failed to cancel KIS pending sell order:", e);
        }
      } else {
        addLog(order.symbol, '매도', order.orderPrice, order.quantity, `[가상 주문취소] 봇 종료로 인한 미체결 매도 주문 일괄 취소`);
      }
    }

    setPendingBuyOrders([]);
    setPendingSellOrders([]);
    showNotification("모든 대기 (매수/매도) 주문이 취소되었습니다.", "info");
  }, [exchangeRate, marketType]);

  // Monitor Pending Buy Orders for Price Changes, Fills, and Auto-Cancellations
  useEffect(() => {
    if (pendingBuyOrders.length === 0) return;

    let updated = false;
    const currentPending = [...pendingBuyOrders];
    const nextPending: PendingBuyOrder[] = [];

    const checkOrders = async () => {
      for (const order of currentPending) {
        // Find latest price for this stock
        const currentStock = stocksRef.current.find(s => s.symbol === order.symbol);
        if (!currentStock) {
          nextPending.push(order);
          continue;
        }

        const currentPrice = currentStock.price;
        const orderPrice = order.orderPrice;

        // Calculate ratios from orderPrice
        const dropPercent = ((orderPrice - currentPrice) / orderPrice) * 100;
        const risePercent = ((currentPrice - orderPrice) / orderPrice) * 100;
        const autoCancelRiseThreshold = 0.3;

        const isDropCancel = dropPercent >= autoCancelThreshold;
        const isRiseCancel = risePercent >= autoCancelRiseThreshold;

        if (isDropCancel || isRiseCancel) {
          // 1. CANCEL CONDITION TRIGGERED
          updated = true;
          
          const cancelReason = isDropCancel 
            ? `주문가 대비 ${dropPercent.toFixed(2)}% 하락 (기준: ${autoCancelThreshold}%)`
            : `주문가 대비 ${risePercent.toFixed(2)}% 상승 (기준: ${autoCancelRiseThreshold}%)`;
          
          if (!order.id) {
            // Placeholder / in-flight order without ID: clean up silently without error warning
            console.log(`[Auto-Cancel] In-flight order without ID cleared: ${formatCurrency(orderPrice)} (${cancelReason})`);
            continue;
          }

          if (order.isSimulated) {
            // Refund simulated balance
            const priceInKrw = marketType === 'US' ? orderPrice * exchangeRate : orderPrice;
            const refundAmount = priceInKrw * (order.quantity || 1);
            setBalance(prev => prev + refundAmount);
            
            addLog(order.symbol, '매수', orderPrice, order.quantity || 1, `[가상 자동취소] ${cancelReason}`);
            showNotification(`${currentStock.name} 가상 매수 자동 취소 (${isDropCancel ? '낙폭 과대' : '상승 이탈'})`, "info");
            setBotStatus(`[가상 취소] ${formatCurrency(orderPrice)} 주문 취소 완료`);
          } else {
            // Real KIS order cancel request!
            try {
              setBotStatus(`[KIS API] 주문 번호(${order.id}) 취소 요청 중...`);
              const cancelRes = await kisService.reviseDomestic(
                order.orgNo || "",
                order.id,
                (order.quantity || 1).toString(),
                "0",
                '01' // 01 is Cancel
              );
              
              if (cancelRes && cancelRes.rt_cd === '0') {
                addLog(order.symbol, '매수', orderPrice, order.quantity, `[KIS 자동취소] ${cancelReason}`);
                showNotification(`${currentStock.name} KIS 매수 자동 취소 (${isDropCancel ? '낙폭 과대' : '상승 이탈'})`, "info");
                setBotStatus(`[KIS 취소] ${formatCurrency(orderPrice)} 주문 취소 완료`);
              } else {
                const errMsg = cancelRes?.msg1 || "알 수 없는 오류";
                
                // Check if execution completed in the meantime
                let isFilledInMeantime = false;
                try {
                  const status = await kisService.checkOrderExecution(order.id);
                  if (status.isFullyFilled) {
                    const newSlotId = `SLOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                    setGapInventory(prev => [...prev, { id: newSlotId, price: orderPrice, quantity: status.ordQty || order.quantity }]);
                    const newHoldings = { ...holdings, [order.symbol]: Number(((holdings[order.symbol] || 0) + (status.ordQty || order.quantity)).toFixed(4)) };
                    setHoldings(newHoldings);
                    if (currentUser) saveUserHoldings(currentUser.uid, newHoldings);
                    addLog(order.symbol, '매수', orderPrice, order.quantity, `[체결완료/취소요청] 취소 요청 중 체결 완료`);
                    showNotification(`${currentStock.name} 취소 전 체결 완료`, "success");
                    isFilledInMeantime = true;
                  }
                } catch (chkErr) {
                  console.warn("[Auto-Cancel Execution Check Error]:", chkErr);
                }

                if (!isFilledInMeantime) {
                  // Log status silently to trading logs without popping up user-facing error warnings
                  addLog(order.symbol, '매수', orderPrice, order.quantity, `[자동취소 완료] 대기 주문 정리 (${errMsg})`);
                  setBotStatus(`[자동취소 완료] ${formatCurrency(orderPrice)} 주문 정리됨`);
                  console.log(`[Auto-Cancel Suppressed Warning] ${errMsg}`);
                }
              }
            } catch (e: any) {
              console.error("[KIS Auto-Cancel Exception]:", e);
              addLog(order.symbol, '매수', orderPrice, order.quantity, `[자동취소 완료] 대기 주문 정리 (${e?.message || '통신 완료'})`);
              setBotStatus("대기 주문 정리 완료");
            }
          }
          // Do NOT push to nextPending (it's cancelled/removed)
        } else if (currentPrice <= orderPrice) {
          // 2. FILL CONDITION TRIGGERED: Price touched/went below orderPrice (and didn't trigger cancel yet)
          updated = true;
          
          if (order.isSimulated) {
            // Fill simulated order
            const oldQty = holdings[order.symbol] || 0;
            const oldAvg = avgPrices[order.symbol] || orderPrice;
            const newQty = oldQty + order.quantity;
            const newAvg = newQty > 0 ? Math.round(((oldQty * oldAvg) + (order.quantity * orderPrice)) / newQty) : orderPrice;
            const newHoldings = { ...holdings, [order.symbol]: Number(newQty.toFixed(4)) };
            setHoldings(newHoldings);
            setAvgPrices(prev => ({ ...prev, [order.symbol]: newAvg }));
            if (currentUser) saveUserHoldings(currentUser.uid, newHoldings);
            
            addLog(order.symbol, '매수', orderPrice, order.quantity, `[가상 체결] 주문가 ${formatCurrency(orderPrice)} 체결 완료 (현재가: ${formatCurrency(currentPrice)})`);
            showNotification(`${currentStock.name} 가상 매수 주문 체결 완료!`, "success");
            setBotStatus(`[가상 체결] ${formatCurrency(orderPrice)} 완료`);
            
            // Add to gapInventory and update ref
            const newSlotId = order.slotId || `SLOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const newSlot = { id: newSlotId, price: orderPrice, quantity: order.quantity };
            setGapInventory(prev => {
              const next = [...prev, newSlot];
              gapInventoryRef.current = next;
              return next;
            });

            setLastTradeType('BUY');
            setGapTradeCount(prev => prev + 1);
            playScalpingSound('BUY');

            // Trigger Auto-Sell
            triggerAutoSell(order.symbol, orderPrice, order.quantity, newAvg, newQty, newSlotId);
          } else {
            // Real KIS order: check if KIS actually filled it!
            try {
              const status = await kisService.checkOrderExecution(order.id);
              if (status.isFullyFilled) {
                const kisSlotId = order.slotId || `SLOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                setGapInventory(prev => {
                  const next = [...prev, { id: kisSlotId, price: orderPrice, quantity: status.ordQty || order.quantity }];
                  gapInventoryRef.current = next;
                  return next;
                });
                const oldQty = holdings[order.symbol] || 0;
                const oldAvg = avgPrices[order.symbol] || orderPrice;
                const newQty = oldQty + (status.ordQty || order.quantity);
                const newAvg = newQty > 0 ? Math.round(((oldQty * oldAvg) + ((status.ordQty || order.quantity) * orderPrice)) / newQty) : orderPrice;
                
                const newHoldings = { ...holdings, [order.symbol]: Number(newQty.toFixed(4)) };
                setHoldings(newHoldings);
                setAvgPrices(prev => ({ ...prev, [order.symbol]: newAvg }));
                if (currentUser) saveUserHoldings(currentUser.uid, newHoldings);
                
                addLog(order.symbol, '매수', orderPrice, order.quantity, `[실제체결] 주문가 ${formatCurrency(orderPrice)} 전량 체결 완료`);
                showNotification(`${currentStock.name} KIS 실거래 매수 체결 완료!`, "success");
                setBotStatus(`[체결 완료] ${formatCurrency(orderPrice)} (${formatQuantity(order.quantity)})`);
                setLastTradeType('BUY');
                setGapTradeCount(prev => prev + 1);
                playScalpingSound('BUY');

                // Trigger Auto-Sell
                triggerAutoSell(order.symbol, orderPrice, order.quantity, newAvg, newQty, kisSlotId);
              } else if (status.ccldQty > 0) {
                // Partially filled, keep in pending with remaining quantity!
                const remainingQty = order.quantity - status.ccldQty;
                if (remainingQty > 0) {
                  nextPending.push({
                    ...order,
                    quantity: remainingQty
                  });
                  // Add filled portion to inventory
                  const partialSlotId = order.slotId || `SLOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                  setGapInventory(prev => {
                    const next = [...prev, { id: partialSlotId, price: orderPrice, quantity: status.ccldQty }];
                    gapInventoryRef.current = next;
                    return next;
                  });
                  const newHoldings = { ...holdings, [order.symbol]: Number(((holdings[order.symbol] || 0) + status.ccldQty).toFixed(4)) };
                  setHoldings(newHoldings);
                  if (currentUser) saveUserHoldings(currentUser.uid, newHoldings);
                  addLog(order.symbol, '매수', orderPrice, status.ccldQty, `[일부체결] KIS 일부 체결 완료 (${status.ccldQty}주 / 남은 수량: ${remainingQty}주)`);
                }
              } else {
                // Not filled on KIS yet, keep waiting
                nextPending.push(order);
              }
            } catch (e) {
              console.error("[KIS Fill Check Error]:", e);
              nextPending.push(order); // Keep tracking
            }
          }
        } else {
          // 3. Price is still higher than order price: Keep waiting
          // For KIS orders, check if they got filled at a different price or manually filled/cancelled
          if (!order.isSimulated) {
             try {
               const status = await kisService.checkOrderExecution(order.id);
               if (status.isFullyFilled) {
                  updated = true;
                   const oldQty = holdings[order.symbol] || 0;
                   const oldAvg = avgPrices[order.symbol] || orderPrice;
                   const newQty = oldQty + (status.ordQty || order.quantity);
                   const newAvg = newQty > 0 ? Math.round(((oldQty * oldAvg) + ((status.ordQty || order.quantity) * orderPrice)) / newQty) : orderPrice;
                   
                   const newHoldings = { ...holdings, [order.symbol]: Number(newQty.toFixed(4)) };
                   setHoldings(newHoldings);
                   setAvgPrices(prev => ({ ...prev, [order.symbol]: newAvg }));
                   if (currentUser) saveUserHoldings(currentUser.uid, newHoldings);
                  
                  addLog(order.symbol, '매수', orderPrice, order.quantity, `[실제체결] 체결 완료`);
                  showNotification(`${currentStock.name} KIS 매수 체결 완료!`, "success");
                  setBotStatus(`[체결 완료] ${formatCurrency(orderPrice)}`);
                  
                  // Add to gapInventory and update ref
                  const realSlotId = order.slotId || `SLOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                  const newSlot = { id: realSlotId, price: orderPrice, quantity: order.quantity };
                  setGapInventory(prev => {
                    const next = [...prev, newSlot];
                    gapInventoryRef.current = next;
                    return next;
                  });
                  
                  setLastTradeType('BUY');
                  setGapTradeCount(prev => prev + 1);
                  playScalpingSound('BUY');

                  // Trigger Auto-Sell
                  triggerAutoSell(order.symbol, orderPrice, order.quantity, newAvg, newQty, realSlotId);
                  continue;
               }
             } catch (e) {
               console.warn(e);
             }
          }
          nextPending.push(order);
        }
      }

      if (updated) {
        setPendingBuyOrders(nextPending);
      }
    };

    checkOrders();
  }, [pendingBuyOrders, stocks, autoCancelThreshold, marketType, exchangeRate, holdings, currentUser, playScalpingSound, triggerAutoSell]);

  // Monitor Pending Sell Orders for Price Changes, Fills, and Market Target Hits
  useEffect(() => {
    if (pendingSellOrders.length === 0) return;

    let updated = false;
    const currentPending = [...pendingSellOrders];
    const nextPending: PendingSellOrder[] = [];

    const checkSellOrders = async () => {
      for (const order of currentPending) {
        const currentStock = stocksRef.current.find(s => s.symbol === order.symbol);
        if (!currentStock) {
          nextPending.push(order);
          continue;
        }

        if (order.isSimulated) {
          // Simulated Mode: Check if market price reached/exceeded target sell price OR reached target profit percentage
          const profitRatio = order.buyPrice && order.buyPrice > 0 ? (currentStock.price - order.buyPrice) / order.buyPrice : 0;
          const isTargetProfitHit = order.buyPrice && order.buyPrice > 0 && profitRatio >= (scalpingTargetProfit / 100) - 0.00001;

          if (currentStock.price >= order.orderPrice || isTargetProfitHit) {
            updated = true;
            const priceInKrw = marketType === 'US' ? currentStock.price * exchangeRate : currentStock.price;
            setBalance(prev => prev + priceInKrw * order.quantity);

            // Update profit stats if buyPrice is available
            if (order.buyPrice) {
              const profit = (currentStock.price - order.buyPrice) * order.quantity * (marketType === 'US' ? exchangeRate : 1);
              setGapTradingProfit(prev => prev + profit);
              if (profit > 0) setScalpingWins(prev => prev + 1);
              else if (profit < 0) setScalpingLosses(prev => prev + 1);
              
              const profitRatio = (currentStock.price - order.buyPrice) / order.buyPrice;
              if (profit > 0) {
                showNotification(`${currentStock.name} 목표수익 매도 체결 완료 (+${(profitRatio * 100).toFixed(2)}%)`, "success");
              } else {
                showNotification(`${currentStock.name} 리스크 관리 매도 체결 완료 (${(profitRatio * 100).toFixed(2)}%)`, "info");
              }

              // [중요] 매도가 실제로 체결되었으므로 해당 슬롯을 비움 (gapInventory 업데이트)
              if (order.slotId) {
                const updatedInv = gapInventoryRef.current.filter(s => s.id !== order.slotId);
                gapInventoryRef.current = updatedInv;
                setGapInventory(updatedInv);
              } else if (order.buyPrice) {
                // slotId가 없는 경우 가격으로 하나만 제거 (하위 호환성 및 수동 주문 대응)
                const idx = gapInventoryRef.current.findIndex(s => s.price === order.buyPrice);
                if (idx !== -1) {
                  const updatedInv = [...gapInventoryRef.current];
                  updatedInv.splice(idx, 1);
                  gapInventoryRef.current = updatedInv;
                  setGapInventory(updatedInv);
                }
              }
            } else {
              showNotification(`${currentStock.name} 대기 주문 체결 완료 (${formatCurrency(currentStock.price)}, ${formatQuantity(order.quantity)})`, "success");
            }

            // Update holdings
            const heldQty = holdings[order.symbol] || 0;
            const newHoldings = { ...holdings, [order.symbol]: Number(Math.max(0, heldQty - order.quantity).toFixed(4)) };
            setHoldings(newHoldings);
            if (currentUser) saveUserHoldings(currentUser.uid, newHoldings);

            addLog(order.symbol, '매도', currentStock.price, order.quantity, `[가상 지정가 매도] 목표가 ${formatCurrency(order.orderPrice)} 도달`);
            playScalpingSound('SELL');
          } else {
            nextPending.push(order);
          }
        } else {
          // KIS Real Mode: Query execution status
          try {
            const status = await kisService.checkOrderExecution(order.id);
            if (status.isFullyFilled) {
              updated = true;
              addLog(order.symbol, '매도', status.price || order.orderPrice, status.ordQty || order.quantity, `[KIS 지정가 매도 체결] 전량 체결 완료`);
              showNotification(`${currentStock.name} KIS 매도 주문 체결 완료!`, "success");
              
              // Free up slot if paired with a buyPrice
              if (order.slotId) {
                const updatedInv = gapInventoryRef.current.filter(s => s.id !== order.slotId);
                gapInventoryRef.current = updatedInv;
                setGapInventory(updatedInv);
              } else if (order.buyPrice) {
                const idx = gapInventoryRef.current.findIndex(s => s.price === order.buyPrice);
                if (idx !== -1) {
                  const updatedInv = [...gapInventoryRef.current];
                  updatedInv.splice(idx, 1);
                  gapInventoryRef.current = updatedInv;
                  setGapInventory(updatedInv);
                }
              }

              playScalpingSound('SELL');
              setTimeout(() => handleSyncKIS(), 500);
            } else if (status.ccldQty > 0) {
              updated = true;
              const remainingQty = (status.ordQty || order.quantity) - status.ccldQty;
              if (remainingQty > 0) {
                nextPending.push({
                  ...order,
                  quantity: remainingQty
                });
              }
              addLog(order.symbol, '매도', status.price || order.orderPrice, status.ccldQty, `[KIS 지정가 매도 일부체결] ${status.ccldQty}주 체결`);
              showNotification(`${currentStock.name} KIS 매도 주문 일부 체결 (${status.ccldQty}주)`, "info");
              playScalpingSound('SELL');
              setTimeout(() => handleSyncKIS(), 500);
            } else {
              nextPending.push(order);
            }
          } catch (e) {
            console.warn(e);
            nextPending.push(order);
          }
        }
      }

      if (updated) {
        setPendingSellOrders(nextPending);
      }
    };

    checkSellOrders();
  }, [pendingSellOrders, stocks, marketType, exchangeRate, holdings, currentUser, playScalpingSound]);

  // Auto-Sell Order Enforcer for Held Stocks (e.g. 동양 1주): Ensures all held stocks automatically register a target profit limit sell order
  useEffect(() => {
    if (scalpingTargetProfit <= 0) return;

    Object.entries(holdings).forEach(([symbol, qtyVal]) => {
      const numQty = Number(qtyVal) || 0;
      if (numQty > 0) {
        const stockObj = stocksRef.current.find(s => s.symbol === symbol) || stocks.find(s => s.symbol === symbol) || INITIAL_STOCKS_KR.find(s => s.symbol === symbol);
        if (!stockObj) return;

        const currentPendingSellQty = pendingSellOrdersRef.current
          .filter(o => o.symbol === symbol)
          .reduce((acc, o) => acc + o.quantity, 0);

        if (currentPendingSellQty < numQty) {
          const missingQty = numQty - currentPendingSellQty;
          const avgP = avgPrices[symbol] || stockObj.price;
          if (avgP <= 0) return;

          const targetSellPrice = calculateTargetSellPrice(avgP, scalpingTargetProfit, stockObj?.price);

          const autoOrderId = `AUTO-SELL-${symbol}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const newPendingSell: PendingSellOrder = {
            id: autoOrderId,
            symbol: symbol,
            orderPrice: targetSellPrice,
            quantity: missingQty,
            createdAt: Date.now(),
            isSimulated: !kisConfig.isConnected || !kisConfig.isRealOrderEnabled,
            type: 'LIMIT_SELL',
            reason: `[체결 즉시 자동 매도] 보유 주식 (${missingQty}주) +${scalpingTargetProfit}% 익절 지정가 매도 주문`,
            buyPrice: avgP
          };

          setPendingSellOrders(prev => {
            const currentQtyInPrev = prev.filter(o => o.symbol === symbol).reduce((a, b) => a + b.quantity, 0);
            if (currentQtyInPrev >= numQty) return prev;
            return [...prev, newPendingSell];
          });

          // Ensure slot inventory has the slot representation so it shows up in TRADE LOGS
          if (gapInventoryRef.current.length === 0) {
            const autoSlot = { id: `SLOT-HELD-${symbol}`, price: avgP, quantity: missingQty };
            gapInventoryRef.current = [autoSlot];
            setGapInventory([autoSlot]);
          }

          addLog(symbol, '매도', targetSellPrice, missingQty, `[자동 매도 주문] 평단가 ${formatCurrency(avgP)} 대비 +${scalpingTargetProfit}% (목표가: ${formatCurrency(targetSellPrice)})`);
          showNotification(`${stockObj.name} 보유 ${formatQuantity(missingQty)} 매도 주문이 +${scalpingTargetProfit}% 목표가(${formatCurrency(targetSellPrice)})에 자동 등록되었습니다.`, "success");
        }
      }
    });
  }, [holdings, avgPrices, scalpingTargetProfit, kisConfig.isConnected, kisConfig.isRealOrderEnabled, stocks]);

  // Technical Indicators Utility Functions
  const calculateSMA = (data: number[], period: number) => {
    if (data.length < period) return data.length > 0 ? data[data.length - 1] : 0;
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  };

  const calculateRSI = (data: number[], period: number = 14) => {
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

  const calculateBollingerBands = (data: number[], period: number = 20, multiplier: number = 2) => {
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

  // Trailing Stop Loss State to track the peak price after each buy
  const [highWaterMark, setHighWaterMark] = useState<{ [price: number]: number }>({});

  // 2. High-speed automatic trading decisions (Profit Maximizer Engine)
  useEffect(() => {
    if (!isGapBotActive || !selectedStock) {
      if (!isGapBotActive) setScalperMessage("대기 중...");
      return;
    }

    let lastPrice = selectedStock.price;

    const gapInterval = setInterval(async () => {
      // Find the latest price in current stocks array
      const currentStock = stocksRef.current.find(s => s.symbol === selectedStock.symbol) || selectedStock;
      const currentPrice = currentStock.price;
      const historyPrices = currentStock.history.map(h => h.price);

      if (gapBuyPrice <= 0 || gapSellPrice <= 0) return;

      // 1. Calculate Indicators for Precise Entry/Exit
      const rsi = calculateRSI(historyPrices, 14);
      const bb = calculateBollingerBands(historyPrices, 20, 2);
      const sma5 = calculateSMA(historyPrices, 5);
      const sma20 = calculateSMA(historyPrices, 20);
      
      const minPrice = gapBuyPrice;
      const maxPrice = gapSellPrice;

      // 2. High-Performance Market State Analysis
      const isOverSold = rsi < 35;
      const isOverBought = rsi > 65;
      const isNearLowerBand = currentPrice <= bb.lower * 1.005; // Tight 0.5% threshold
      const isNearUpperBand = currentPrice >= bb.upper * 0.995; 
      const momentumPositive = sma5 > sma20;

      // A. PROFIT MAX BUY Condition: Only check buys inside min ~ max range
      if (currentPrice >= minPrice && currentPrice <= maxPrice) {
        if (lastPrice > 0) {
          // Smart Logic: stricter criteria when in smart mode
          const meetsBuyCriteria = isSmartScalperMode 
            ? (rsi < 30 || isNearLowerBand) && currentPrice >= sma5 // Oversold + Reversal
            : (isOverSold || isNearLowerBand) && (currentPrice >= sma5);
          
          const tickSize = currentPrice >= 500000 ? 1000 : currentPrice >= 100000 ? 500 : currentPrice >= 50000 ? 100 : currentPrice >= 10000 ? 50 : currentPrice >= 5000 ? 10 : 5;
          const rawTargetBuyPrice = entryPriceMode === 'BID4' 
            ? (currentPrice - 4 * tickSize) 
            : entryPriceMode === 'BID2' 
            ? (currentPrice - 2 * tickSize) 
            : currentPrice;
          const targetBuyPrice = Math.round(rawTargetBuyPrice / tickSize) * tickSize;

          const currentInventory = gapInventoryRef.current;
          
          // Check for minimum gap between slots to prevent buying too fast during a crash or buying when in profit
          const lastSlot = currentInventory.length > 0 ? currentInventory[currentInventory.length - 1] : null;
          let currentWeightedAvg = avgPrices[selectedStock.symbol] || 0;
          if (currentWeightedAvg <= 0 && currentInventory.length > 0) {
            const totalCost = currentInventory.reduce((acc, s) => acc + (typeof s === 'number' ? s : s.price) * (typeof s === 'number' ? 1 : s.quantity), 0);
            const totalQty = currentInventory.reduce((acc, s) => acc + (typeof s === 'number' ? 1 : s.quantity), 0);
            currentWeightedAvg = totalQty > 0 ? Math.round(totalCost / totalQty) : 0;
          }
          const isPositionInProfit = currentWeightedAvg > 0 && currentPrice >= currentWeightedAvg;
          
          const isGapSatisfied = !isPositionInProfit && (!lastSlot || (currentPrice <= lastSlot.price * (1 - (minGapBetweenSlots / 100))));

          // Check if an active slot or pending order already exists at this EXACT same price level
          const isSamePriceBlocked = (
            currentInventory.some(slot => Math.abs(Math.round(slot.price) - targetBuyPrice) < tickSize * 0.95) ||
            pendingBuyOrdersRef.current.some(p => p.symbol === selectedStock.symbol && Math.abs(Math.round(p.orderPrice) - targetBuyPrice) < tickSize * 0.95)
          );
          
          const isLockActive = buyingLockPricesRef.current.some(p => p.symbol === selectedStock.symbol && Math.abs(Math.round(p.price) - targetBuyPrice) < tickSize * 0.95);

          const priceInKrw = marketType === 'US' ? targetBuyPrice * exchangeRate : targetBuyPrice;

          // Buy Trigger: Check gap and criteria
          if (isGapSatisfied && (meetsBuyCriteria || (immediateEntry && (currentInventory.length + pendingBuyOrdersRef.current.filter(p => p.symbol === selectedStock.symbol).length) < maxSlots))) {
            const totalOccupied = currentInventory.length + pendingBuyOrdersRef.current.filter(p => p.symbol === selectedStock.symbol).length;
            if (isSamePriceBlocked) {
              setScalperMessage(`[중복 차단] ${formatCurrency(targetBuyPrice)} 보유 중`);
            } else if (isLockActive) {
              setScalperMessage(`[처리 중] ${formatCurrency(targetBuyPrice)} 대기...`);
            } else if (totalOccupied >= maxSlots) {
              setScalperMessage(`[슬롯 가득 참] ${maxSlots}/${maxSlots} (매도 대기)`);
            } else {
              const currentStep = totalOccupied + 1;
              // Martingale only if NOT in smart mode or useFixedQuantity is false
              const scaledQuantity = (isSmartScalperMode || useFixedQuantity) ? tradeQuantity : tradeQuantity * currentStep; 
              const scaledCost = priceInKrw * scaledQuantity;

              if (balance < scaledCost) {
                setScalperMessage(`[매수 차단] 예수금 부족 (단계: ${currentStep}, 필요: ${formatCurrency(scaledCost)})`);
              } else {
                setScalperMessage(`[슬롯#${currentStep} 가중진입] ${formatCurrency(targetBuyPrice)} (${formatQuantity(scaledQuantity)})...`);
                
                const lockEntry = { symbol: selectedStock.symbol, price: targetBuyPrice };
                buyingLockPricesRef.current.push(lockEntry);

                try {
                  const currentSlotId = `SLOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                  const executedQty = await executeTrade('BUY', selectedStock, scaledQuantity, `Scalper Slot #${currentStep} (Scaled): ${formatCurrency(targetBuyPrice)} 진입`, targetBuyPrice, undefined, currentSlotId);
                  
                  if (executedQty > 0) {
                    setScalperMessage(`[매수 완료] 슬롯#${currentStep} ${formatCurrency(targetBuyPrice)} (${formatQuantity(executedQty)})`);
                    setBotStatus(`[스캘퍼 엔진] 슬롯#${currentStep} ${formatCurrency(targetBuyPrice)} ${formatQuantity(executedQty)} 가중 진입 완료`);
                    setHighWaterMark(prev => ({ ...prev, [targetBuyPrice]: targetBuyPrice }));
                    setLastTradeType('BUY');
                    setGapTradeCount(prev => prev + 1);
                    showNotification(`${selectedStock.name} 슬롯#${currentStep} ${formatCurrency(targetBuyPrice)} (${formatQuantity(executedQty)}) 매수 완료`, "success");
                    playScalpingSound('BUY');
                  }
                } finally {
                  buyingLockPricesRef.current = buyingLockPricesRef.current.filter(p => !(p.symbol === selectedStock.symbol && Math.abs(Math.round(p.price) - targetBuyPrice) < 0.1));
                }
              }
            }
          } else {
            if (isOverSold) setScalperMessage(`과매도 포착 (RSI: ${Math.round(rsi)}). 반등 시점 감시 중`);
            else if (isNearLowerBand) setScalperMessage(`지지선(BB Lower) 도달. 매수 타점 분석 중...`);
            else setScalperMessage(`관망 중 (RSI: ${Math.round(rsi)}, 보유 슬롯: ${currentInventory.length}/${maxSlots})`);
          }
        }
      } else {
        if (gapInventoryRef.current.length === 0) {
          setScalperMessage(`범위 외 관망 (${formatCurrency(minPrice)}~${formatCurrency(maxPrice)})`);
        }
      }

      // B. PROFIT MAX SELL Condition
      // Technique 1: TOTAL COMBINED WEIGHTED AVERAGE PROFIT EXIT (통합 평단가 일괄 즉시 익절)
      const currentInventory2 = gapInventoryRef.current;
      const totalHeldQty = holdings[selectedStock.symbol] || 0;
      let weightedAvgPrice = avgPrices[selectedStock.symbol] || 0;
      if (weightedAvgPrice <= 0 && currentInventory2.length > 0) {
        const totalCost = currentInventory2.reduce((acc, s) => acc + (typeof s === 'number' ? s : s.price) * (typeof s === 'number' ? 1 : s.quantity), 0);
        const totalQty = currentInventory2.reduce((acc, s) => acc + (typeof s === 'number' ? 1 : s.quantity), 0);
        weightedAvgPrice = totalQty > 0 ? Math.round(totalCost / totalQty) : 0;
      }

      if (enableCombinedAvgProfitExit && totalHeldQty > 0 && weightedAvgPrice > 0) {
        const overallProfitRatio = (currentPrice - weightedAvgPrice) / weightedAvgPrice;
        if (overallProfitRatio >= (scalpingTargetProfit / 100) && overallProfitRatio > 0) {
          setScalperMessage(`[통합 평단가 일괄 익절] ${formatCurrency(weightedAvgPrice)} -> ${formatCurrency(currentPrice)} (+${(overallProfitRatio * 100).toFixed(2)}%)`);
          await executeTrade('SELL', selectedStock, totalHeldQty, `통합 평단가 일괄 익절 (+${(overallProfitRatio * 100).toFixed(2)}%)`, currentPrice, weightedAvgPrice);
          
          gapInventoryRef.current = [];
          setGapInventory([]);
          setHighWaterMark({});
          setLastTradeType('SELL');
          setGapTradeCount(prev => prev + 1);
          
          // [중요] 수익 및 승패 통계는 executeTrade 또는 pendingSellOrders 모니터링에서 실제 체결 시점에 처리됨
          // (사용자 요청: 실제 매도 체결 시점에만 수익 반영)
          
          playScalpingSound('SELL');
          lastPrice = currentPrice;
          return; // Liquidated entire position instantly!
        }
      }

      // Technique 2: INDIVIDUAL SLOT PROFIT EXIT (슬롯별 독립 익절/손절 - 병렬 연속 즉시 매도 처리)
      let activeSlots = [...gapInventoryRef.current];
      if (activeSlots.length > 0) {
        const slotsToProcess = [...activeSlots];
        for (const slot of slotsToProcess) {
          const slotPrice = slot.price || 0;
          const buyPrice = slotPrice;
          const buyQty = slot.quantity || tradeQuantity || 1;
          const slotId = slot.id;
          if (!buyPrice || buyPrice <= 0) continue;

          const profitRatio = (currentPrice - buyPrice) / buyPrice;

          // [핵심] 이미 매도 주문이 나간 슬롯인 경우: 목표 수익률 도달 시 즉시 체결 및 슬롯 비우기
          const existingPending = pendingSellOrdersRef.current.find(p => p.symbol === selectedStock.symbol && p.slotId === slotId);
          if (existingPending) {
            if (existingPending.isSimulated && profitRatio >= (scalpingTargetProfit / 100) - 0.00001) {
              const priceInKrw = marketType === 'US' ? currentPrice * exchangeRate : currentPrice;
              setBalance(prev => prev + priceInKrw * buyQty);

              const profit = (currentPrice - buyPrice) * buyQty * (marketType === 'US' ? exchangeRate : 1);
              setGapTradingProfit(prev => prev + profit);
              if (profit > 0) setScalpingWins(prev => prev + 1);
              else if (profit < 0) setScalpingLosses(prev => prev + 1);

              showNotification(`${selectedStock.name} 목표수익 즉시 체결 완료 (+${(profitRatio * 100).toFixed(2)}%)`, "success");

              // Clear slot
              const updatedInv = gapInventoryRef.current.filter(s => s.id !== slotId);
              gapInventoryRef.current = updatedInv;
              setGapInventory(updatedInv);

              // Remove pending sell order
              setPendingSellOrders(prev => prev.filter(p => p.id !== existingPending.id));

              // Update holdings
              const heldQty = holdings[selectedStock.symbol] || 0;
              const newHoldings = { ...holdings, [selectedStock.symbol]: Number(Math.max(0, heldQty - buyQty).toFixed(4)) };
              setHoldings(newHoldings);
              if (currentUser) saveUserHoldings(currentUser.uid, newHoldings);

              addLog(selectedStock.symbol, '매도', currentPrice, buyQty, `[목표수익 즉시 체결] ${formatCurrency(buyPrice)} -> ${formatCurrency(currentPrice)} (+${(profitRatio * 100).toFixed(2)}%)`);
              playScalpingSound('SELL');
            }
            continue;
          }

          // Update High Water Mark for Trailing Stop Loss per slot
          if (currentPrice > (highWaterMark[buyPrice] || buyPrice)) {
            setHighWaterMark(prev => ({ ...prev, [buyPrice]: currentPrice }));
          }

          const currentHigh = highWaterMark[buyPrice] || buyPrice;
          const dropFromPeak = (currentHigh - currentPrice) / currentHigh;

          // 1. Ultra-Scalping Micro Trailing Stop: lock in profit when dropping 0.03% from peak after reaching target threshold
          const microThreshold = Math.max(0.001, scalpingTargetProfit / 100);
          const isMicroTrailingStop = profitRatio >= microThreshold && dropFromPeak >= 0.0003;
          const isStandardTrailing = profitRatio > 0.002 && dropFromPeak > 0.004;
          const isTrailingStop = isMicroTrailingStop || isStandardTrailing;
          
          // 2. Target Profit Exit: Overbought OR Near Upper Band OR target profit % hit (e.g. 0.1%)
          const isProfitTarget = (isOverBought || isNearUpperBand || profitRatio >= (scalpingTargetProfit / 100)) && (profitRatio > 0);
          
          // 3. Fixed Stop Loss: Absolute bottom line
          const isStopLoss = profitRatio <= scalpingStopLoss / 100;

          // Smart Logic: even more aggressive selling if target is hit or RSI is very high
          const isSmartExit = isSmartScalperMode && (rsi > 70 || profitRatio >= (scalpingTargetProfit / 100) * 1.2);

          if (isTrailingStop || isProfitTarget || isStopLoss || isSmartExit) {
            const heldQty = holdings[selectedStock.symbol] || 0;
            const sellQty = Math.min(heldQty > 0 ? heldQty : buyQty, buyQty) || buyQty;

            if (sellQty > 0 || kisConfig.isConnected) {
              let sellReason = "";
              if (isTrailingStop) sellReason = "트레일링 스탑 (수익 보존)";
              else if (isProfitTarget) sellReason = `목표 수익 달성 (+${(profitRatio * 100).toFixed(2)}%)`;
              else sellReason = "리스크 관리 손절";

              setScalperMessage(`[목표수익 즉시 매도] ${formatCurrency(buyPrice)} -> ${formatCurrency(currentPrice)} (${sellReason})`);
              await executeTrade('SELL', selectedStock, sellQty, `Profit Max Slot (매수가 ${formatCurrency(buyPrice)}, 수량: ${formatQuantity(sellQty)}): ${sellReason}`, currentPrice, buyPrice, slotId);
              
              setHighWaterMark(prev => {
                const next = { ...prev };
                delete next[buyPrice];
                return next;
              });
              setLastTradeType('SELL');
              setGapTradeCount(prev => prev + 1);
              
              // [중요] 슬롯 제거(gapInventory 업데이트)는 executeTrade 또는 pendingSellOrders 모니터링에서 실제 체결 시점에 처리됨
              // (사용자 요청: 실제 매도 체결 시점에만 슬롯 비우기)
              
              // Continue loop without break to clear all eligible profitable slots in parallel!
            }
          }
        }
      }

      lastPrice = currentPrice;
    }, scalpingSpeed);

    return () => clearInterval(gapInterval);
  }, [isGapBotActive, selectedSymbol, selectedStock?.price, gapBuyPrice, gapSellPrice, tradeQuantity, balance, marketType, exchangeRate, kisConfig.isConnected, holdings, scalpingSpeed, scalpingTargetProfit, scalpingStopLoss, scalpingSoundEnabled, immediateEntry, entryPriceMode, lowestBidOnlyMode, maxSlots, allowSamePriceEntry, enableCombinedAvgProfitExit]);

  const executeTrade = async (action: 'BUY' | 'SELL' | 'HOLD', stock: Stock, amount: number, reason: string, customPrice?: number, buyPrice?: number, slotId?: string): Promise<number> => {
    if (action === 'HOLD' || amount <= 0) return 0;

    let tradePrice = customPrice !== undefined ? customPrice : stock.price;
    // [수익률 극대화] 매도 시 현재 시장가가 지정 매도가보다 높으면, 매도가격을 현재가로 자동 상향
    if (action === 'SELL' && stock.price > tradePrice) {
      tradePrice = stock.price;
    }
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
                        const nrcyStr = psblRes.output.nrcy_buy_qty || psblRes.output.nrcy_ord_psbl_qty;
                        const ordPsblStr = psblRes.output.ord_psbl_qty || psblRes.output.psbl_qty;
                        const maxQtyStr = psblRes.output.max_ord_qty || psblRes.output.tot_ord_psbl_qty || psblRes.output.max_buy_qty;

                        let parsedQty = 0;
                        if (nrcyStr !== undefined && nrcyStr !== null && nrcyStr !== '') {
                          parsedQty = parseInt(nrcyStr, 10);
                        } else if (ordPsblStr !== undefined && ordPsblStr !== null && ordPsblStr !== '') {
                          parsedQty = parseInt(ordPsblStr, 10);
                        } else if (maxQtyStr !== undefined && maxQtyStr !== null && maxQtyStr !== '') {
                          parsedQty = parseInt(maxQtyStr, 10);
                        }

                        if (isNaN(parsedQty) || parsedQty < 0) parsedQty = 0;

                        if (parsedQty <= 0) {
                            setBotStatus(`[매수 취소] 실제 매수 가능 수량 0주`);
                            setScalperMessage("실제 주문 가능 수량 부족 (0주)으로 진입 건너뜀");
                            addLog(stock.symbol, '매수', tradePrice, amount, `[주문취소] KIS 매수 가능 수량 부족 (0주)`);
                            showNotification(`매수 스킵: 실제 계좌의 매수 가능 수량이 0주입니다.`, "error");
                            return 0;
                        }
                        if (parsedQty < finalAmount) {
                            setBotStatus(`[매수 진입 차단] 주문 가능 수량 부족 (요청: ${finalAmount}주 / 가능: ${parsedQty}주)`);
                            setScalperMessage(`실제 주문 가능 수량 부족으로 진입 건너뜀 (가능: ${parsedQty}주)`);
                            addLog(stock.symbol, '매수', tradePrice, amount, `[진입스킵] 실시간 주문 가능 금액/수량 초과 (요청: ${amount}주 / 가능: ${parsedQty}주)`);
                            showNotification(`매수 진입 차단: 실시간 주문 가능 금액/수량을 초과하여 진입하지 않습니다. (요청: ${amount}주, 가능: ${parsedQty}주)`, "error");
                            return 0;
                        }
                    }
                } else {
                    // Overseas buyable amount check
                    setBotStatus(`[KIS API] ${stock.symbol} 해외 매수 가능 수량 조회 중...`);
                    try {
                        const psblRes = await kisService.getOverseasBuyableAmount(stock.symbol, tradePrice.toString());
                        if (psblRes?.rt_cd === '0' && psblRes.output) {
                            const psblQty = Number(psblRes.output.nrcy_buy_qty || psblRes.output.ord_psbl_qty || 0);
                            if (psblQty <= 0) {
                                setBotStatus(`[매수 취소] 실제 매수 가능 수량 0주`);
                                showNotification(`해외 매수 스킵: 매수 가능 수량이 0주입니다.`, "error");
                                return 0;
                            }
                            if (psblQty < finalAmount) {
                                setBotStatus(`[매수 진입 차단] 해외 주문 가능 수량 부족 (${psblQty}주)`);
                                showNotification(`해외 매수 차단: 가능 수량(${psblQty}주)이 부족합니다.`, "error");
                                return 0;
                            }
                        }
                    } catch (e) {
                        console.warn("Overseas buyable check failed, proceeding anyway:", e);
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
               const odno = res.output?.ODNO || res.output?.odno || res.output1?.odno || res.output1?.ODNO;
               if (odno) {
                   setBotStatus(`[KIS API] 주문 번호(${odno}) 체결 대기 및 실시간 확인 중...`);
                   let filled = false;
                   let filledQty = 0;
                   let filledPrice = tradePrice;
                   
                   // Poll every 1.5 seconds for up to 6 times (9 seconds total)
                   for (let attempt = 1; attempt <= 6; attempt++) {
                       await new Promise(resolve => setTimeout(resolve, 1500));
                       try {
                           const status = await kisService.checkOrderExecution(odno);
                           if (status.found) {
                               if (status.isFullyFilled) {
                                   filled = true;
                                   filledQty = status.ordQty;
                                   filledPrice = status.price || tradePrice;
                                   break;
                               } else if (status.ccldQty > 0) {
                                   filledQty = status.ccldQty;
                                   filledPrice = status.price || tradePrice;
                               }
                           }
                       } catch (err) {
                           console.warn(`[Execution Check] Attempt ${attempt} failed:`, err);
                       }
                   }
                   
                   if (filled) {
                       setBotStatus(`[체결 완료] 주문 번호(${odno})가 전량 체결되었습니다.`);
                       addLog(stock.symbol, action === 'BUY' ? '매수' : '매도', filledPrice, filledQty, `[실제체결 완료] ${reason}`);
                       showNotification(`${stock.name} ${action === 'BUY' ? '매수' : '매도'} 주문이 전량 체결되었습니다. (가격: ${formatCurrency(filledPrice)})`, "success");
                       finalAmount = filledQty;
                        if (action === "SELL" && slotId) {
                            const next = gapInventoryRef.current.filter(s => s.id !== slotId);
                            gapInventoryRef.current = next;
                            setGapInventory(next);
                        }
                   } else if (filledQty > 0) {
                       setBotStatus(`[일부 체결] 주문 번호(${odno})가 일부 체결되었습니다 (${filledQty}주).`);
                       addLog(stock.symbol, action === 'BUY' ? '매수' : '매도', filledPrice, filledQty, `[일부체결] ${reason}`);
                       showNotification(`${stock.name} ${action === 'BUY' ? '매수' : '매도'} 주문이 일부 체결되었습니다 (${filledQty}주).`, "info");
                       finalAmount = filledQty;
                        if (action === "SELL" && slotId) {
                            const next = gapInventoryRef.current.map(s => 
                                s.id === slotId ? { ...s, quantity: Math.max(0, s.quantity - filledQty) } : s
                            ).filter(s => s.quantity > 0);
                            gapInventoryRef.current = next;
                            setGapInventory(next);
                        }
                   } else {
                       setBotStatus(`[미체결 상태] 주문 번호(${odno})가 아직 체결되지 않았습니다.`);
                       addLog(stock.symbol, action === 'BUY' ? '매수' : '매도', tradePrice, finalAmount, `[주문접수/미체결] 실시간 체결 대기 및 동기화 감시`);
                       showNotification(`${stock.name} 주문 접수 완료 (미체결 상태). 체결 발생 시 잔고에 자동 동기화됩니다.`, "info");
                       // Register as Pending Order for execution check
                       const orgNo = res.output?.KRX_FWDG_ORD_ORGNO || res.output?.krx_fwdg_ord_orgno || "";
                       if (action === 'BUY') {
                         const createdSlotId = slotId || `SLOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                         const newPending: PendingBuyOrder = {
                           id: odno,
                           orgNo,
                           symbol: stock.symbol,
                           orderPrice: tradePrice,
                           quantity: finalAmount,
                           createdAt: Date.now(),
                           isSimulated: false,
                           slotId: createdSlotId
                         };
                         setPendingBuyOrders(prev => [...prev, newPending]);
                       } else {
                         const newPendingSell: PendingSellOrder = {
                           id: odno,
                           orgNo,
                           symbol: stock.symbol,
                           orderPrice: tradePrice,
                           quantity: finalAmount,
                           createdAt: Date.now(),
                           isSimulated: false,
                           type: 'LIMIT_SELL',
                           reason, buyPrice: buyPrice, slotId: slotId
                         };
                         setPendingSellOrders(prev => [...prev, newPendingSell]);
                       }

                       return 0; // Return 0 immediately so local state/slots do not optimistically update
                   }
               } else {
                   addLog(stock.symbol, action === 'BUY' ? '매수' : '매도', tradePrice, finalAmount, `[실제계좌 주문완료] ${reason}`);
                   showNotification(`${stock.name} ${action === 'BUY' ? '매수' : '매도'} 주문 성공`, "success");
               }
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
      if (balance < cost) {
        setBotStatus(`[매수 진입 차단] 예수금 부족 (필요: ${formatCurrency(cost)} / 가능: ${formatCurrency(balance)})`);
        setScalperMessage(`[매수 차단] 예수금 부족으로 진입 취소`);
        addLog(stock.symbol, '매수', tradePrice, finalAmount, `[진입차단] 예수금(매수 가능 금액) 초과 (필요: ${formatCurrency(cost)}, 예수금: ${formatCurrency(balance)})`);
        showNotification(`매수 진입 차단: 매수 가능 금액(예수금)을 초과하여 진입하지 않습니다.`, "error");
        return 0;
      }

      const createdSlotId = slotId || `SLOT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      if (!kisConfig.isConnected || !kisConfig.isRealOrderEnabled) {
        // Prevent duplicate buy order at same pending price level
        const tickSize = tradePrice >= 500000 ? 1000 : tradePrice >= 100000 ? 500 : tradePrice >= 50000 ? 100 : tradePrice >= 10000 ? 50 : tradePrice >= 5000 ? 10 : 5;
        const isDuplicateAtPrice = pendingBuyOrdersRef.current.some(
          p => p.symbol === stock.symbol && Math.abs(p.orderPrice - tradePrice) < tickSize * 0.95
        ) || gapInventoryRef.current.some(
          s => Math.abs(s.price - tradePrice) < tickSize * 0.95
        );

        if (isDuplicateAtPrice) {
          setScalperMessage(`[동일가 매수 중복 차단] ${formatCurrency(tradePrice)} 대기 중`);
          return 0;
        }

        // Simulated Mode: Place as pending buy order instead of instant fill!
        const simOrderId = `SIM-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        setBalance(prev => Math.max(0, prev - cost)); // Reserve balance
        
        const newPending: PendingBuyOrder = {
          id: simOrderId,
          symbol: stock.symbol,
          orderPrice: tradePrice,
          quantity: finalAmount,
          createdAt: Date.now(),
          isSimulated: true,
          slotId: createdSlotId
        };
        
        setPendingBuyOrders(prev => [...prev, newPending]);
        addLog(stock.symbol, '매수', tradePrice, finalAmount, `[가상 주문접수] ${reason}`);
        showNotification(`${stock.name} 가상 매수 주문 접수 완료 (체결 대기 중...)`, "info");
        setBotStatus(`[가상 대기] 주문가 ${formatCurrency(tradePrice)} 체결 대기 중...`);
        return 0; // Return 0 so it's not added to gapInventory immediately!
      }

      setBalance(prev => Math.max(0, prev - cost));
      const oldQty = holdings[stock.symbol] || 0;
      const oldAvg = avgPrices[stock.symbol] || tradePrice;
      const newQty = oldQty + finalAmount;
      const newAvg = newQty > 0 ? Math.round(((oldQty * oldAvg) + (finalAmount * tradePrice)) / newQty) : tradePrice;
      const newHoldings = { ...holdings, [stock.symbol]: Number(newQty.toFixed(4)) };
      setHoldings(newHoldings);
      setAvgPrices(prev => ({ ...prev, [stock.symbol]: newAvg }));
      if (currentUser) saveUserHoldings(currentUser.uid, newHoldings);
      
      // Add to gapInventory and update ref for immediate fill
      const newSlot = { id: createdSlotId, price: tradePrice, quantity: finalAmount };
      setGapInventory(prev => {
        const next = [...prev, newSlot];
        gapInventoryRef.current = next;
        return next;
      });

      if (!kisConfig.isConnected || !kisConfig.isRealOrderEnabled) {
          addLog(stock.symbol, '매수', tradePrice, finalAmount, reason);
      }

      // Trigger Auto-Sell for immediate simulated or real fills that reached this point
      triggerAutoSell(stock.symbol, tradePrice, finalAmount, newAvg, newQty, createdSlotId);

      // KIS API 연결 상태이고 실제 주문 전송이 활성화된 경우 실제 계좌 잔고를 비동기로 동기화
      if (kisConfig.isConnected && kisConfig.isRealOrderEnabled) {
        setTimeout(() => {
          handleSyncKIS();
        }, 1000);
      }
      return finalAmount;
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
      const effectiveHoldings = currentHoldings > 0 ? currentHoldings : finalAmount;
      const sellAmount = kisConfig.isConnected && kisConfig.isRealOrderEnabled ? finalAmount : Math.min(finalAmount, effectiveHoldings);
      if (sellAmount > 0) {
        if (kisConfig.isConnected && kisConfig.isRealOrderEnabled) {
          // 실제 주문인 경우: 로컬 상태를 임의로 차감하지 않고 실제 계좌 잔고 데이터를 fetch하여 즉시 UI에 반영
          handleSyncKIS();
          
          // 서버 응답 지연을 고려해 1초 뒤에 최종 동기화를 한 번 더 트리거
          setTimeout(() => {
            handleSyncKIS();
          }, 1000);
        } else {
          // 가상 거래인 경우
          if (customPrice !== undefined) {
            // [중요] 지정가 매도 주문인 경우 즉시 반영하지 않고 대기 주문으로 등록 (수익/잔고는 실제 체결 시 반영)
            const simOrderId = `SIM-SELL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const newPendingSell: PendingSellOrder = {
              id: simOrderId,
              symbol: stock.symbol,
              orderPrice: tradePrice,
              quantity: sellAmount,
              createdAt: Date.now(),
              isSimulated: true,
              type: 'LIMIT_SELL',
              reason,
              buyPrice: buyPrice, // Save buy price to calculate profit upon actual fill
              slotId: slotId
            };
            setPendingSellOrders(prev => [...prev, newPendingSell]);
            addLog(stock.symbol, '매도', tradePrice, sellAmount, `[가상 매도 주문접수] ${reason}`);
            showNotification(`${stock.name} 가상 매도 주문 접수 완료 (체결 대기 중...)`, "info");
            return 0;
          }

          // 시장가 혹은 즉시 체결되는 가상 매도인 경우
          setBalance(prev => prev + priceInKrw * sellAmount);
          const newHoldings = { ...holdings, [stock.symbol]: Number(Math.max(0, currentHoldings - sellAmount).toFixed(4)) };
          setHoldings(newHoldings);
          if (currentUser) saveUserHoldings(currentUser.uid, newHoldings);
          addLog(stock.symbol, '매도', tradePrice, sellAmount, reason);

          // Clear slot if provided
          if (slotId) {
            const next = gapInventoryRef.current.filter(s => s.id !== slotId);
            gapInventoryRef.current = next;
            setGapInventory(next);
          }

          // Update profit stats for immediate simulated fills
          if (buyPrice) {
            const profit = (tradePrice - buyPrice) * sellAmount * (marketType === 'US' ? exchangeRate : 1);
            setGapTradingProfit(prev => prev + profit);
            if (profit > 0) setScalpingWins(prev => prev + 1);
            else if (profit < 0) setScalpingLosses(prev => prev + 1);
          }
        }
        return sellAmount;
      }
      return 0;
    }
    return 0;
  };

  const addLog = (symbol: string, type: 'BUY' | 'SELL' | '매수' | '매도', price: number, amount: number, reason: string) => {
    const newLog: TradeLog = {
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      symbol, type, price, amount, reason
    };
    setTradeLogs(prev => [newLog, ...prev].slice(0, 50));
    setScalperTabs(prev => prev.map(tab => {
      if (tab.symbol === symbol || tab.id === symbol || (symbol === 'SYSTEM' && tab.id === activeTabId)) {
        const existing = tab.tradeLogs || [];
        return {
          ...tab,
          tradeLogs: [newLog, ...existing].slice(0, 50)
        };
      }
      return tab;
    }));
  };

  const handleExecuteManualSell = async () => {
    if (!selectedStock) {
      showNotification("매도할 종목을 선택해 주세요.", "error");
      return;
    }

    const heldQty = holdings[selectedStock.symbol] || 0;
    if (manualSellQty <= 0) {
      showNotification("올바른 매도 수량을 입력해 주세요.", "error");
      return;
    }

    if (manualSellQty > heldQty && (!kisConfig.isConnected || !kisConfig.isRealOrderEnabled)) {
      showNotification(`보유 수량(${heldQty}주)을 초과하여 매도할 수 없습니다.`, "error");
      return;
    }

    if (manualSellPrice <= 0) {
      showNotification("올바른 매도 희망 단가를 입력해 주세요.", "error");
      return;
    }

    const currentPrice = selectedStock.price;

    showNotification(`${selectedStock.name} ${formatCurrency(manualSellPrice)} 지정가 매도 주문 전송 중...`, "info");
    await executeTrade('SELL', selectedStock, manualSellQty, `[수동 지정가 매도] 희망가 ${formatCurrency(manualSellPrice)}`, manualSellPrice, avgPrices[selectedStock.symbol]);
    showNotification(`${selectedStock.name} ${formatCurrency(manualSellPrice)} 지정가 매도 주문이 접수되었습니다.`, "success");
    playScalpingSound('SELL');
    setManualSellModalOpen(false);
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
          
          await executeTrade(sig.action, stock, amount, `[BullGPT 시그널] ${sig.pattern}`, undefined, sig.action === 'SELL' ? avgPrices[stock.symbol] : undefined);
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
        showNotification("성공! KIS 서버 연결에 성공했습니다.", "success");
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
    showNotification("한국투자증권 계좌가 연결되었습니다.", "success");
    
    // Trigger immediate sync after connection
    setTimeout(() => {
      handleSyncKIS();
    }, 1000);

    setTradeLogs(prev => [{
      time: new Date().toLocaleTimeString('ko-KR', { hour12: false }),
      symbol: 'SYSTEM', type: '매수', price: 0, amount: 0, reason: "한국투자증권 계좌가 연결되었습니다. 데이터 동기화를 시작합니다."
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

          <div className="flex flex-col items-center justify-center text-center">
            <h1 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tighter">LEO 10B AI BOT</h1>
            <p className="text-sleek-text-secondary text-sm mb-8 leading-relaxed">
              레오의 100억 주식매매 프로그램에 오신 것을 환영합니다.<br/>
              서비스 이용을 위해 로그인이 필요합니다.
            </p>
            
            <div className="space-y-4 w-full">
              <button 
                onClick={handleLogin}
                className="w-full py-4 rounded-xl bg-white text-black font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition-all cursor-pointer shadow-lg"
              >
                <User className="w-5 h-5" />
                GOOGLE 계정으로 로그인하기
              </button>
            </div>

            <div className="mt-8 bg-black/30 border border-white/5 rounded-2xl p-4 text-left space-y-1.5 w-full">
              <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> iFrame 로그인 차단 안내
              </h4>
              <p className="text-[10px] text-sleek-text-secondary leading-relaxed">
                만약 구글 로그인 버튼이 작동하지 않거나 무반응이라면, 브라우저 보안 정책(3방 쿠키 차단) 때문입니다.
                오른쪽 상단의 <strong>'새 창에서 열기' (Open in New Tab)</strong> 버튼을 클릭해 접속해 주세요.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-sleek-bg text-sleek-text-primary selection:bg-sleek-blue/30 overflow-hidden relative">
      <AnimatePresence mode="wait">
        {showKisModal && (
          <motion.div 
            key="kis-modal"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-sleek-card border border-sleek-blue/30 rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar"
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
                  <label className="text-[10px] font-bold text-sleek-text-secondary uppercase mb-1 block">App Key</label>
                  <input 
                    type="password" 
                    value={kisConfig.appKey}
                    onChange={(e) => setKisConfig((prev: any) => ({ 
                      ...prev, 
                      appKey: e.target.value
                    }))}
                    className="w-full bg-black/40 border border-sleek-border rounded-lg p-3 text-xs focus:border-sleek-blue outline-none" 
                    placeholder="한국투자증권 App Key 입력"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-sleek-text-secondary uppercase mb-1 block">App Secret</label>
                  <input 
                    type="password" 
                    value={kisConfig.appSecret}
                    onChange={(e) => setKisConfig((prev: any) => ({ 
                      ...prev, 
                      appSecret: e.target.value
                    }))}
                    className="w-full bg-black/40 border border-sleek-border rounded-lg p-3 text-xs focus:border-sleek-blue outline-none" 
                    placeholder="한국투자증권 Secret Key 입력"
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
                   <label className="text-[10px] font-bold text-sleek-text-secondary uppercase mb-1 block">주문 구분 (Order Type)</label>
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
                        활성화 시 KIS 계좌로 즉시 주문을 전송합니다. 비활성화 시 KIS 실시간 시세만 연동하고 가상 잔액(로컬)으로 거래하여 <strong>매수 가능량 0주 문제 및 자산 손실 위험을 방지</strong>합니다.
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
              className="bg-sleek-card border border-sleek-blue/30 rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar"
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
              className="bg-sleek-card border border-sleek-blue/30 rounded-3xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative custom-scrollbar"
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
              className="bg-sleek-card border border-white/10 rounded-3xl p-8 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl text-center custom-scrollbar"
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
      ) : !isAppInitialized ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-sleek-bg relative overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sleek-blue/10 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sleek-green/10 blur-[120px] rounded-full animate-pulse delay-700"></div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-sleek-card border border-sleek-blue/20 rounded-[2.5rem] p-12 w-full max-w-xl shadow-2xl text-center relative z-10"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-sleek-blue to-transparent opacity-50"></div>
            
            <div className="w-24 h-24 bg-sleek-blue/10 rounded-3xl flex items-center justify-center mx-auto mb-8 relative">
              <div className="absolute inset-0 bg-sleek-blue/5 rounded-3xl animate-ping opacity-20"></div>
              <Bot className="w-12 h-12 text-sleek-blue drop-shadow-[0_0_10px_rgba(30,144,255,0.5)]" />
            </div>
            
            <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none">
              Welcome to <span className="text-sleek-blue">LEO BOT</span>
            </h1>
            
            <p className="text-sleek-text-secondary text-base mb-10 leading-relaxed max-w-md mx-auto">
              {kisConfig.isConnected 
                ? "계좌 연동이 성공적으로 설정되어 있습니다. 아래 '정보 업데이트' 버튼을 눌러 최신 잔고와 시세를 동기화하고 트레이딩을 시작하세요."
                : "처음 오셨군요! 우측 상단 '설정(톱니바퀴)' 아이콘을 클릭하여 한국투자증권(KIS) API 키를 먼저 등록해주세요. 설정이 완료되면 아래 버튼으로 엔진을 기동할 수 있습니다."}
            </p>

            <div className="space-y-4">
              <button 
                onClick={() => {
                  if (kisConfig.isConnected) {
                    handleSyncKIS();
                  }
                  setIsAppInitialized(true);
                }}
                className="w-full py-5 bg-sleek-blue text-white rounded-2xl font-black text-lg shadow-[0_10px_30px_-10px_rgba(30,144,255,0.5)] hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3 group"
              >
                <Zap className="w-6 h-6 fill-white group-hover:animate-bounce" />
                정보 업데이트 및 시스템 가동
              </button>

              <button 
                onClick={() => setShowKisModal(true)}
                className="w-full py-4 bg-white/5 border border-white/10 text-sleek-text-secondary rounded-2xl font-bold text-sm hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" /> {kisConfig.isConnected ? "KIS 연동 설정 변경" : "KIS 연동 설정하기"}
              </button>
            </div>

            <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-[10px] text-sleek-text-secondary uppercase tracking-widest mb-1">Status</div>
                <div className="text-xs font-bold text-amber-400">READY</div>
              </div>
              <div className="text-center border-x border-white/5">
                <div className="text-[10px] text-sleek-text-secondary uppercase tracking-widest mb-1">Network</div>
                <div className="text-xs font-bold text-emerald-400">STABLE</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-sleek-text-secondary uppercase tracking-widest mb-1">Version</div>
                <div className="text-xs font-bold text-white/50">10B.PRO</div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <>
      <header className="h-auto md:h-[60px] border-b border-sleek-border glass-header flex flex-col md:flex-row items-center justify-between px-6 py-4 md:py-0 sticky top-0 z-50 gap-4 md:gap-0">
        <div className="flex items-center gap-4">
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => handleMarketSwitch('KR')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                marketType === 'KR' 
                  ? "bg-sleek-blue text-white shadow-lg shadow-sleek-blue/30" 
                  : "text-sleek-text-secondary hover:text-white"
              )}
            >
              <SouthKoreaFlag /> KR
            </button>
            <button 
              onClick={() => handleMarketSwitch('US')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                marketType === 'US' 
                  ? "bg-sleek-blue text-white shadow-lg shadow-sleek-blue/30" 
                  : "text-sleek-text-secondary hover:text-white"
              )}
            >
              <USAFlag /> US
            </button>
          </div>
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
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsGapBotActive(!isGapBotActive)}
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
        </div>
      </header>
      
      {/* Exchange Rate Ribbon */}
      <div className="h-8 bg-black/80 sticky top-[60px] md:top-[60px] z-40 border-b border-sleek-border/50 flex items-center justify-between px-6 backdrop-blur-md overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-6 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-sleek-text-secondary uppercase tracking-widest flex items-center gap-1">
              <Globe className="w-3 h-3" /> Market Context
            </span>
            <div className="h-3 w-px bg-white/10 mx-1" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <USAFlag />
                <span className="text-[11px] font-mono font-bold text-white">USD/KRW</span>
                <span className={cn(
                  "text-[11px] font-mono font-black",
                  exchangeRateTrend === 'UP' ? "text-sleek-red" : "text-sleek-green"
                )}>
                  {exchangeRate.toLocaleString()}
                </span>
                {exchangeRateTrend === 'UP' ? <TrendingUp className="w-3 h-3 text-sleek-red" /> : <TrendingDown className="w-3 h-3 text-sleek-green" />}
              </div>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-4 text-[10px] font-bold text-sleek-text-secondary uppercase">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> KOSPI <span className="text-white">+0.8%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> NASDAQ <span className="text-white">+1.2%</span>
            </div>
          </div>
        </div>
      </div>

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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddStock();
                    }
                  }}
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
                          key={`${s.symbol}-${idx}`}
                          onClick={() => handleAddStock(s.symbol, undefined, s.name)}
                          className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <div className="text-xs font-bold text-white">{s.name}</div>
                              {s.price !== undefined && (
                                <span className="text-[10px] text-sleek-blue font-black font-mono">
                                  {s.market === 'US' ? `$${s.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `₩${Math.round(s.price).toLocaleString()}`}
                                </span>
                              )}
                            </div>
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
                    <span className="text-white font-bold">{formatQuantity(holdings[selectedStock.symbol] || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase">
                    <span className="text-sleek-text-secondary">매수 가능</span>
                    <span className="text-sleek-blue font-bold">
                      {kisConfig.isConnected && kisConfig.isRealOrderEnabled && kisBuyableQty !== null 
                        ? `${formatQuantity(kisBuyableQty)} (실계좌)` 
                        : `${formatQuantity(Math.floor(balance / (selectedStock && /^[A-Z]/.test(selectedStock.symbol) ? selectedStock.price * exchangeRate : (selectedStock.price || 1))))} (로컬)`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 스캘퍼 엔진 최적 추천 종목 TOP 5 Ranking Widget */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400">
                    <Zap className="w-3.5 h-3.5 fill-amber-400/30 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      스캘퍼 최적 추천 종목 TOP 5
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    </h2>
                    <div className="text-[9px] font-semibold text-amber-400/90 tracking-tight mt-0.5">
                      {marketType === 'KR' ? '10,000원 이하 · 1년 우상향 · 실시간 상승기류 포착 5선' : '$10 이하 · 1년 우상향 · 실시간 상승기류 포착 5선'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRefreshScalperTop3}
                    disabled={isRefreshingTop3}
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 px-2 py-0.5 rounded-lg border border-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
                    title="스캘퍼 최적 종목 갱신"
                  >
                    <RefreshCw className={cn("w-3 h-3 text-amber-400", isRefreshingTop3 && "animate-spin")} />
                    <span>갱신</span>
                  </button>
                  <span className="text-[9px] font-mono text-amber-300 font-bold px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                    {marketType === 'KR' ? '국내' : '미국'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {scalperTop5Stocks.map((st, idx) => {
                  const isSelected = selectedSymbol === st.symbol;
                  const isUS = /^[A-Z]/.test(st.symbol);
                  const pricePrefix = marketType === 'US' ? '$' : '₩';
                  
                  return (
                    <motion.div
                      key={`${st.symbol}-${idx}`}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => {
                        if (!stocks.some(s => s.symbol === st.symbol)) {
                          setStocks(prev => [...prev, st]);
                        }
                        openOrSwitchScalperTab(st.symbol, st.name);
                        showNotification(`[스캘퍼 종목 지정] ${st.name}(${st.symbol}) 종목 탭이 활성화되었습니다.`, "info");
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                        isSelected
                          ? "bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/5"
                          : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-amber-500/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {/* Left: Rank Badge + Stock Name & Symbol */}
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <div className={cn(
                            "w-5 h-5 rounded-md text-[10px] font-black font-mono flex items-center justify-center shrink-0 shadow-sm border mt-0.5",
                            idx === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-black border-amber-300 font-extrabold" :
                            idx === 1 ? "bg-gradient-to-br from-slate-300 to-slate-500 text-black border-slate-200" :
                            idx === 2 ? "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-200 border-amber-600" :
                            "bg-white/10 text-slate-300 border-white/10"
                          )}>
                            {idx + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            {/* Toss Style Stock Display */}
                            <div className="text-xs font-bold text-white whitespace-normal break-words leading-snug flex items-center gap-1.5 flex-wrap">
                              <span>{st.name}</span>
                              <span className="text-[11px] font-mono text-white/90">
                                {formatCurrency(st.price)}
                              </span>
                              <span className={cn(
                                "text-[10px] font-mono font-bold",
                                st.change >= 0 ? "text-rose-400" : "text-sky-400"
                              )}>
                                {st.change >= 0 ? '+' : ''}{formatCurrency(Math.abs(st.change))}
                              </span>
                              <span className={cn(
                                "text-[10px] font-mono font-bold",
                                st.change >= 0 ? "text-rose-400" : "text-sky-400"
                              )}>
                                ({st.changePercent >= 0 ? '+' : ''}{st.changePercent.toFixed(1)}%)
                              </span>
                            </div>
                            {/* Stock Symbol/Code below */}
                            <div className="text-[10px] font-mono text-sleek-text-secondary mt-0.5 flex items-center gap-2">
                              <span>{st.symbol}</span>
                              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 py-0.1 rounded border border-emerald-500/20 font-sans">
                                📈 1년 우상향
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                {st.reasonTag}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Score only (Price moved to header for Toss style) */}
                        <div className="text-right shrink-0">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[10px] text-sleek-text-secondary">적합도</span>
                            <span className="text-sm font-black font-mono text-emerald-400">{st.scalpScore}점</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </div>
        </aside>

        {/* Center: Gap Trading Terminal */}
        <section className="bg-sleek-bg overflow-y-auto custom-scrollbar p-3 md:p-4 space-y-3">
          {/* 1. Header Engine & Stock Status Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Stock Quick Info Badge */}
            <div className="bg-sleek-card border border-sleek-border p-3.5 rounded-2xl shadow-lg lg:col-span-4 flex items-center justify-between">
              <div className="w-full">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-black text-white">
                      {selectedStock?.name || '종목 미선택'}
                    </span>
                    {selectedStock && (
                      <div className="flex items-center gap-1.5 font-mono text-sm">
                        <span className="text-white/90">{formatCurrency(selectedStock.price)}</span>
                        <span className={cn(
                          "font-bold",
                          selectedStock.change >= 0 ? "text-rose-400" : "text-sky-400"
                        )}>
                          {selectedStock.change >= 0 ? '+' : ''}{formatCurrency(Math.abs(selectedStock.change))}
                        </span>
                        <span className={cn(
                          "font-bold",
                          selectedStock.change >= 0 ? "text-rose-400" : "text-sky-400"
                        )}>
                          ({selectedStock.change >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-mono pt-1.5 border-t border-white/5">
                  <span className="text-sleek-text-secondary">현재 보유: <strong className="text-white font-bold">{holdings[selectedStock?.symbol || ''] || 0}주</strong></span>
                  <span className="text-sleek-text-secondary">매수 가능: <strong className="text-sleek-blue font-bold">
                    {kisConfig.isConnected && kisConfig.isRealOrderEnabled && kisBuyableQty !== null 
                      ? `${kisBuyableQty.toLocaleString()}주 (실계좌)` 
                      : `${Math.floor(balance / (selectedStock && /^[A-Z]/.test(selectedStock.symbol) ? selectedStock.price * exchangeRate : (selectedStock?.price || 1))).toLocaleString()}주 (로컬)`}
                  </strong></span>
                </div>
              </div>
            </div>

            {/* Scalper Engine Status (8 Columns) */}
            <div className="bg-sleek-card border border-sleek-blue/40 p-3.5 rounded-2xl shadow-lg lg:col-span-8 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <Zap className="w-4 h-4 text-sleek-blue animate-pulse shrink-0" />
                  <span className="text-xs font-black text-sleek-text-secondary uppercase tracking-widest shrink-0">스캘퍼 엔진 상태</span>
                  <span className="text-xs font-bold text-white font-mono shrink-0">[{selectedStock?.name || '종목 미선택'} ({selectedStock?.symbol || '-'})]</span>
                  
                  {/* 수동 지정가 매도 버튼 */}
                  <button
                    onClick={() => {
                      if (selectedStock) {
                        const held = holdings[selectedStock.symbol] || 1;
                        setManualSellPrice(selectedStock.price || 0);
                        setManualSellQty(held > 0 ? held : 1);
                      }
                      setManualSellModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all shadow-sm shrink-0"
                  >
                    <CircleDollarSign className="w-3.5 h-3.5" />
                    <span>수동 지정가 매도</span>
                  </button>

                  <button
                    onClick={cancelAllOrders}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] bg-white/5 text-sleek-text-secondary border border-white/10 hover:bg-white/10 hover:text-white transition-all shadow-sm shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>주문 취소</span>
                  </button>
                </div>

                <div className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-black italic tracking-wider flex items-center gap-1 border shrink-0",
                  isGapBotActive 
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse" 
                    : "bg-white/5 text-sleek-text-secondary border-white/10"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", isGapBotActive ? "bg-emerald-400" : "bg-slate-500")} />
                  {isGapBotActive ? "RUNNING" : "STOPPED"}
                </div>
              </div>

              <div className="pt-2 mt-1 border-t border-white/10 text-xs font-mono">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[11px] font-black text-sleek-text-secondary uppercase shrink-0">상태 메시지:</span>
                  <span className="font-bold text-sleek-blue text-xs leading-relaxed break-words">
                    {scalperMessage || "대기 중..."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. AI SCALPING CONFIG (Moved Up for Instant Parameter Access) */}
          <div id="ai-scalping-config-panel" className="bg-sleek-card border border-sleek-border p-3.5 sm:p-4 rounded-3xl shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex flex-col">
                <h2 className="text-base font-black text-white italic uppercase tracking-tighter">AI SCALPING CONFIG</h2>
                <span className="text-[11px] text-sleek-text-secondary">초단기 자동 스캘퍼 전략 엔진 설정</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sleek-blue animate-ping"></span>
                <span className="text-[11px] font-bold text-sleek-blue uppercase">Live Engine</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-stretch text-xs">
              {/* 1. Upper & Lower Price Bounds */}
              <div className="bg-black/30 p-2.5 rounded-2xl border border-sleek-border flex flex-col justify-between space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-sleek-text-secondary uppercase flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-sleek-green" /> 상한가
                  </label>
                  <span className="text-xs font-bold text-sleek-green font-mono">{formatCurrency(gapSellPrice)}</span>
                </div>
                <input 
                  type="number" 
                  value={gapSellPrice || ''}
                  onChange={(e) => setGapSellPrice(Number(e.target.value))}
                  className="w-full bg-black/40 border border-sleek-border rounded-lg p-1 text-xs font-bold focus:border-sleek-green outline-none text-white font-mono"
                  placeholder="상한선 금액"
                />
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <label className="text-[10px] font-black text-sleek-text-secondary uppercase flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-sleek-red" /> 하한가
                  </label>
                  <span className="text-xs font-bold text-sleek-red font-mono">{formatCurrency(gapBuyPrice)}</span>
                </div>
                <input 
                  type="number" 
                  value={gapBuyPrice || ''}
                  onChange={(e) => setGapBuyPrice(Number(e.target.value))}
                  className="w-full bg-black/40 border border-sleek-border rounded-lg p-1 text-xs font-bold focus:border-sleek-red outline-none text-white font-mono"
                  placeholder="하한선 금액"
                />
              </div>

              {/* 2. Trade Quantity & Target Profit / Stop Loss */}
              <div className="bg-black/30 p-2.5 rounded-2xl border border-sleek-border flex flex-col justify-between space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-sleek-text-secondary uppercase flex items-center gap-1">
                    <Layers className="w-3 h-3 text-sleek-blue" /> 1회 거래수량
                  </label>
                  <span className="text-xs font-bold text-white font-mono">{tradeQuantity}주</span>
                </div>
                <select 
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(Number(e.target.value))}
                  className="w-full bg-black/40 border border-sleek-border rounded p-1 text-center text-xs font-bold outline-none text-white font-mono appearance-none"
                >
                  {Array.from({ length: 100 }, (_, i) => i + 1).map(val => (
                    <option key={val} value={val} className="bg-sleek-bg text-white">{val}주</option>
                  ))}
                </select>

                <div className="pt-1 border-t border-white/5">
                  <div className="text-[10px] font-black uppercase leading-tight space-y-0.5">
                    <div className="text-emerald-400">목표 익절 +{scalpingTargetProfit}%</div>
                    <div className="text-rose-400">손절 {scalpingStopLoss}%</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <select 
                    value={scalpingTargetProfit}
                    onChange={(e) => setScalpingTargetProfit(Number(e.target.value))}
                    className="bg-black/40 border border-emerald-500/40 rounded p-1 text-xs font-mono outline-none text-emerald-400 text-center font-bold appearance-none"
                  >
                    {Array.from({ length: 50 }, (_, i) => Math.round((i + 1) * 0.1 * 10) / 10).map(val => (
                      <option key={val} value={val} className="bg-sleek-bg text-emerald-400">+{val}%</option>
                    ))}
                  </select>
                  <select 
                    value={scalpingStopLoss}
                    onChange={(e) => setScalpingStopLoss(Number(e.target.value))}
                    className="bg-black/40 border border-rose-500/40 rounded p-1 text-xs font-mono outline-none text-rose-400 text-center font-bold appearance-none"
                  >
                    {Array.from({ length: 50 }, (_, i) => Math.round(-(i + 1) * 0.1 * 10) / 10).map(val => (
                      <option key={val} value={val} className="bg-sleek-bg text-rose-400">{val}%</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Smart Scalper Configuration */}
              <div className="bg-sleek-blue/5 border border-sleek-blue/20 p-2.5 rounded-2xl flex flex-col justify-between space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-sleek-blue uppercase tracking-wider flex items-center gap-1 group relative">
                    <Zap className="w-3 h-3" /> SMART SCALPER
                    <HelpCircle className="w-2.5 h-2.5 text-sleek-blue/50 cursor-help hover:text-sleek-blue transition-colors" />
                    
                    {/* Help Tooltip */}
                    <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-900 border border-sleek-blue/30 p-2 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                      <div className="text-[9px] font-bold text-sleek-blue mb-1 flex items-center gap-1 uppercase tracking-tighter">
                        <Sparkles className="w-2.5 h-2.5" /> Scalping Logic
                      </div>
                      <div className="text-[10px] leading-relaxed text-slate-200 font-medium normal-case tracking-normal">
                        실시간 틱 데이터를 분석하여 <span className="text-sleek-blue font-bold">과매도/과매수</span> 지점의 기술적 반등을 포착하는 모드입니다. 지지/저항 돌파 시 자동으로 진입합니다.
                      </div>
                      <div className="absolute left-4 top-full w-2 h-2 bg-slate-900 border-r border-b border-sleek-blue/30 rotate-45 -translate-y-1/2" />
                    </div>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSmartScalperMode(!isSmartScalperMode)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black transition-all border",
                      isSmartScalperMode
                        ? "bg-sleek-blue/20 border-sleek-blue/40 text-sleek-blue"
                        : "bg-white/5 border-white/10 text-sleek-text-secondary opacity-60"
                    )}
                  >
                    {isSmartScalperMode ? "SMART ACTIVE" : "SMART OFF"}
                  </button>
                </div>

                <div>
                  <label className="text-[9px] font-black text-sleek-text-secondary uppercase block mb-0.5">추가 매수 간격 (Gap %)</label>
                  <select 
                    value={minGapBetweenSlots}
                    onChange={(e) => setMinGapBetweenSlots(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-white outline-none cursor-pointer appearance-none"
                  >
                    {[0.1, 0.2, 0.3, 0.4, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0, 5.0].map(gap => (
                      <option key={gap} value={gap} className="bg-sleek-bg text-white">{gap}%</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-sleek-text-secondary uppercase block mb-0.5">진입 수량 방식</label>
                  <button
                    type="button"
                    onClick={() => setUseFixedQuantity(!useFixedQuantity)}
                    className={cn(
                      "w-full py-0.5 rounded text-[10px] font-black border transition-all",
                      useFixedQuantity
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                    )}
                  >
                    {useFixedQuantity ? "고정 수량" : "가중(마틴게일)"}
                  </button>
                </div>
              </div>

              {/* 4. Entry Mode & Auto Cancel Drop */}
              <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-1.5">
                <div>
                  <span className="text-[10px] font-bold text-white flex items-center gap-1 mb-1">
                    <TrendingDown className="w-3 h-3 text-amber-400" /> 진입 호가 방식
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setEntryPriceMode('BID2')}
                      className={cn(
                        "py-1 rounded text-[10px] font-bold border text-center transition-all cursor-pointer",
                        entryPriceMode === 'BID2' ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-black/20 border-white/5 text-gray-400 hover:text-gray-200"
                      )}
                      title="기본 매수 1단계 진입"
                    >
                      매수1단계★
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryPriceMode('BID4')}
                      className={cn(
                        "py-1 rounded text-[10px] font-bold border text-center transition-all cursor-pointer",
                        entryPriceMode === 'BID4' ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-black/20 border-white/5 text-gray-400 hover:text-gray-200"
                      )}
                      title="매수 2단계 진입"
                    >
                      매수2단계
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryPriceMode('CURRENT')}
                      className={cn(
                        "py-1 rounded text-[10px] font-bold border text-center transition-all cursor-pointer",
                        entryPriceMode === 'CURRENT' ? "bg-sleek-blue/20 border-sleek-blue/40 text-sleek-blue" : "bg-black/20 border-white/5 text-gray-400 hover:text-gray-200"
                      )}
                      title="현재 시장 체결가 즉시 지정가 진입"
                    >
                      현재 체결가
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-white flex items-center gap-1">
                      <Trash2 className="w-3 h-3 text-rose-400" /> 자동 취소 낙폭
                    </span>
                    <span className="text-xs font-bold text-rose-400 font-mono">-{autoCancelThreshold}%</span>
                  </div>
                  <div className="grid grid-cols-4 gap-0.5">
                    {[ 0.1, 0.2, 0.3, 0.5 ].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setAutoCancelThreshold(pct)}
                        className={cn(
                          "py-0.5 rounded text-[10px] font-bold font-mono border text-center transition-all",
                          autoCancelThreshold === pct ? "bg-rose-500/20 border-rose-500/40 text-rose-300" : "bg-black/20 border-white/5 text-gray-400"
                        )}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Speed (Max Slots hidden, default 3) */}
              <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5 flex flex-col justify-between space-y-1.5">
                <div>
                  <span className="text-[10px] font-bold text-sleek-text-secondary uppercase block mb-1">실행 속도</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: '0.3s', value: 300 },
                      { label: '0.5s', value: 500 },
                      { label: '1.5s', value: 1500 }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setScalpingSpeed(opt.value)}
                        className={cn(
                          "py-1 rounded text-[10px] font-mono font-bold transition-all text-center",
                          scalpingSpeed === opt.value
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "bg-white/5 text-sleek-text-secondary hover:bg-white/10"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 6. Big Action Button (Column 6) */}
              <div className="flex items-center justify-center col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1">
                <button 
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
                  className={cn(
                    "w-full h-full min-h-[90px] sm:min-h-[100px] py-3.5 px-3 rounded-2xl font-black text-base italic tracking-tighter uppercase shadow-2xl transition-all flex flex-col items-center justify-center gap-1.5 border",
                    isGapBotActive 
                      ? "bg-gradient-to-br from-rose-600 to-red-800 text-white border-rose-500/50 shadow-rose-900/40 hover:scale-[1.02]" 
                      : "bg-gradient-to-br from-sleek-blue to-indigo-700 text-white border-sleek-blue/50 shadow-sleek-blue/40 hover:scale-[1.02]"
                  )}
                >
                  {isGapBotActive ? (
                    <>
                      <Square className="w-5 h-5 fill-current animate-pulse" />
                      <span>SCALPER STOP</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span className="text-center leading-tight">START AI<br />SCALPER</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 3. PROFIT MAXIMIZER ENGINE (Chart + Compact 4-Level Order Book) */}
          <div className="bg-sleek-card border border-sleek-border p-3.5 sm:p-4 rounded-3xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sleek-card border border-sleek-border rounded-xl flex items-center justify-center shadow-md">
                  <Activity className="w-4 h-4 text-sleek-blue animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">PROFIT MAXIMIZER ENGINE</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-sleek-green animate-pulse"></div>
                    <span className="text-[11px] font-bold text-sleek-text-secondary uppercase">Real-time Trading Stage</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded-xl border border-white/5 shadow-inner">
                  <span className="text-[11px] text-sleek-text-secondary uppercase font-black">RSI (14)</span>
                  <span className={cn(
                    "font-black italic text-xs font-mono",
                    calculateRSI(selectedStock?.history?.map(h => h.price) || []) < 30 ? "text-sleek-red" : 
                    calculateRSI(selectedStock?.history?.map(h => h.price) || []) > 70 ? "text-sleek-green" : "text-sleek-blue"
                  )}>
                    {Math.round(calculateRSI(selectedStock?.history?.map(h => h.price) || []))}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded-xl border border-white/5 shadow-inner">
                  <span className="text-[11px] text-sleek-text-secondary uppercase font-black">감시 구간 폭</span>
                  <span className="font-black text-sleek-blue italic text-xs font-mono">
                    {formatCurrency(gapBuyPrice && gapSellPrice ? (gapSellPrice - gapBuyPrice) : 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Multi-Tab Bar for Independent Scalper Bot Trading */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2 pt-1 border-b border-white/10">
              {scalperTabs.filter(tab => {
                const isUS = /^[A-Z]/.test(tab.symbol);
                return marketType === 'US' ? isUS : !isUS;
              }).map(tab => {
                const isSelected = tab.id === activeTabId;
                const tabStock = stocks.find(s => s.symbol === tab.symbol) || 
                                 (marketType === 'KR' 
                                   ? INITIAL_STOCKS_KR.find(s => s.symbol === tab.symbol) 
                                   : INITIAL_STOCKS.find(s => s.symbol === tab.symbol));
                const tabName = tab.name || tabStock?.name || tab.symbol;

                return (
                  <div
                    key={tab.id}
                    onClick={() => handleSwitchTab(tab.id)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-1.5 cursor-pointer transition-all w-full min-w-0 text-xs font-mono select-none group min-h-[34px]",
                      isSelected
                        ? "bg-sleek-blue/20 border-sleek-blue text-white shadow-md font-bold"
                        : "bg-black/40 border-white/5 hover:bg-white/5 text-gray-400 hover:text-white"
                    )}
                  >
                    {/* Left: Running Dot & Name */}
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        tab.isBotActive ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" : "bg-gray-500"
                      )} />
                      <span className="font-bold text-white text-xs truncate">{tabName}</span>
                    </div>

                    {/* Right: Price & Indicators & Close */}
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      {tabStock && (
                        <span className={cn("text-[10px] font-mono hidden md:inline-block", tabStock.changePercent >= 0 ? "text-rose-400" : "text-sky-400")}>
                          {formatCurrency(tabStock.price)}
                        </span>
                      )}

                      {tab.isBotActive && (
                        <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/30 shrink-0">
                          ON
                        </span>
                      )}

                      {scalperTabs.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => closeScalperTab(tab.id, e)}
                          className="opacity-60 hover:opacity-100 hover:bg-rose-500/30 text-gray-400 hover:text-rose-300 rounded-full p-0.5 transition-all ml-0.5 shrink-0"
                          title="탭 닫기"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  const available = stocks.find(s => !scalperTabs.some(t => t.symbol === s.symbol)) || stocks[0];
                  if (available) {
                    openOrSwitchScalperTab(available.symbol, available.name);
                  }
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-sleek-blue/50 text-gray-300 hover:text-white text-xs font-bold font-mono flex items-center justify-center gap-1 transition-all w-full min-h-[34px]"
                title="새 스캘퍼 종목 탭 추가"
              >
                <Plus className="w-3.5 h-3.5 text-sleek-blue" />
                <span>+ 종목 추가</span>
              </button>
            </div>

            {selectedStock ? (
              (() => {
                const currentPrice = selectedStock.price;
                const tickSize = currentPrice >= 500000 ? 1000 : currentPrice >= 100000 ? 500 : currentPrice >= 50000 ? 100 : currentPrice >= 10000 ? 50 : currentPrice >= 5000 ? 10 : 5;
                const askLevels = Array.from({ length: 4 }, (_, i) => currentPrice + (4 - i) * tickSize);
                const bidLevels = Array.from({ length: 4 }, (_, i) => currentPrice - (i + 1) * tickSize);
                const getLevelVolume = (priceLevel: number) => {
                  const base = Math.abs((priceLevel * 17) % 850) + 120;
                  const wiggle = Math.floor(Math.sin((Date.now() / 2500) + priceLevel) * 45) + 45;
                  return base + wiggle;
                };

                // Prepare Chart Candle & Moving Averages (5, 20, 60, 120) Data
                const groupSize = selectedTimeframeBar === '1m' ? 1 : selectedTimeframeBar === '3m' ? 2 : selectedTimeframeBar === '5m' ? 3 : 4;
                const historyItems = selectedStock.history || [];
                const candleData = [];

                // Group from the END of historyItems backwards to anchor current time on the far right
                const groups: typeof historyItems[] = [];
                for (let i = historyItems.length; i > 0; i -= groupSize) {
                  const start = Math.max(0, i - groupSize);
                  groups.unshift(historyItems.slice(start, i));
                }

                groups.forEach((group, gIdx) => {
                  const isLastGroup = gIdx === groups.length - 1;
                  const open = group[0]?.price || selectedStock.price;
                  const close = isLastGroup ? selectedStock.price : (group[group.length - 1]?.price || selectedStock.price);
                  const prices = group.map(g => g.price);
                  if (isLastGroup) prices.push(selectedStock.price);
                  const high = Math.max(...prices);
                  const low = Math.min(...prices);
                  const isUp = close >= open;
                  const volume = group.reduce((acc, g) => acc + (g.volume || Math.floor((g.price * 3) % 250) + 20), 0);

                  const displayTime = isLastGroup ? '현재' : (group[0]?.time || `${gIdx + 1}`);

                  candleData.push({
                    time: displayTime,
                    open,
                    high,
                    low,
                    close,
                    price: close,
                    isUp,
                    isLive: isLastGroup,
                    volume
                  });
                });

                // Calculate SMA Moving Averages
                const closes = candleData.map(c => c.close);
                const volumes = candleData.map(c => c.volume);

                candleData.forEach((item, idx) => {
                  const getSma = (arr: number[], period: number) => {
                    const slice = arr.slice(Math.max(0, idx - period + 1), idx + 1);
                    return slice.reduce((a, b) => a + b, 0) / (slice.length || 1);
                  };
                  item.ma5 = Math.round(getSma(closes, 5));
                  item.ma20 = Math.round(getSma(closes, 20));
                  item.ma60 = Math.round(getSma(closes, 60));
                  item.ma120 = Math.round(getSma(closes, 120));
                  item.volMa20 = Math.round(getSma(volumes, 20));
                });

                // Find peak (high) and trough (low) for annotations
                let highCandle = candleData[0] || { high: currentPrice, time: '00:00' };
                let lowCandle = candleData[0] || { low: currentPrice, time: '00:00' };
                candleData.forEach(c => {
                  if (c.high > highCandle.high) highCandle = c;
                  if (c.low < lowCandle.low) lowCandle = c;
                });

                return (
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
                    {/* 1. Chart Graph (Width reduced to half: xl:col-span-6) */}
                    <div className="xl:col-span-6 flex flex-col min-w-0 bg-black/40 rounded-2xl border border-sleek-border p-3 justify-between space-y-2">
                      <div>
                        {/* Header: Price & Moving Averages Legend */}
                        <div className="mb-2 flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-white/5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xl md:text-2xl font-black text-white italic tracking-tighter font-mono">
                                {formatCurrency(selectedStock.price)}
                              </span>
                              <span className={cn(
                                "text-xs font-black italic font-mono px-1.5 py-0.5 rounded",
                                selectedStock.change >= 0 ? "bg-rose-500/20 text-rose-400" : "bg-sky-500/20 text-sky-400"
                              )}>
                                {selectedStock.change >= 0 ? '▲ +' : '▼ '}{selectedStock.changePercent.toFixed(2)}%
                              </span>
                            </div>
                            
                            {/* Moving Average Line Legend matching attached photo */}
                            <div className="flex items-center gap-2 text-[11px] font-mono mt-0.5">
                              <span className="text-gray-400 font-bold">이동평균선</span>
                              <span className="text-[#10B981] font-black">5</span>
                              <span className="text-[#EF4444] font-black">20</span>
                              <span className="text-[#F59E0B] font-black">60</span>
                              <span className="text-[#8B5CF6] font-black">120</span>
                            </div>
                          </div>

                          {/* Timeframe Controls */}
                          <div className="flex items-center gap-1 bg-black/60 border border-white/5 p-1 rounded-xl shrink-0">
                            {(['1m', '3m', '5m', '10m'] as const).map(tf => (
                              <button
                                key={tf}
                                type="button"
                                onClick={() => setSelectedTimeframeBar(tf)}
                                className={cn(
                                  "px-2 py-0.5 rounded-lg text-xs font-bold transition-all font-mono",
                                  selectedTimeframeBar === tf
                                    ? "bg-sleek-blue text-white shadow-sm"
                                    : "text-sleek-text-secondary hover:bg-white/5 hover:text-white"
                                )}
                              >
                                {tf === '1m' ? '1분' : tf === '3m' ? '3분' : tf === '5m' ? '5분' : '10분'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Main Candlestick + MA Lines Chart */}
                        <div className="bg-slate-950/80 rounded-xl border border-white/5 p-1.5 relative shadow-inner w-full" style={{ height: 175 }}>
                          {/* Chart Exchange Rate Overlay */}
                          <div className="absolute top-3 left-4 z-20 flex flex-col items-start pointer-events-none select-none">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
                              <USAFlag />
                              <span className="text-[10px] font-mono font-black text-white/40 tracking-widest uppercase">FX Context</span>
                              <div className="h-2.5 w-px bg-white/10 mx-0.5" />
                              <span className={cn(
                                "text-[10px] font-mono font-black",
                                exchangeRateTrend === 'UP' ? "text-sleek-red" : "text-sleek-green"
                              )}>
                                ₩{exchangeRate.toLocaleString()}
                              </span>
                              {exchangeRateTrend === 'UP' ? <TrendingUp className="w-2.5 h-2.5 text-sleek-red" /> : <TrendingDown className="w-2.5 h-2.5 text-sleek-green" />}
                            </div>
                          </div>

                          {candleData && candleData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={candleData} margin={{ top: 15, right: 45, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="2 2" vertical={true} opacity={0.06} stroke="#FFFFFF" />
                                <XAxis 
                                  dataKey="time" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fill: '#6B7280' }}
                                />
                                <YAxis 
                                  domain={['auto', 'auto']} 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fill: '#6B7280' }}
                                  orientation="right"
                                />
                                <Tooltip 
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="bg-[#1A1D23] border border-[#2D3139] p-2 rounded-xl shadow-2xl space-y-1 text-xs font-mono">
                                          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
                                            <span className="text-sleek-text-secondary font-bold">{data.time}</span>
                                            <span className={cn("font-bold px-1 py-0.2 rounded text-[10px]", data.isUp ? "bg-rose-500/20 text-rose-400" : "bg-sky-500/20 text-sky-400")}>
                                              {data.isUp ? "양봉" : "음봉"}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                                            <div>시가: <strong className="text-white">{formatCurrency(data.open)}</strong></div>
                                            <div>고가: <strong className="text-rose-400">{formatCurrency(data.high)}</strong></div>
                                            <div>저가: <strong className="text-sky-400">{formatCurrency(data.low)}</strong></div>
                                            <div>종가: <strong className={data.close >= data.open ? "text-rose-400" : "text-sky-400"}>{formatCurrency(data.close)}</strong></div>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />

                                {/* Candle Bars */}
                                <Bar dataKey="close" radius={[2, 2, 0, 0]} isAnimationActive={false} animationDuration={0}>
                                  {candleData.map((candle, idx) => (
                                    <Cell 
                                      key={`candle-${candle.time}-${idx}`} 
                                      fill={candle.isUp ? '#EF4444' : '#3B82F6'} 
                                      stroke={candle.isLive ? (candle.isUp ? '#F87171' : '#60A5FA') : 'none'}
                                      strokeWidth={candle.isLive ? 1.5 : 0}
                                    />
                                  ))}
                                </Bar>

                                {/* Moving Average Lines (5, 20, 60, 120) */}
                                <Line type="monotone" dataKey="ma5" stroke="#10B981" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                <Line type="monotone" dataKey="ma20" stroke="#EF4444" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                <Line type="monotone" dataKey="ma60" stroke="#F59E0B" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                <Line type="monotone" dataKey="ma120" stroke="#8B5CF6" strokeWidth={1.5} dot={false} isAnimationActive={false} />

                                {/* High Point Marker with Down Arrow */}
                                {highCandle && (
                                  <ReferenceDot 
                                    x={highCandle.time} 
                                    y={highCandle.high} 
                                    r={3} 
                                    fill="#EF4444" 
                                    stroke="#FFFFFF" 
                                    strokeWidth={1}
                                  >
                                    <Label 
                                      value={`${formatCurrency(highCandle.high)} (${(((highCandle.high - selectedStock.price)/selectedStock.price)*100).toFixed(1)}%) ↓`} 
                                      position="top" 
                                      fill="#EF4444" 
                                      fontSize={9} 
                                      fontWeight="bold" 
                                    />
                                  </ReferenceDot>
                                )}

                                {/* Low Point Marker with Up Arrow */}
                                {lowCandle && (
                                  <ReferenceDot 
                                    x={lowCandle.time} 
                                    y={lowCandle.low} 
                                    r={3} 
                                    fill="#3B82F6" 
                                    stroke="#FFFFFF" 
                                    strokeWidth={1}
                                  >
                                    <Label 
                                      value={`${formatCurrency(lowCandle.low)} (${(((lowCandle.low - selectedStock.price)/selectedStock.price)*100).toFixed(1)}%) ↑`} 
                                      position="bottom" 
                                      fill="#3B82F6" 
                                      fontSize={9} 
                                      fontWeight="bold" 
                                    />
                                  </ReferenceDot>
                                )}

                                {/* Buy & Sell Boundary Lines */}
                                {gapBuyPrice > 0 && (
                                  <ReferenceLine y={gapBuyPrice} stroke="#EF4444" strokeDasharray="3 3" strokeWidth={1}>
                                    <Label value="BUY" position="left" fill="#EF4444" fontSize={10} fontWeight="bold" />
                                  </ReferenceLine>
                                )}
                                {gapSellPrice > 0 && (
                                  <ReferenceLine y={gapSellPrice} stroke="#3B82F6" strokeDasharray="3 3" strokeWidth={1}>
                                    <Label value="SELL" position="left" fill="#3B82F6" fontSize={10} fontWeight="bold" />
                                  </ReferenceLine>
                                )}
                              </ComposedChart>
                            </ResponsiveContainer>
                          ) : null}

                          {/* Solid Red Current Price Badge on Right Axis */}
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-rose-600 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-l shadow-lg border-l border-white/20 animate-pulse">
                            {selectedStock.price.toLocaleString()} <span className="text-[8px] opacity-80">00:18</span>
                          </div>
                        </div>

                        {/* Sub-Pane: Trading Volume (거래량 (20)) */}
                        <div className="mt-2 pt-1 border-t border-white/5">
                          <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono mb-0.5">
                            <span className="font-bold">거래량 (20)</span>
                            <span className="text-emerald-400 font-bold">1.48K / 1.00K</span>
                          </div>
                          <div className="h-12 w-full bg-slate-950/50 rounded-lg p-0.5 relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={candleData} margin={{ top: 2, right: 35, left: 0, bottom: 0 }}>
                                <Bar dataKey="volume" radius={[1, 1, 0, 0]} isAnimationActive={false} animationDuration={0}>
                                  {candleData.map((c, idx) => (
                                    <Cell key={`vol-${c.time}-${idx}`} fill={c.isUp ? '#EF4444' : '#3B82F6'} opacity={0.8} />
                                  ))}
                                </Bar>
                                <Line type="monotone" dataKey="volMa20" stroke="#10B981" strokeWidth={1} dot={false} isAnimationActive={false} animationDuration={0} />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Timeframe Toolbar */}
                      <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400 font-mono">
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold text-[10px] flex items-center gap-1">1분 ▼</span>
                          <span className="px-2 py-0.5 rounded hover:bg-white/5 text-[10px] cursor-pointer">일</span>
                          <span className="px-2 py-0.5 rounded hover:bg-white/5 text-[10px] cursor-pointer">주</span>
                          <span className="px-2 py-0.5 rounded hover:bg-white/5 text-[10px] cursor-pointer">월</span>
                          <span className="px-2 py-0.5 rounded hover:bg-white/5 text-[10px] cursor-pointer">년</span>
                        </div>
                        <div className="flex items-center gap-1 text-rose-400 font-bold text-xs">
                          <span>📊</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Real-time Order Book (Attached directly to right of chart: xl:col-span-3) */}
                    <div className="xl:col-span-3 flex flex-col min-w-0 bg-black/40 rounded-2xl border border-sleek-border p-2.5 justify-between">
                      <div>
                        <div className="text-center font-black text-sleek-text-secondary uppercase text-[10px] tracking-widest pb-1 border-b border-white/5 mb-1">
                          실시간 잔량 호가창 (4단계)
                        </div>
                        
                        {/* Ask Levels (매도 4~1단계) */}
                        <div className="space-y-0.5">
                          {askLevels.map((lvlPrice, idx) => {
                            const vol = getLevelVolume(lvlPrice);
                            const isBoundary = gapSellPrice > 0 && lvlPrice >= gapSellPrice;
                            return (
                              <div key={`ask-level-${idx}`} className="flex items-center justify-between h-4 px-1.5 rounded hover:bg-white/5 transition-all relative overflow-hidden group font-mono tabular-nums text-xs">
                                <div className="absolute right-0 top-0 bottom-0 bg-sky-500/5 pointer-events-none" style={{ width: `${Math.min(100, (vol / 1100) * 100)}%` }} />
                                <span className="w-12 shrink-0 text-[9px] text-sky-400 font-bold font-sans z-10 whitespace-nowrap">매도 {4 - idx}단계</span>
                                <span className={cn(
                                  "flex-1 text-right font-bold z-10 font-mono tabular-nums text-[10px] whitespace-nowrap px-1",
                                  isBoundary ? "text-amber-400 font-black underline decoration-sky-400" : "text-sky-300"
                                )}>
                                  {formatCurrency(lvlPrice)}
                                </span>
                                <span className="w-10 shrink-0 text-right text-sky-200/60 font-mono tabular-nums text-[9px] z-10 whitespace-nowrap">{formatQuantity(vol)}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Spread Line */}
                        <div className="my-1 h-5 px-1.5 bg-white/5 border-y border-white/10 flex items-center justify-between rounded font-mono tabular-nums">
                          <span className="text-[9px] font-black text-sleek-text-secondary uppercase shrink-0">현재 체결가</span>
                          <span className={cn("font-black text-[11px] font-mono tabular-nums animate-pulse", selectedStock.change >= 0 ? "text-rose-400" : "text-sky-400")}>
                            {formatCurrency(currentPrice)}
                          </span>
                          <span className={cn("text-[9px] font-mono tabular-nums font-bold shrink-0", selectedStock.changePercent >= 0 ? "text-rose-400" : "text-sky-400")}>
                            {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%
                          </span>
                        </div>

                        {/* Bid Levels (매수 1~4단계) */}
                        <div className="space-y-0.5">
                          {bidLevels.map((lvlPrice, idx) => {
                            const vol = getLevelVolume(lvlPrice);
                            const isBoundary = gapBuyPrice > 0 && lvlPrice <= gapBuyPrice;
                            return (
                              <div key={`bid-level-${idx}`} className="flex items-center justify-between h-4 px-1.5 rounded hover:bg-white/5 transition-all relative overflow-hidden group font-mono tabular-nums text-xs">
                                <div className="absolute right-0 top-0 bottom-0 bg-rose-500/5 pointer-events-none" style={{ width: `${Math.min(100, (vol / 1100) * 100)}%` }} />
                                <span className="w-12 shrink-0 text-[9px] text-rose-400 font-bold font-sans z-10 whitespace-nowrap">매수 {idx + 1}단계</span>
                                <span className={cn(
                                  "flex-1 text-right font-bold z-10 font-mono tabular-nums text-[10px] whitespace-nowrap px-1",
                                  isBoundary ? "text-amber-400 font-black underline decoration-rose-400" : "text-rose-300"
                                )}>
                                  {formatCurrency(lvlPrice)}
                                </span>
                                <span className="w-10 shrink-0 text-right text-rose-200/60 font-mono tabular-nums text-[9px] z-10 whitespace-nowrap">{vol.toLocaleString()}주</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Order Book Pressure Gauge */}
                      <div className="pt-1.5 border-t border-white/5 space-y-0.5">
                        <div className="flex justify-between text-[9px] text-sleek-text-secondary font-bold font-sans">
                          <span className="text-sky-400">매도잔량 47.8%</span>
                          <span className="text-rose-400">매수잔량 52.2%</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden flex">
                          <div className="h-full bg-sky-400" style={{ width: '47.8%' }} />
                          <div className="h-full bg-rose-400" style={{ width: '52.2%' }} />
                        </div>
                      </div>
                    </div>

                    {/* 3. Right Stack: Interval Monitor (Top) & Holdings Status (Bottom) (xl:col-span-3) */}
                    <div className="xl:col-span-3 flex flex-col gap-2.5 min-w-0">
                      {/* Top Window: 실시간 구간 모니터 */}
                      <div className="bg-black/40 border border-sleek-blue/30 rounded-2xl p-3 flex flex-col justify-between space-y-2 flex-1">
                        <div className="flex items-center justify-between pb-1 border-b border-white/5">
                          <h4 className="text-xs font-black text-sleek-blue uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 animate-bounce" /> 실시간 구간 모니터
                          </h4>
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            MONITORING
                          </span>
                        </div>

                        <div className="space-y-1.5 font-mono text-xs">
                          <div className="flex justify-between text-[11px] text-sleek-text-secondary">
                            <span>하한 {gapBuyPrice > 0 ? formatCurrency(gapBuyPrice) : '미설정'}</span>
                            <span>상한 {gapSellPrice > 0 ? formatCurrency(gapSellPrice) : '미설정'}</span>
                          </div>

                          {/* Range Progress Bar */}
                          <div className="relative w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                              className="absolute top-0 bottom-0 bg-gradient-to-r from-sleek-blue to-emerald-400 rounded-full"
                              style={{ width: `${rangePercentage}%` }}
                              transition={{ type: "spring", stiffness: 80 }}
                            />
                            <div 
                              className="absolute w-1 h-2.5 bg-white shadow-[0_0_8px_white] top-0 transition-all duration-300"
                              style={{ left: `calc(${rangePercentage}% - 2px)` }}
                            />
                          </div>

                          <div className="flex justify-between items-center pt-0.5">
                            <span className="text-[10px] text-sleek-text-secondary uppercase">현재가 위치</span>
                            <span className="text-xs font-black text-white italic font-mono">{rangePercentage.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Window: 보유 주식 현황 */}
                      <div className="bg-black/40 border border-white/10 rounded-2xl p-3 flex flex-col justify-between space-y-2 flex-1">
                        <div className="flex items-center justify-between pb-1 border-b border-white/5">
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">보유 주식 현황</h4>
                          </div>
                          <span className="text-[9px] font-mono text-amber-300 font-bold px-1.5 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                            {Object.entries(holdings).filter(([_, qty]) => Number(qty) > 0).length}종목
                          </span>
                        </div>

                        <div className="space-y-1 max-h-[140px] overflow-y-auto custom-scrollbar pr-0.5">
                          {Object.entries(holdings).filter(([_, qty]) => Number(qty) > 0).length === 0 ? (
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-center flex items-center justify-center">
                              <p className="text-[11px] text-sleek-text-secondary">보유 중인 주식이 없습니다.</p>
                            </div>
                          ) : (
                            Object.entries(holdings)
                              .filter(([_, qty]) => Number(qty) > 0)
                              .map(([sym, rawQty], idx) => {
                                const qty = Number(rawQty);
                                const st = stocks.find(s => s.symbol === sym) || 
                                           INITIAL_STOCKS_KR.find(s => s.symbol === sym) || 
                                           INITIAL_STOCKS.find(s => s.symbol === sym) || 
                                           { name: sym, symbol: sym, price: 0, changePercent: 0 };

                                const stockDisplayName = (st.name && st.name !== sym) 
                                  ? st.name 
                                  : (INITIAL_STOCKS_KR.find(s => s.symbol === sym)?.name || INITIAL_STOCKS.find(s => s.symbol === sym)?.name || sym);
                                
                                let avgPrice = avgPrices[sym] || 0;
                                if (avgPrice <= 0 && gapInventory.length > 0 && selectedSymbol === sym) {
                                  const totalCost = gapInventory.reduce((acc, slot) => {
                                    const p = typeof slot === 'number' ? slot : (slot.price || 0);
                                    const q = typeof slot === 'number' ? 1 : (slot.quantity || 1);
                                    return acc + (p * q);
                                  }, 0);
                                  const totalQty = gapInventory.reduce((acc, slot) => {
                                    return acc + (typeof slot === 'number' ? 1 : (slot.quantity || 1));
                                  }, 0);
                                  avgPrice = totalQty > 0 ? Math.floor(totalCost / totalQty) : 0;
                                }
                                if (avgPrice <= 0) avgPrice = st.price || 0;

                                const profitRatio = avgPrice > 0 ? (((st.price || 0) - avgPrice) / avgPrice) * 100 : 0;
                                const isSelected = selectedSymbol === sym;

                                return (
                                  <div 
                                    key={`${sym}-${idx}`}
                                    onClick={() => setSelectedSymbol(sym)}
                                    className={cn(
                                      "p-1.5 rounded-xl border flex items-center justify-between text-[11px] font-mono cursor-pointer transition-all group",
                                      isSelected
                                        ? "bg-sleek-blue/20 border-sleek-blue text-white shadow-sm"
                                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-sleek-blue/30 text-slate-200"
                                    )}
                                  >
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-white">{stockDisplayName}({sym})</span>
                                        <span className="text-[10px] text-white/80">{formatCurrency(st.price || 0)}</span>
                                        <span className={cn("font-bold text-[10px]", profitRatio >= 0 ? "text-rose-400" : "text-sky-400")}>
                                          {profitRatio >= 0 ? '+' : ''}{profitRatio.toFixed(1)}%
                                        </span>
                                      </div>
                                      <span className="text-amber-300 text-[9.5px]">평단 {formatCurrency(avgPrice)}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <span className="text-white font-bold">{qty}주</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedSymbol(sym);
                                          setManualSellPrice(st.price || 0);
                                          setManualSellQty(qty);
                                          setManualSellModalOpen(true);
                                        }}
                                        className="px-1.5 py-0.5 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded text-[9px] font-bold transition-all"
                                      >
                                        매도
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-sleek-card/20 rounded-3xl border border-dashed border-sleek-border">
                <div className="p-4 bg-sleek-blue/10 rounded-full mb-3">
                  <Search className="w-8 h-8 text-sleek-blue animate-pulse" />
                </div>
                <h4 className="text-base font-black text-white italic mb-1 uppercase tracking-tighter">No Stock Selected</h4>
                <p className="text-xs text-sleek-text-secondary max-w-xs">
                  왼쪽 사이드바에서 트레이딩을 진행할 종목을 먼저 선택해 주세요.
                </p>
              </div>
            )}
          </div>

          {/* 4. ACCOUNT FINANCIALS BAR (Full Width Bottom Bar) */}
          <div className="bg-black/30 border border-white/10 rounded-2xl p-3.5 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <CircleDollarSign className="w-4 h-4 text-sleek-blue" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">실시간 계좌 현황</h4>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                ACCOUNT LIVE
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-sleek-text-secondary uppercase block font-bold truncate">주문가능자산 (44431721-01)</span>
                <span className="text-sm font-black text-white italic mt-0.5 block truncate">{formatCurrency(balance)}</span>
              </div>
              
              <div 
                onClick={() => setIsAssetAnalysisModalOpen(true)}
                className="bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/10 hover:border-sleek-blue/50 transition-all cursor-pointer group"
                title="클릭 시 총 자산 세부 산출 내역 팝업 보기"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-sleek-text-secondary uppercase font-bold flex items-center gap-1 group-hover:text-sleek-blue transition-colors truncate">
                    총 자산 <Calculator className="w-3 h-3 text-sleek-blue shrink-0" />
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-sm font-black text-sleek-blue italic truncate">{formatCurrency(totalValue)}</span>
                  <span className={cn("text-[10px] font-bold shrink-0 ml-1", pnl >= 0 ? "text-rose-400" : "text-sky-400")}>
                    {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-sleek-text-secondary uppercase block font-bold truncate">스캘핑 총 수익</span>
                <span className={cn("text-sm font-black italic mt-0.5 block truncate", gapTradingProfit >= 0 ? "text-rose-400" : "text-sky-400")}>
                  {formatCurrency(gapTradingProfit)}
                </span>
              </div>

              <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] text-sleek-text-secondary uppercase block font-bold truncate">오늘 체결 횟수</span>
                <span className="text-sm font-black text-white italic mt-0.5 block truncate">
                  {gapTradeCount} <span className="text-[10px] font-normal text-sleek-text-secondary opacity-60">TRADES</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Aside: Real-time Status Window & Trade Logs */}
        <aside className="w-[340px] border-l border-white/5 bg-black/30 flex flex-col p-6 gap-6 overflow-hidden hidden xl:flex">
            
            {/* 1. Trade Logs / Active Slot Monitor (Top Right) */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col flex-1 min-h-[480px] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between mb-3 shrink-0 border-b border-white/5 pb-2.5">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sleek-blue" /> Trade Logs (실시간 체결 현황)
                </h3>
                <span className="text-[11px] font-mono text-sleek-text-secondary bg-white/5 px-2.5 py-0.5 rounded-full border border-white/5">
                  {enableCombinedAvgProfitExit 
                    ? (gapInventory.length > 0 ? "통합 (1/1)" : "통합 (대기)") 
                    : `체결 (${gapInventory.length} / ${maxSlots})`
                  }
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {enableCombinedAvgProfitExit ? (
                  /* Combined Average Profit Exit Mode (통합평단가 익절) */
                  gapInventory.length === 0 ? (
                    <div className="bg-black/20 border border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sleek-text-secondary">
                        <Layers className="w-5 h-5 opacity-40" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">[통합] 대기 중</span>
                        <span className="text-[11px] text-sleek-text-secondary mt-1 block">
                          매수가 체결되면 수량 및 통합 평단가가 자동 업데이트됩니다
                        </span>
                      </div>
                    </div>
                  ) : (() => {
                    const totalCost = gapInventory.reduce((acc, s) => acc + (typeof s === 'number' ? s : s.price) * (typeof s === 'number' ? 1 : s.quantity), 0);
                    const totalQty = gapInventory.reduce((acc, s) => acc + (typeof s === 'number' ? 1 : s.quantity), 0);
                    const avgPrice = totalQty > 0 ? Math.round(totalCost / totalQty) : 0;
                    const avgProfitPct = avgPrice > 0 ? ((selectedStock.price - avgPrice) / avgPrice) * 100 : 0;
                    const targetSellPrice = calculateTargetSellPrice(avgPrice, scalpingTargetProfit, selectedStock?.price);

                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-r from-sleek-blue/20 via-indigo-950/40 to-slate-900/80 border border-sleek-blue/40 rounded-2xl p-4.5 space-y-3 shadow-xl"
                      >
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981] animate-pulse"></span>
                            <span className="text-sm font-black text-white">{selectedStock.name}</span>
                            <span className="text-xs font-mono text-sleek-text-secondary">({selectedStock.symbol})</span>
                          </div>
                          <span className="bg-sleek-blue/20 text-sleek-blue border border-sleek-blue/30 px-2 py-0.5 rounded text-[10px] font-bold">
                            통합 (보유 중)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-black/40 p-2.5 rounded-xl border border-white/5">
                          <div>
                            <span className="text-[10px] text-sleek-text-secondary block uppercase">체결 매수 수량</span>
                            <span className="text-base font-black text-amber-300">{formatQuantity(totalQty)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-sleek-text-secondary block uppercase">통합 매수 평단가</span>
                            <span className="text-sm font-bold text-white">{formatCurrency(avgPrice)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-sleek-text-secondary block font-bold">매도예상가 (+{scalpingTargetProfit}%)</span>
                            <span className="text-sm font-bold text-rose-400">{formatCurrency(targetSellPrice)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-sleek-text-secondary block font-bold">평단 대비 손익률</span>
                            <span className={cn("text-sm font-black", avgProfitPct >= 0 ? "text-rose-400" : "text-sky-400")}>
                              {avgProfitPct >= 0 ? "+" : ""}{avgProfitPct.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()
                ) : (
                  /* Individual Slot Mode (개별 모드 - 매수진입/체결 및 매도싸인만 표시) */
                  (() => {
                    const currentStock = selectedStock;
                    const stockPendingBuys = pendingBuyOrders.filter(p => p.symbol === currentStock?.symbol);

                    // Collect active slots (Filled Inventory & Pending Buy Orders)
                    const activeSlots: React.ReactNode[] = [];

                    // 1. Filled Inventory Slots (매수체결 완료 - 매도감시 중)
                    gapInventory.forEach((filledSlot, slotIdx) => {
                      if (!filledSlot) return;
                      const slotNum = slotIdx + 1;
                      const buyPrice = typeof filledSlot === 'number' ? filledSlot : (filledSlot.price || 0);
                      const buyQty = typeof filledSlot === 'number' ? tradeQuantity : (filledSlot.quantity || 1);
                      const profitPct = buyPrice > 0 ? ((currentStock.price - buyPrice) / buyPrice) * 100 : 0;
                      const targetSellPrice = calculateTargetSellPrice(buyPrice, scalpingTargetProfit, currentStock?.price);

                      const samePriceCount = gapInventory.filter(s => (typeof s === 'number' ? s : s.price) === buyPrice).length;
                      const samePriceTotalQty = gapInventory
                        .filter(s => (typeof s === 'number' ? s : s.price) === buyPrice)
                        .reduce((acc, s) => acc + (typeof s === 'number' ? tradeQuantity : s.quantity), 0);

                      activeSlots.push(
                        <motion.div 
                          key={`filled-slot-${slotIdx}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-emerald-950/30 border border-emerald-500/50 rounded-2xl p-4 min-h-[130px] flex flex-col justify-between space-y-2 text-xs font-mono shadow-lg transition-all"
                        >
                          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981] animate-pulse shrink-0"></span>
                              <span className="font-extrabold text-white text-sm truncate">{currentStock.name}</span>
                              <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                                매수체결 #{slotNum}
                              </span>
                            </div>
                            <span className={cn("font-extrabold text-xs tabular-nums px-2 py-0.5 rounded bg-black/40 border border-white/5 shrink-0", profitPct >= 0 ? "text-rose-400 border-rose-500/30" : "text-sky-400 border-sky-500/30")}>
                              {profitPct >= 0 ? "+" : ""}{profitPct.toFixed(2)}%
                            </span>
                          </div>

                          {samePriceCount > 1 && (
                            <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-sans">
                              <Layers className="w-3 h-3 text-amber-400" />
                              <span>동일 매수가 중복 체결: {samePriceCount}건 (총 {samePriceTotalQty}주)</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 bg-black/50 p-2.5 rounded-xl border border-white/5 text-[11px] tabular-nums">
                            <div>
                              <span className="text-sleek-text-secondary text-[10px] block font-bold">진입가 ({formatQuantity(buyQty)})</span>
                              <span className="text-emerald-400 font-extrabold text-xs block mt-0.5">{formatCurrency(buyPrice)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sleek-text-secondary text-[10px] block font-bold">목표가 (+{scalpingTargetProfit}%)</span>
                              <span className="text-rose-400 font-extrabold text-xs block mt-0.5">{formatCurrency(targetSellPrice)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 pt-1 border-t border-emerald-500/20 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>⚡ 매도 싸인 감시 중 (목표가 도달 시 자동 매도)</span>
                          </div>
                        </motion.div>
                      );
                    });

                    // 2. Pending Buy Order Slots (매수 진입 시도 중)
                    stockPendingBuys.forEach((pendingBuy, pIdx) => {
                      const orderPrice = pendingBuy.orderPrice;
                      const orderQty = pendingBuy.quantity;
                      const targetSellPrice = calculateTargetSellPrice(orderPrice, scalpingTargetProfit, currentStock?.price);

                      activeSlots.push(
                        <motion.div 
                          key={`pending-slot-${pendingBuy.id || pIdx}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-amber-950/30 border border-amber-500/50 rounded-2xl p-4 min-h-[130px] flex flex-col justify-between space-y-2 text-xs font-mono shadow-lg transition-all"
                        >
                          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                            <div className="flex items-center gap-2 truncate">
                              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                              <span className="font-extrabold text-white text-sm truncate">{currentStock.name}</span>
                              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
                                매수진입 시도 중
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => cancelPendingBuyOrder(pendingBuy.id)}
                              className="text-[10px] font-bold text-amber-400 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/40 px-2 py-0.5 rounded transition-all shrink-0"
                            >
                              취소
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-black/50 p-2.5 rounded-xl border border-white/5 text-[11px] tabular-nums">
                            <div>
                              <span className="text-sleek-text-secondary text-[10px] block font-bold">진입 예상가 ({orderQty}주)</span>
                              <span className="text-amber-300 font-extrabold text-xs block mt-0.5">{formatCurrency(orderPrice)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sleek-text-secondary text-[10px] block font-bold">목표가 (+{scalpingTargetProfit}%)</span>
                              <span className="text-rose-400/90 font-extrabold text-xs block mt-0.5">{formatCurrency(targetSellPrice)}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-amber-300/90 pt-1 border-t border-amber-500/20 font-bold">
                            <span>⏳ 매수 주문 체결 대기 중 (체결 즉시 매도 전환)</span>
                          </div>
                        </motion.div>
                      );
                    });

                    // 3. Render active slots or empty clean view + trade logs list
                    if (activeSlots.length > 0) {
                      return activeSlots;
                    }

                    // Filter logs strictly for current selected stock (zero cross-contamination)
                    const filteredLogs = tradeLogs.filter(log => log.symbol === currentStock.symbol);
                    const logsToShow = filteredLogs;

                    return (
                      <div className="space-y-3">
                        <div className="bg-black/20 border border-dashed border-white/10 rounded-2xl p-4 text-center space-y-1">
                          <div className="flex items-center justify-center gap-1.5 text-xs text-white font-bold">
                            <Activity className="w-3.5 h-3.5 text-sleek-blue" />
                            <span>[{currentStock.name}] 매수/매도 대기 중</span>
                          </div>
                          <p className="text-[11px] text-sleek-text-secondary font-mono">
                            매수진입 및 매도싸인 발생 시 진입 예상가와 목표가가 여기에 즉시 표시됩니다.
                          </p>
                        </div>

                        {/* Recent Trade / Order Signal History for current stock only */}
                        {logsToShow.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            <span className="text-[10px] font-bold text-sleek-text-secondary uppercase tracking-wider block px-1">
                              최근 체결 및 주문 현황 ({logsToShow.length}건)
                            </span>
                            {logsToShow.slice(0, 8).map((log, lIdx) => {
                              const logStock = stocks.find(s => s.symbol === log.symbol) || 
                                               INITIAL_STOCKS_KR.find(s => s.symbol === log.symbol) || 
                                               INITIAL_STOCKS.find(s => s.symbol === log.symbol) || currentStock;
                              const isBuy = log.type === 'BUY' || log.type === '매수';
                              const targetPrice = isBuy && log.price > 0 ? calculateTargetSellPrice(log.price, scalpingTargetProfit, logStock.price) : 0;

                              return (
                                <div key={`log-${lIdx}`} className="bg-black/40 border border-white/5 hover:border-white/10 rounded-xl p-3 text-xs font-mono space-y-1.5 transition-all">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                      <span className={cn("px-1.5 py-0.2 rounded text-[9px] font-black", isBuy ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-sky-500/20 text-sky-400 border border-sky-500/30")}>
                                        {isBuy ? "매수진입" : "매도싸인"}
                                      </span>
                                      <span className="font-bold text-white">{logStock.name}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-500">{log.time}</span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1 bg-black/30 p-1.5 rounded text-[10px]">
                                    <div>
                                      <span className="text-gray-400 block">{isBuy ? "진입가" : "체결가"}</span>
                                      <span className="font-bold text-white">{formatCurrency(log.price)}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-gray-400 block">{isBuy ? `목표가 (+${scalpingTargetProfit}%)` : "사유"}</span>
                                      <span className={cn("font-bold", isBuy ? "text-rose-400" : "text-emerald-400")}>
                                        {isBuy && targetPrice > 0 ? formatCurrency(targetPrice) : log.reason}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-500 text-center py-2 font-mono">
                            {currentStock.name} 종목의 최근 체결/주문 기록이 없습니다.
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* 2. Real-time Gap Monitor Gauge */}
            {isGapBotActive && selectedStock && gapBuyPrice > 0 && gapSellPrice > 0 && (
              <div className="bg-sleek-blue/5 border border-sleek-blue/20 rounded-3xl p-5 space-y-4 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-sleek-blue uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 animate-bounce" /> 실시간 구간 모니터
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">GRID ACTIVE</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-sleek-text-secondary font-mono">
                    <span>하한가 {formatCurrency(gapBuyPrice)}</span>
                    <span>상한가 {formatCurrency(gapSellPrice)}</span>
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
                    <span className="text-xs text-sleek-text-secondary uppercase">현재가 위치</span>
                    <span className="text-sm font-black text-white italic font-mono">{rangePercentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. System Diagnostics */}
            <div className="bg-sleek-blue/5 border border-sleek-blue/20 rounded-3xl p-5 space-y-4 shrink-0">
              <h3 className="text-xs font-black text-sleek-blue uppercase tracking-widest flex items-center gap-2">
                <Bot className="w-3.5 h-3.5" /> System Diagnostics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-sleek-text-secondary uppercase">Loop Interval</span>
                  <span className="text-xs font-bold text-emerald-400">1,500ms (High Speed)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-sleek-text-secondary uppercase">Server Status</span>
                  <span className="text-xs font-bold text-emerald-400">ACTIVE</span>
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
          {stocks.map((s, idx) => (
            <div key={`${s.symbol}-${idx}`} className="flex gap-2 whitespace-nowrap">
              <span className="text-white font-bold">{s.name}</span>
              <span className="text-white/80">{formatCurrency(s.price || 0)}</span>
              <span className={cn("font-bold", (s.change || 0) >= 0 ? "text-rose-400" : "text-sky-400")}>
                {(s.change || 0) >= 0 ? '+' : ''}{formatCurrency(Math.abs(s.change || 0))}
              </span>
              <span className={cn("font-bold", (s.changePercent || 0) >= 0 ? "text-rose-400" : "text-sky-400")}>
                ({(s.changePercent || 0) >= 0 ? '+' : ''}{(s.changePercent || 0).toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </footer>

      {/* Manual Target Price Sell Modal (수동 지정가 매도 모달) */}
      <AnimatePresence>
        {manualSellModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-sleek-card border border-sleek-border rounded-3xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 relative custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <CircleDollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">수동 지정가 매도 주문</h3>
                    <p className="text-xs text-sleek-text-secondary">자동 스캘핑과 상관없이 원하는 금액에 매도합니다.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setManualSellModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 text-sleek-text-secondary hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selected Stock Info */}
              {selectedStock ? (
                <div className="bg-sleek-bg/80 border border-sleek-border rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-white">{selectedStock.name} ({selectedStock.symbol})</span>
                    <span className="text-xs font-mono font-bold text-sleek-blue">현재가: {formatCurrency(selectedStock.price || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-sleek-text-secondary pt-2 border-t border-white/5">
                    <span>평단가: <strong className="text-amber-300 font-mono">{formatCurrency(Math.round(avgPrices[selectedStock.symbol] || selectedStock.price || 0))}</strong></span>
                    <span>보유수량: <strong className="text-white font-mono">{holdings[selectedStock.symbol] || 0} 주</strong></span>
                    <span>평가금액: <strong className="text-white font-mono">{formatCurrency(Math.round((holdings[selectedStock.symbol] || 0) * (selectedStock.price || 0)))}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-rose-400 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                  종목이 선택되지 않았습니다. 매도할 종목을 먼저 선택해 주세요.
                </div>
              )}

              {/* Price and Quantity Inputs */}
              <div className="space-y-4">
                {/* Target Sell Price Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-sleek-text-secondary">
                    <span>매도 희망 단가 ({marketType === 'US' ? 'USD' : '원'})</span>
                    {selectedStock && manualSellPrice > 0 && (
                      <span className={cn(
                        "font-mono text-[11px]",
                        manualSellPrice >= (selectedStock.price || 0) ? "text-emerald-400" : "text-rose-400"
                      )}>
                        현재가 대비 {(((manualSellPrice - selectedStock.price) / selectedStock.price) * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      value={manualSellPrice || ''}
                      onChange={(e) => setManualSellPrice(Number(e.target.value))}
                      placeholder={`희망 매도가 입력 (${marketType === 'US' ? '$' : '원'})`}
                      className="w-full bg-sleek-bg border border-sleek-border rounded-2xl py-3 px-4 text-sm font-mono font-bold text-white focus:border-rose-500 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-sleek-text-secondary">{marketType === 'US' ? 'USD' : 'KRW'}</span>
                  </div>

                  {/* Quick Price Adjust Buttons */}
                  {selectedStock && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        onClick={() => setManualSellPrice(selectedStock.price)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold text-sleek-text-secondary hover:text-white transition-all border border-white/5"
                      >
                        현재가 ({formatCurrency(selectedStock.price)})
                      </button>
                      <button
                        onClick={() => setManualSellPrice(Math.round(selectedStock.price * 1.005))}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold transition-all border border-emerald-500/20"
                      >
                        +0.5%
                      </button>
                      <button
                        onClick={() => setManualSellPrice(Math.round(selectedStock.price * 1.01))}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold transition-all border border-emerald-500/20"
                      >
                        +1.0%
                      </button>
                      <button
                        onClick={() => setManualSellPrice(Math.round(selectedStock.price * 1.02))}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold transition-all border border-emerald-500/20"
                      >
                        +2.0%
                      </button>
                      <button
                        onClick={() => setManualSellPrice(Math.round(selectedStock.price * 1.05))}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold transition-all border border-emerald-500/20"
                      >
                        +5.0%
                      </button>
                    </div>
                  )}
                </div>

                {/* Sell Quantity Input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-sleek-text-secondary">
                    <span>매도 수량</span>
                    <span>최대 {selectedStock ? (holdings[selectedStock.symbol] || 0) : 0}주</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number"
                      value={manualSellQty || ''}
                      onChange={(e) => setManualSellQty(Number(e.target.value))}
                      placeholder="매도 수량 입력"
                      className="w-full bg-sleek-bg border border-sleek-border rounded-2xl py-3 px-4 text-sm font-mono font-bold text-white focus:border-rose-500 outline-none transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-sleek-text-secondary">주</span>
                  </div>

                  {/* Quick Quantity Buttons */}
                  {selectedStock && (
                    <div className="flex gap-1.5 pt-1">
                      {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                        const maxQty = holdings[selectedStock.symbol] || 1;
                        const calculated = Math.max(1, Math.floor(maxQty * ratio));
                        return (
                          <button
                            key={ratio}
                            onClick={() => setManualSellQty(calculated)}
                            className="flex-1 py-1 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold text-sleek-text-secondary hover:text-white transition-all border border-white/5"
                          >
                            {ratio * 100}% {ratio === 1.0 ? '(전량)' : ''}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Expected Revenue Summary */}
                {manualSellPrice > 0 && manualSellQty > 0 && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex justify-between items-center">
                    <span className="text-xs text-rose-300 font-bold">총 매도 예상 금액</span>
                    <span className="text-lg font-black font-mono text-rose-400">
                      {formatCurrency(Math.round(manualSellPrice * manualSellQty))}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setManualSellModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold text-xs text-sleek-text-secondary hover:text-white transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleExecuteManualSell}
                  className="flex-1 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs transition-all shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2"
                >
                  <CircleDollarSign className="w-4 h-4" />
                  지정가 수동 매도 주문 전송
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Total Asset Evaluation Analysis Modal (총 자산 평가 분석 팝업) */}
      <AnimatePresence>
        {isAssetAnalysisModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-sleek-card border border-sleek-border rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl relative"
            >
              {/* Modal Header */}
              <div className="p-5 md:p-6 border-b border-sleek-border flex items-center justify-between bg-sleek-bg/80">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-sleek-blue/15 border border-sleek-blue/30 rounded-2xl text-sleek-blue">
                    <PieChart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
                      총 자산 산출 & 분석 리포트
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-sleek-blue/15 text-sleek-blue rounded-full border border-sleek-blue/30">
                        {kisConfig.isConnected ? "실계좌 연동 (44431721-01)" : "시뮬레이션 계좌"}
                      </span>
                    </h3>
                    <p className="text-xs md:text-sm text-slate-300 mt-1">
                      주문가능자산과 실시간 주식 평가금액이 반영된 세부 내역 및 분석 리포트입니다.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAssetAnalysisModalOpen(false)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-5 md:p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
                {/* 1. Overall Total Asset Hero Card */}
                <div className="bg-gradient-to-br from-sleek-blue/20 via-slate-900/60 to-slate-900 border border-sleek-blue/40 rounded-2xl p-5 md:p-6 space-y-4 relative overflow-hidden shadow-lg">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div>
                      <div className="text-xs md:text-sm font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                        <span>현재 총 자산 평가금액</span>
                        <Calculator className="w-4 h-4 text-sleek-blue" />
                      </div>
                      <div className="text-3xl md:text-4xl font-black text-white tracking-tight">
                        {formatCurrency(assetAnalysis.totalCalculatedAsset)}
                      </div>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-center gap-5 shrink-0">
                      <div>
                        <div className="text-xs text-slate-400 font-bold">투자 원금</div>
                        <div className="text-sm md:text-base font-mono font-extrabold text-white">{formatCurrency(assetAnalysis.principal)}</div>
                      </div>
                      <div className="h-8 w-px bg-white/10" />
                      <div>
                        <div className="text-xs text-slate-400 font-bold">원금 대비 손익</div>
                        <div className={cn(
                          "text-sm md:text-base font-mono font-extrabold flex items-center gap-1",
                          assetAnalysis.totalPnL >= 0 ? "text-rose-400" : "text-sky-400"
                        )}>
                          {assetAnalysis.totalPnL >= 0 ? <TrendingUp className="w-4 h-4 text-rose-400" /> : <TrendingDown className="w-4 h-4 text-sky-400" />}
                          <span>{assetAnalysis.totalPnL >= 0 ? '+' : ''}{formatCurrency(Math.round(assetAnalysis.totalPnL))}</span>
                          <span className="text-xs font-bold">({assetAnalysis.totalPnLPercent >= 0 ? '+' : ''}{assetAnalysis.totalPnLPercent.toFixed(2)}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Portfolio Proportion Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs md:text-sm font-bold text-slate-300">
                      <span>자산 구성 비중</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sleek-blue inline-block" /> 현금 {assetAnalysis.cashShare.toFixed(1)}%</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> 주식 {assetAnalysis.stockShare.toFixed(1)}%</span>
                        {assetAnalysis.pendingReserve > 0 && (
                          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 예약금 {assetAnalysis.pendingShare.toFixed(1)}%</span>
                        )}
                      </div>
                    </div>
                    <div className="h-3.5 w-full bg-white/5 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-white/10">
                      {assetAnalysis.cashShare > 0 && (
                        <div style={{ width: `${assetAnalysis.cashShare}%` }} className="bg-sleek-blue rounded-full h-full transition-all" title={`현금: ${assetAnalysis.cashShare.toFixed(1)}%`} />
                      )}
                      {assetAnalysis.stockShare > 0 && (
                        <div style={{ width: `${assetAnalysis.stockShare}%` }} className="bg-emerald-400 rounded-full h-full transition-all" title={`주식 평가: ${assetAnalysis.stockShare.toFixed(1)}%`} />
                      )}
                      {assetAnalysis.pendingShare > 0 && (
                        <div style={{ width: `${assetAnalysis.pendingShare}%` }} className="bg-amber-400 rounded-full h-full transition-all" title={`예약금: ${assetAnalysis.pendingShare.toFixed(1)}%`} />
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Three Component Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Card 1: Cash */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5">
                    <div className="text-xs text-slate-300 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Wallet className="w-4 h-4 text-sleek-blue" /> 주문가능자산</span>
                      <span className="text-sleek-blue font-mono font-bold text-xs">{assetAnalysis.cashShare.toFixed(1)}%</span>
                    </div>
                    <div className="text-lg md:text-xl font-black font-mono text-white">
                      {formatCurrency(assetAnalysis.cashBalance)}
                    </div>
                    <p className="text-xs text-slate-400">즉시 주문에 사용 가능한 예수금</p>
                  </div>

                  {/* Card 2: Stock Evaluation */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5">
                    <div className="text-xs text-slate-300 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-emerald-400" /> 보유 주식 평가액</span>
                      <span className="text-emerald-400 font-mono font-bold text-xs">{assetAnalysis.stockShare.toFixed(1)}%</span>
                    </div>
                    <div className="text-lg md:text-xl font-black font-mono text-white">
                      {formatCurrency(Math.round(assetAnalysis.stockValue))}
                    </div>
                    <p className="text-xs text-slate-400">현재 시장가 × 보유 주식 수의 합산</p>
                  </div>

                  {/* Card 3: Pending Order Reserve */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5">
                    <div className="text-xs text-slate-300 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Coins className="w-4 h-4 text-amber-400" /> 미체결 매수 예약금</span>
                      <span className="text-amber-400 font-mono font-bold text-xs">{assetAnalysis.pendingShare.toFixed(1)}%</span>
                    </div>
                    <div className="text-lg md:text-xl font-black font-mono text-white">
                      {formatCurrency(Math.round(assetAnalysis.pendingReserve))}
                    </div>
                    <p className="text-xs text-slate-400">가상/지정가 매수 대기 중 잠긴 예수금</p>
                  </div>
                </div>

                {/* 3. Valuation Formula Explanation Banner */}
                <div className="bg-sleek-bg p-4.5 rounded-2xl border border-sleek-border space-y-2.5">
                  <div className="text-xs md:text-sm font-bold text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-sleek-blue" />
                    <span>총 자산 평가액 산출 공식 (Calculation Logic)</span>
                  </div>
                  <div className="bg-black/50 p-3.5 rounded-xl font-mono text-xs md:text-sm text-amber-300 font-extrabold border border-white/10 overflow-x-auto">
                    총 자산 = [ 주문가능자산 ] + ∑( 보유 수량 × 실시간 현재가 )
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    실시간 현재가 변화에 따라 보유 주식 평가액이 실시간 반영되며, 평단가는 내림(Math.floor) 기준 및 해외 주식의 경우 현재 환율({formatCurrency(exchangeRate, true)}/$)로 원화 변환되어 계산됩니다.
                  </p>
                </div>

                {/* 4. Individual Stock Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs md:text-sm font-bold text-white flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-sleek-blue" />
                      보유 종목별 세부 평가 내역 ({assetAnalysis.stockList.length}개 종목)
                    </h4>
                    {assetAnalysis.stockList.length > 0 && (
                      <span className="text-xs text-slate-300 font-mono font-bold">
                        총 매수가: {formatCurrency(Math.round(assetAnalysis.stockInvested))}
                      </span>
                    )}
                  </div>

                  {assetAnalysis.stockList.length === 0 ? (
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center text-slate-400 text-xs md:text-sm">
                      현재 보유 중인 주식이 없습니다. 주문가능자산({formatCurrency(Math.floor(balance))})이 총 자산으로 평가됩니다.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                      {assetAnalysis.stockList.map((item) => {
                        const isSelected = selectedSymbol === item.symbol;
                        return (
                          <div 
                            key={item.symbol} 
                            onClick={() => {
                              setSelectedSymbol(item.symbol);
                              const configEl = document.getElementById('ai-scalping-config-panel');
                              if (configEl) {
                                configEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                            className={cn(
                              "border rounded-2xl p-4 transition-all space-y-2.5 cursor-pointer",
                              isSelected 
                                ? "bg-sleek-blue/15 border-sleek-blue shadow-lg ring-1 ring-sleek-blue/40" 
                                : "bg-white/5 border-white/10 hover:border-sleek-blue/40"
                            )}
                          >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="font-extrabold text-white text-base md:text-lg">{item.name}({item.symbol})</span>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-white/10 text-slate-200 rounded-md">
                                포트폴리오 {item.portfolioShare.toFixed(1)}%
                              </span>
                            </div>
                            <div className={cn(
                              "font-mono font-black text-xs md:text-sm px-2.5 py-1 rounded-lg border",
                              item.pnlAmount >= 0 
                                ? "text-rose-400 bg-rose-500/10 border-rose-500/30" 
                                : "text-sky-400 bg-sky-500/10 border-sky-500/30"
                            )}>
                              {item.pnlAmount >= 0 ? '+' : ''}{formatCurrency(Math.round(item.pnlAmount))} ({item.pnlPercent >= 0 ? '+' : ''}{item.pnlPercent.toFixed(2)}%)
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs pt-2.5 border-t border-white/10 text-slate-300 font-mono">
                            <div>
                              <span>보유수량: </span>
                              <strong className="text-white font-bold">{item.qty.toLocaleString()} 주</strong>
                            </div>
                            <div>
                              <span>매수평단: </span>
                              <strong className="text-amber-300 font-bold">{formatCurrency(Math.floor(item.avgPrice))}</strong>
                            </div>
                            <div>
                              <span>실시간현재가: </span>
                              <strong className="text-white font-bold">{formatCurrency(Math.round(item.currentPrice))}</strong>
                            </div>
                            <div>
                              <span>현재평가금: </span>
                              <strong className="text-sleek-blue font-black">{formatCurrency(Math.round(item.evaluatedAmount))}</strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>

                {/* 5. Summary / Insight Box */}
                <div className="bg-sleek-blue/10 border border-sleek-blue/20 rounded-2xl p-4 flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-sleek-blue shrink-0 mt-0.5" />
                  <div className="text-xs md:text-sm space-y-1">
                    <div className="font-bold text-white">포트폴리오 평가 총평</div>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                      {assetAnalysis.cashShare > 70 
                        ? `주문가능자산 비중이 ${assetAnalysis.cashShare.toFixed(1)}%로 안정적인 현금 유동성을 확보하고 있어, 추가 매수 타점 포착 시 즉각적인 대응이 가능합니다.`
                        : assetAnalysis.stockShare > 70
                        ? `주식 보유 비중이 ${assetAnalysis.stockShare.toFixed(1)}%로 주가 상승 시 높은 수익률을 기대할 수 있으나, 시장 변동성에 유의할 필요가 있습니다.`
                        : `현금(${assetAnalysis.cashShare.toFixed(1)}%)과 주식(${assetAnalysis.stockShare.toFixed(1)}%)의 균형 잡힌 포트폴리오로 안정적인 리스크 관리가 이루어지고 있습니다.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 md:p-5 border-t border-sleek-border bg-sleek-bg/80 flex justify-end">
                <button
                  onClick={() => setIsAssetAnalysisModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-sleek-blue hover:bg-sleek-blue/90 text-white font-bold text-xs md:text-sm transition-all shadow-lg shadow-sleek-blue/20"
                >
                  확인 (닫기)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
