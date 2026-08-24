import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  BrainCircuit, 
  RefreshCw, 
  Zap, 
  Target, 
  CheckCircle2, 
  Plus, 
  Flame, 
  Trophy, 
  Activity,
  Info,
  X,
  TrendingUp,
  BarChart2
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

type StrategyCategoryType = 'ALL' | 'SUPPORT_REBOUND' | 'MOMENTUM_BREAKOUT' | 'VWAP_SUPPORT' | 'CVD_FLOW';

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
  const [activeCategory, setActiveCategory] = useState<StrategyCategoryType>('ALL');
  const [selectedItem, setSelectedItem] = useState<ScalperRecommendation | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Single fetch on open if recommendations empty. No auto-polling interval!
  React.useEffect(() => {
    if (!isOpen) return;
    if (recommendations.length === 0 && !isLoading) {
      onRefresh();
    }
  }, [isOpen, recommendations.length, isLoading, onRefresh]);

  const handleManualRefresh = async () => {
    if (isRefreshing || isLoading) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const filteredList = useMemo(() => {
    let list = recommendations;
    if (activeCategory !== 'ALL') {
      if (activeCategory === 'CVD_FLOW') {
        list = list.filter(r => r.category === 'VOLUME_SURGE' || (r as any).category === 'CVD_FLOW' || r.tags.some(t => t.includes('CVD')));
      } else {
        list = list.filter(r => r.category === activeCategory);
      }
    }
    return [...list].sort((a, b) => b.scalpingScore - a.scalpingScore);
  }, [recommendations, activeCategory]);

  const top3 = useMemo(() => {
    return filteredList.slice(0, 3);
  }, [filteredList]);

  // Counts for category badges
  const counts = useMemo(() => {
    return {
      ALL: recommendations.length,
      SUPPORT_REBOUND: recommendations.filter(r => r.category === 'SUPPORT_REBOUND').length,
      MOMENTUM_BREAKOUT: recommendations.filter(r => r.category === 'MOMENTUM_BREAKOUT').length,
      VWAP_SUPPORT: recommendations.filter(r => r.category === 'VWAP_SUPPORT').length,
      CVD_FLOW: recommendations.filter(r => r.category === 'VOLUME_SURGE' || (r as any).category === 'CVD_FLOW' || r.tags.some(t => t.includes('CVD'))).length
    };
  }, [recommendations]);

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
                    <span>코스피(KOSPI) 실시간 초단타 스캘핑 최적 추천 10선</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10.5px] font-mono font-bold">
                      <Flame className="w-3 h-3 text-emerald-400 fill-emerald-400 animate-pulse" />
                      실시간 퀀트 점수
                    </span>
                  </h2>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  코스피 대형 주도주 실시간 CVD 수급 · VWAP 지지 · 5분봉 돌파 & 눌림목 딥리서치 기반
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing || isLoading}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-emerald-500/50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                title="실시간 거래량, CVD 자금유입 및 체결강도 데이터를 1회 재분석합니다."
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

          {/* Filter Bar (Only KOSPI & 4 Core Strategies) */}
          <div className="px-4 sm:px-5 py-2.5 bg-slate-900/40 border-b border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shrink-0">
            {/* Left: Market Scope Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black">
                <span>👑 코스피(KOSPI) 대형 유동성 전용</span>
              </span>
            </div>

            {/* Right: Scalping 4-Strategy Filters & Batch Registration */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'ALL' as const, label: '전체 코스피', icon: Trophy, count: counts.ALL },
                { id: 'SUPPORT_REBOUND' as const, label: '① 눌림목 반등', icon: Target, count: counts.SUPPORT_REBOUND },
                { id: 'MOMENTUM_BREAKOUT' as const, label: '② 모멘텀 돌파', icon: Zap, count: counts.MOMENTUM_BREAKOUT },
                { id: 'VWAP_SUPPORT' as const, label: '③ VWAP 지지', icon: BarChart2, count: counts.VWAP_SUPPORT },
                { id: 'CVD_FLOW' as const, label: '④ CVD 수급', icon: Flame, count: counts.CVD_FLOW }
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold font-sans flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                      active 
                        ? 'bg-gradient-to-r from-emerald-500/30 to-teal-500/30 text-emerald-200 border border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                        : 'bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                    <span className={`text-[9.5px] px-1 rounded-full font-mono font-black ${active ? 'bg-emerald-500/40 text-emerald-100' : 'bg-slate-700/50 text-slate-400'}`}>
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
                  <p className="text-sm font-bold text-white">코스피 실시간 수급 & 호가 딥리서치 분석 중...</p>
                  <p className="text-xs text-slate-400">CVD 누적 순매수, 당일 VWAP 지지선, 체결강도 및 돌파 타점을 계산하고 있습니다.</p>
                </div>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Info className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold">해당 카테고리의 추천 종목이 없습니다.</p>
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
                >
                  전체 코스피 다시 분석
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
                                <p className="text-[11px] font-mono text-slate-400">{stock.symbol} · <span className="text-emerald-400 font-bold">KOSPI</span></p>
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
                    <span>코스피 추천 종목 상세 분석 리스트 ({filteredList.length}개)</span>
                    <span className="text-[11px] text-slate-500 font-mono">* 100점 만점 퀀트 스캘핑 점수 순</span>
                  </div>

                  <div className="space-y-2">
                    {filteredList.map((stock) => {
                      const isRegistered = registeredSymbols.includes(stock.symbol);
                      const isSelected = selectedItem?.symbol === stock.symbol;

                      const categoryBadge = (() => {
                        if (stock.category === 'VOLUME_SURGE' || (stock as any).category === 'CVD_FLOW') {
                          return { text: '🔥 CVD 수급', cls: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
                        }
                        if (stock.category === 'MOMENTUM_BREAKOUT') {
                          return { text: '⚡ 모멘텀 돌파', cls: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
                        }
                        if (stock.category === 'VWAP_SUPPORT') {
                          return { text: '📊 VWAP 지지', cls: 'bg-blue-500/10 text-blue-300 border-blue-500/30' };
                        }
                        return { text: '🎯 눌림목 반등', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
                      })();

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
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                                    KOSPI
                                  </span>
                                  {stock.theme && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 font-sans">
                                      {stock.theme}
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${categoryBadge.cls}`}>
                                    {categoryBadge.text}
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
                                <div className={`text-[11px] font-bold ${stock.changePercent >= 0 ? 'text-rose-400' : 'text-sky-400'}`}>
                                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                </div>
                              </div>

                              <div className="text-right hidden sm:block">
                                <div className="text-xs text-slate-400 text-[10px]">거래대금/급증</div>
                                <div className="text-xs font-bold text-slate-200">{stock.tradeAmount}</div>
                                <div className="text-[10px] text-emerald-400 font-bold">+{stock.volumeSurgeRate}%</div>
                              </div>

                              <div className="text-right">
                                <div className="text-xs text-slate-400 text-[10px]">체결강도</div>
                                <div className="text-xs font-black text-cyan-300">{stock.volumeIntensity}%</div>
                                <div className="text-[10px] text-slate-400">RSI {stock.rsi}</div>
                              </div>

                              <div className="text-right">
                                <div className="text-xs text-slate-400 text-[10px]">스캘핑 점수</div>
                                <div className="flex items-center gap-1 justify-end">
                                  <span className="text-sm font-black text-emerald-400">{stock.scalpingScore}</span>
                                  <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                    {stock.grade}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Actions */}
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onSelectStock(stock)}
                                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                    isRegistered
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600'
                                  }`}
                                >
                                  {isRegistered ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                  <span>{isRegistered ? '선택됨' : '등록'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onQuickBuy(stock)}
                                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md active:scale-95"
                                >
                                  <Zap className="w-3.5 h-3.5 fill-white" />
                                  <span>매수</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Strategy Tags & Targets Bar */}
                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {stock.tags.map(t => (
                                <span key={t} className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5 font-sans">
                                  {t}
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
              <span>종목을 클릭하면 스캘퍼 탭으로 자동 등록되고 실시간 호가 및 차트로 즉시 연동됩니다.</span>
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
