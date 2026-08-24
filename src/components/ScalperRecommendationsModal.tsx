import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  BrainCircuit, 
  RefreshCw, 
  TrendingUp, 
  Zap, 
  Target, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  Plus, 
  ArrowUpRight, 
  Flame, 
  Trophy, 
  BarChart2, 
  Activity,
  Layers,
  Info,
  X
} from 'lucide-react';
import { ScalperRecommendation } from '../services/kisService';

interface ScalperRecommendationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: ScalperRecommendation[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onSelectStock: (rec: ScalperRecommendation) => void;
  onQuickBuy: (rec: ScalperRecommendation) => void;
  onBatchRegisterTop3: (top3: ScalperRecommendation[]) => void;
  registeredSymbols: string[];
}

export const ScalperRecommendationsModal: React.FC<ScalperRecommendationsModalProps> = ({
  isOpen,
  onClose,
  recommendations,
  isLoading,
  onRefresh,
  onSelectStock,
  onQuickBuy,
  onBatchRegisterTop3,
  registeredSymbols
}) => {
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'KOSPI' | 'KOSDAQ'>('KOSPI');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'VOLUME_SURGE' | 'MOMENTUM_BREAKOUT' | 'SUPPORT_REBOUND'>('ALL');
  const [selectedItem, setSelectedItem] = useState<ScalperRecommendation | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    if (recommendations.length === 0 && !isLoading) {
      onRefresh();
    }
    // Auto-refresh recommendation prices periodically while modal is open
    const refreshTimer = setInterval(() => {
      onRefresh();
    }, 5000);

    return () => clearInterval(refreshTimer);
  }, [isOpen, recommendations.length, isLoading, onRefresh]);

  const handleManualRefresh = async () => {
    if (isRefreshing || isLoading) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const filteredList = useMemo(() => {
    let list = recommendations;
    if (marketFilter !== 'ALL') {
      list = list.filter(r => (r.marketType || (r.tags.some(t => t.includes('KOSPI')) ? 'KOSPI' : 'KOSDAQ')) === marketFilter);
    }
    if (activeCategory !== 'ALL') {
      list = list.filter(r => r.category === activeCategory);
    }
    // Sort KOSPI first
    return [...list].sort((a, b) => {
      const aKospi = (a.marketType || (a.tags.some(t => t.includes('KOSPI')) ? 'KOSPI' : 'KOSDAQ')) === 'KOSPI' ? 0 : 1;
      const bKospi = (b.marketType || (b.tags.some(t => t.includes('KOSPI')) ? 'KOSPI' : 'KOSDAQ')) === 'KOSPI' ? 0 : 1;
      if (aKospi !== bKospi) return aKospi - bKospi;
      return b.scalpingScore - a.scalpingScore;
    });
  }, [recommendations, marketFilter, activeCategory]);

  const top3 = useMemo(() => {
    return filteredList.slice(0, 3);
  }, [filteredList]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999999] flex items-start justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto pt-6 sm:pt-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -20 }}
          className="bg-slate-950 border border-emerald-500/40 rounded-3xl max-w-5xl w-full flex flex-col max-h-[90vh] shadow-[0_0_60px_rgba(16,185,129,0.25)] relative text-white overflow-hidden"
        >
          {/* Top Glowing Gradient Accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0 bg-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-inner">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    <span>KIS & AI 실시간 초단타 스캘핑 최적 추천 10선</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10.5px] font-mono font-bold">
                      <Flame className="w-3 h-3 text-emerald-400 fill-emerald-400 animate-pulse" />
                      실시간 퀀트 스캘핑 점수
                    </span>
                  </h2>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  한국투자증권 실시간 수급 · 거래량 폭증도 · 체결강도 딥리서치 기반 최고 승률 종목 제안
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing || isLoading}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                title="실시간 거래량 및 체결강도 데이터를 다시 수집 분석합니다."
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${(isRefreshing || isLoading) ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">실시간 재분석</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-4 sm:px-5 py-2.5 bg-slate-900/40 border-b border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shrink-0">
            {/* Market Filter (KOSPI Priority) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[11px] font-black text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-500/30 whitespace-nowrap">
                시장 선택
              </span>
              {[
                { id: 'KOSPI', label: '👑 코스피 (KOSPI 1순위)' },
                { id: 'ALL', label: '전체 시장' },
                { id: 'KOSDAQ', label: '코스닥 (KOSDAQ)' }
              ].map(mTab => {
                const active = marketFilter === mTab.id;
                return (
                  <button
                    key={mTab.id}
                    type="button"
                    onClick={() => setMarketFilter(mTab.id as any)}
                    className={`px-3 py-1 rounded-xl text-xs font-black font-sans transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    {mTab.label}
                  </button>
                );
              })}
            </div>

            {/* Pattern / Category Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'ALL', label: '전체 유형', icon: Trophy, count: filteredList.length },
                { id: 'VOLUME_SURGE', label: '거래량 폭증', icon: Flame, count: recommendations.filter(r => r.category === 'VOLUME_SURGE').length },
                { id: 'MOMENTUM_BREAKOUT', label: '모멘텀 돌파', icon: Zap, count: recommendations.filter(r => r.category === 'MOMENTUM_BREAKOUT').length },
                { id: 'SUPPORT_REBOUND', label: '눌림목 반등', icon: Target, count: recommendations.filter(r => r.category === 'SUPPORT_REBOUND').length }
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id as any)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-sans flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                      active 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm' 
                        : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                    <span className={`text-[9.5px] px-1 rounded-full font-mono font-black ${active ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-700/50 text-slate-400'}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}

              {top3.length > 0 && (
                <button
                  type="button"
                  onClick={() => onBatchRegisterTop3(top3)}
                  className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-[0_0_12px_rgba(16,185,129,0.3)] active:scale-95 ml-auto whitespace-nowrap"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>TOP 3 일괄 등록</span>
                </button>
              )}
            </div>
          </div>

          {/* Modal Content Scroll Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-5 space-y-4">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">한국투자증권 실시간 호가 & 수급 딥리서치 중...</p>
                  <p className="text-xs text-slate-400">거래량 급증, 체결강도, 5분봉 돌파 타점을 정밀 계산하고 있습니다.</p>
                </div>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Info className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold">해당 카테고리의 추천 종목이 없습니다.</p>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700"
                >
                  전체 종목 다시 분석
                </button>
              </div>
            ) : (
              <>
                {/* Top 3 Featured Highlight Podiums (when ALL is active) */}
                {activeCategory === 'ALL' && top3.length >= 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {top3.map((stock, idx) => {
                      const isRegistered = registeredSymbols.includes(stock.symbol);
                      const podiumMedals = ['🥇 1위', '🥈 2위', '🥉 3위'];
                      const podiumBorders = [
                        'border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-950',
                        'border-slate-400/50 bg-gradient-to-b from-slate-400/10 via-slate-900/90 to-slate-950',
                        'border-amber-700/50 bg-gradient-to-b from-amber-700/10 via-slate-900/90 to-slate-950'
                      ];

                      return (
                        <div
                          key={stock.symbol}
                          className={`p-3.5 rounded-2xl border ${podiumBorders[idx]} flex flex-col justify-between space-y-3 relative overflow-hidden shadow-lg transition-all hover:scale-[1.01]`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-white font-mono">
                                {podiumMedals[idx]}
                              </span>
                              {stock.theme && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-300 font-sans">
                                  {stock.theme}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-black">
                              <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                              <span>{stock.scalpingScore}점</span>
                              <span className="text-[10px] px-1 bg-emerald-500/40 rounded text-white">{stock.grade}</span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-baseline justify-between gap-1">
                              <div>
                                <h3 className="font-black text-base text-white tracking-tight">{stock.name}</h3>
                                <p className="text-[11px] font-mono text-slate-400">{stock.symbol}</p>
                              </div>
                              <div className="text-right font-mono">
                                <div className="text-sm font-black text-white">{stock.price.toLocaleString()}원</div>
                                <div className={`text-xs font-bold ${stock.changePercent >= 0 ? 'text-rose-400' : 'text-sky-400'}`}>
                                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                  {stock.change !== undefined && (
                                    <span className="text-[10px] ml-1 opacity-80">
                                      ({stock.change >= 0 ? '+' : ''}{stock.change.toLocaleString()}원)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-white/5 text-[11px] font-mono">
                              <div className="bg-black/30 p-1.5 rounded-lg border border-white/5">
                                <span className="text-slate-400 text-[10px]">거래량 급증</span>
                                <div className="text-emerald-400 font-bold">+{stock.volumeSurgeRate}%</div>
                              </div>
                              <div className="bg-black/30 p-1.5 rounded-lg border border-white/5">
                                <span className="text-slate-400 text-[10px]">체결강도</span>
                                <div className="text-cyan-400 font-bold">{stock.volumeIntensity}%</div>
                              </div>
                              <div className="bg-black/30 p-1.5 rounded-lg border border-white/5">
                                <span className="text-slate-400 text-[10px]">1차 목표가</span>
                                <div className="text-rose-300 font-bold">+{stock.expectedReturn}%</div>
                              </div>
                              <div className="bg-black/30 p-1.5 rounded-lg border border-white/5">
                                <span className="text-slate-400 text-[10px]">스탑로스</span>
                                <div className="text-slate-300 font-bold">-1.5%</div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => onSelectStock(stock)}
                              className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                isRegistered 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              }`}
                            >
                              {isRegistered ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                              <span>{isRegistered ? '탭 선택' : '스캘퍼 등록'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onQuickBuy(stock)}
                              className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md active:scale-95"
                            >
                              <Zap className="w-3.5 h-3.5 fill-white" />
                              <span>즉시 매수</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full 10 Stock List View */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
                    <span>추천 종목 상세 분석 리스트 ({filteredList.length}개)</span>
                    <span className="text-[11px] text-slate-500 font-mono">* 100점 만점 퀀트 스캘핑 점수 순</span>
                  </div>

                  <div className="space-y-2">
                    {filteredList.map((stock) => {
                      const isRegistered = registeredSymbols.includes(stock.symbol);
                      const isSelected = selectedItem?.symbol === stock.symbol;

                      return (
                        <div
                          key={stock.symbol}
                          className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                            isSelected
                              ? 'bg-slate-900/95 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                              : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            {/* Left: Rank, Name, Price, Score */}
                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-xl font-mono font-black text-sm flex items-center justify-center shrink-0 border ${
                                stock.rank === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                                stock.rank === 2 ? 'bg-slate-300/20 text-slate-200 border-slate-400/40' :
                                stock.rank === 3 ? 'bg-amber-700/20 text-amber-400 border-amber-700/40' :
                                'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {stock.rank}
                              </div>

                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-black text-base text-white tracking-tight">{stock.name}</span>
                                  <span className="text-xs font-mono text-slate-400">({stock.symbol})</span>
                                  {stock.theme && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 font-sans">
                                      {stock.theme}
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                    stock.category === 'VOLUME_SURGE' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' :
                                    stock.category === 'MOMENTUM_BREAKOUT' ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' :
                                    'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                  }`}>
                                    {stock.category === 'VOLUME_SURGE' ? '🚀 거래량폭증' : stock.category === 'MOMENTUM_BREAKOUT' ? '⚡ 모멘텀돌파' : '🎯 눌림목반등'}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-300 font-sans line-clamp-1">
                                  {stock.reason}
                                </div>
                              </div>
                            </div>

                            {/* Middle: Metrics Grid */}
                            <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-between lg:justify-end shrink-0 font-mono">
                              <div className="text-right">
                                <div className="text-xs text-slate-400 text-[10px]">현재가</div>
                                <div className="text-sm font-black text-white">{stock.price.toLocaleString()}원</div>
                                <div className={`text-xs font-bold ${stock.changePercent >= 0 ? 'text-rose-400' : 'text-sky-400'}`}>
                                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                  {stock.change !== undefined && (
                                    <span className="text-[10px] ml-1 opacity-80">
                                      ({stock.change >= 0 ? '+' : ''}{stock.change.toLocaleString()}원)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-xs text-slate-400 text-[10px]">거래량/대금</div>
                                <div className="text-xs font-bold text-slate-200">{stock.volume}</div>
                                <div className="text-[11px] text-emerald-400 font-bold">+{stock.volumeSurgeRate}% 폭증</div>
                              </div>

                              <div className="text-right">
                                <div className="text-xs text-slate-400 text-[10px]">체결강도</div>
                                <div className="text-sm font-black text-cyan-300">{stock.volumeIntensity}%</div>
                                <div className="text-[10px] text-slate-400">RSI {stock.rsi}</div>
                              </div>

                              {/* Scalping Score Circle / Badge */}
                              <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 min-w-[70px]">
                                <div className="text-[9px] font-bold text-emerald-400">스캘핑점수</div>
                                <div className="text-base font-black text-emerald-300">{stock.scalpingScore}점</div>
                                <div className="text-[10px] font-bold px-1.5 rounded bg-emerald-500/30 text-emerald-200">{stock.grade}</div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1.5 w-full sm:w-auto mt-2 sm:mt-0">
                                <button
                                  type="button"
                                  onClick={() => onSelectStock(stock)}
                                  className={`flex-1 sm:flex-initial px-3 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                    isRegistered
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/40'
                                  }`}
                                >
                                  {isRegistered ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
                                  <span>{isRegistered ? '스캘퍼 탭 선택' : '스캘퍼 탭 등록'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onQuickBuy(stock)}
                                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md active:scale-95 whitespace-nowrap"
                                >
                                  <Zap className="w-3.5 h-3.5 fill-white" />
                                  <span>스캘핑 매수</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Tags & Price Targets Sub-bar */}
                          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono text-slate-400">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {stock.tags.map((tag, tIdx) => (
                                <span key={tIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-emerald-300 border border-emerald-500/20">
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span>목표가: <strong className="text-emerald-400">{stock.targetPrice.toLocaleString()}원 (+{stock.expectedReturn}%)</strong></span>
                              <span>손절가: <strong className="text-rose-400">{stock.stopLoss.toLocaleString()}원 (-1.5%)</strong></span>
                              <span className="text-slate-500">권장: {stock.holdingTime || '3~15분'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3.5 sm:p-4 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between gap-3 flex-wrap shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>선택한 종목을 클릭하면 스캘퍼 탭으로 자동 등록되고 실시간 호가 및 차트로 즉시 연동됩니다.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ScalperRecommendationsModal;
