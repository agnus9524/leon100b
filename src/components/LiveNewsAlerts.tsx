import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, TrendingUp, Sparkles, X, ChevronRight, BellRing, ExternalLink, Zap } from 'lucide-react';

export interface MarketNewsItem {
  id: string;
  symbol: string;
  stockName: string;
  title: string;
  source: string;
  time: string;
  impactScore: number; // e.g. 92
  isSurgeAlert: boolean;
  category: string;
  summary: string;
}

interface LiveNewsAlertsProps {
  selectedSymbol?: string;
  onSelectStock?: (symbol: string, name?: string) => void;
}

const DEFAULT_NEWS_FEED: MarketNewsItem[] = [
  {
    id: 'news-1',
    symbol: '005930',
    stockName: '삼성전자',
    title: 'HBM4 양산 로드맵 조기 가동 및 글로벌 AI 빅테크 대규모 공급 협상',
    source: '한국경제',
    time: '방금 전',
    impactScore: 95,
    isSurgeAlert: true,
    category: 'AI 반도체',
    summary: '차세대 HBM4 16단 양산 시점을 대폭 앞당기며 엔비디아 공급망 핵심 파트너십 재부각'
  },
  {
    id: 'news-2',
    symbol: '000660',
    stockName: 'SK하이닉스',
    title: '글로벌 데이터센터向 서버용 고대역폭 메모리 전량 완판 및 영업익 컨센서스 상회',
    source: '매일경제',
    time: '3분 전',
    impactScore: 92,
    isSurgeAlert: true,
    category: '실적 급증',
    summary: 'HBM3E 공급 가격 프리미엄 유지로 3분기 연속 사상 최대 분기 영업이익 달성 전망'
  },
  {
    id: 'news-3',
    symbol: '086520',
    stockName: '에코프로비엠',
    title: '유럽 배터리 제조사와 5조원대 양극재 장기 공급계약 체결 임박',
    source: '전자신문',
    time: '8분 전',
    impactScore: 88,
    isSurgeAlert: true,
    category: '수주 공시',
    summary: '신규 하이니켈 단결정 양극재 단독 공급 계약 체결로 2차전지 반등 랠리 주도'
  },
  {
    id: 'news-4',
    symbol: '035420',
    stockName: 'NAVER',
    title: '생성형 AI 하이퍼클로바X 엔터프라이즈 B2B 수주 300% 폭증',
    source: '연합뉴스',
    time: '15분 전',
    impactScore: 84,
    isSurgeAlert: false,
    category: 'AI 플랫폼',
    summary: '금융 및 공공기관 중심 온프레미스 AI 도입 수요 확대로 클라우드 부문 흑자전환 가속'
  }
];

export const LiveNewsAlerts: React.FC<LiveNewsAlertsProps> = ({
  selectedSymbol,
  onSelectStock
}) => {
  const [newsFeed, setNewsFeed] = useState<MarketNewsItem[]>(DEFAULT_NEWS_FEED);
  const [activeAlert, setActiveAlert] = useState<MarketNewsItem | null>(DEFAULT_NEWS_FEED[0]);
  const [isDismissed, setIsDismissed] = useState(false);

  // Auto rotate active breaking news alert every 12 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNewsFeed(prev => {
        const nextIndex = (prev.findIndex(n => n.id === activeAlert?.id) + 1) % prev.length;
        setActiveAlert(prev[nextIndex]);
        return prev;
      });
    }, 12000);
    return () => clearInterval(timer);
  }, [activeAlert]);

  if (isDismissed || !activeAlert) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-600/15 border border-amber-500/30 rounded-2xl p-2.5 sm:p-3 shadow-lg backdrop-blur-md flex items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
            <Zap className="w-3.5 h-3.5 fill-amber-300 animate-bounce" />
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 font-mono flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> 급등 이슈 포착
            </span>
            <button
              onClick={() => onSelectStock?.(activeAlert.symbol, activeAlert.stockName)}
              className="font-bold text-white hover:text-amber-300 transition-colors truncate text-left cursor-pointer flex items-center gap-1.5"
            >
              <strong className="text-amber-300 font-black shrink-0">[{activeAlert.stockName}]</strong>
              <span className="truncate">{activeAlert.title}</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono shrink-0 hidden md:inline">
              ({activeAlert.source} · {activeAlert.time})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onSelectStock?.(activeAlert.symbol, activeAlert.stockName)}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
            title={`${activeAlert.stockName} 스캘퍼 즉시 전환`}
          >
            <span>스캘퍼 적용</span>
            <ChevronRight className="w-3 h-3" />
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="알림 닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
