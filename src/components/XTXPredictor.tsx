import React, { useState, useEffect } from 'react';
import { BrainCircuit, Zap, Target, ShieldAlert, TrendingUp, TrendingDown, Activity, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { aiTradingService, MarketSignal } from '../services/aiTradingService';

interface XTXPredictorProps {
  symbol: string;
  name: string;
  history: { time: string; price: number }[];
  marketType: 'KR' | 'US';
  onExecuteTrade?: (signal: MarketSignal) => void;
  onSignalChange?: (signal: MarketSignal | null) => void;
}

export const XTXPredictor: React.FC<XTXPredictorProps> = ({ symbol, name, history, marketType, onExecuteTrade, onSignalChange }) => {
  const [signal, setSignalState] = useState<MarketSignal | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<number>(0);

  const setSignal = (s: MarketSignal | null) => {
    setSignalState(s);
    onSignalChange?.(s);
  };

  const performAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const result = await aiTradingService.analyzeStock(symbol, history, name);
      setSignal(result);
      setLastAnalysis(Date.now());
    } catch (error) {
      console.error("BullGPT Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    performAnalysis();
    const interval = setInterval(performAnalysis, 300000);
    return () => clearInterval(interval);
  }, [symbol, history.length]);

  return (
    <div className="bg-[#0a0a0a] border-2 border-white/10 rounded-[32px] p-8 overflow-hidden relative shadow-2xl">
      {/* Background Accent */}
      <div className={`absolute top-0 right-0 w-64 h-64 blur-[120px] -mr-32 -mt-32 rounded-full transition-colors duration-1000 ${
        signal?.action === 'BUY' ? 'bg-emerald-500/10' : 
        signal?.action === 'SELL' ? 'bg-rose-500/10' : 
        'bg-blue-500/5'
      }`} />
      
      <div className="flex items-center justify-between mb-10 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
            <BrainCircuit className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              불GPT 예측 엔진
              <span className="text-[12px] bg-white/10 text-white/60 px-3 py-1 rounded-full font-mono font-medium">PRO v4.2</span>
            </h3>
            <p className="text-sm text-gray-400 font-medium mt-0.5">딥러닝 패턴 및 확률적 분석 엔진</p>
          </div>
        </div>
        
        <button 
          onClick={performAnalysis}
          disabled={isAnalyzing}
          className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-2xl transition-all disabled:opacity-50 group"
        >
          <Zap className={`w-5 h-5 transition-transform group-hover:scale-110 ${isAnalyzing ? 'text-yellow-400 animate-pulse' : 'text-gray-400'}`} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isAnalyzing && !signal ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-64 flex flex-col items-center justify-center gap-4"
          >
            <div className="relative">
              <Activity className="w-12 h-12 text-white animate-pulse" />
              <div className="absolute inset-0 bg-white/20 blur-xl animate-pulse rounded-full" />
            </div>
            <p className="text-sm text-gray-400 font-mono tracking-widest animate-pulse">시장 변동성 재구성 중...</p>
          </motion.div>
        ) : signal ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 relative z-10"
          >
            {/* Main Decision Badge */}
            <div className={`p-8 rounded-[24px] border-2 flex items-center justify-between transition-all duration-500 ${
              signal.action === 'BUY' ? 'bg-emerald-500/5 border-emerald-500/20' : 
              signal.action === 'SELL' ? 'bg-rose-500/5 border-rose-500/20' : 
              'bg-white/5 border-white/10'
            }`}>
              <div className="flex items-center gap-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                  signal.action === 'BUY' ? 'bg-emerald-500 text-black shadow-[0_0_40px_rgba(16,185,129,0.4)]' : 
                  signal.action === 'SELL' ? 'bg-rose-500 text-white shadow-[0_0_40px_rgba(244,63,94,0.4)]' : 
                  'bg-gray-700 text-white'
                }`}>
                  {signal.action === 'BUY' ? <TrendingUp className="w-10 h-10" /> : 
                   signal.action === 'SELL' ? <TrendingDown className="w-10 h-10" /> : 
                   <Target className="w-10 h-10" />}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-black tracking-tight text-white">
                      {signal.action === 'BUY' ? '신규 매수' : signal.action === 'SELL' ? '신규 매도' : '관망 유지'}
                    </span>
                    <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">
                      <span className="text-sm font-bold text-white/80">{signal.confidence}% 신뢰도</span>
                    </div>
                  </div>
                  <p className="text-lg text-gray-400 font-medium mt-2">{signal.pattern}</p>
                </div>
              </div>
              
              <div className="text-right flex flex-col justify-center">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">분석 주기: {signal.timeframe}</p>
                <div className={`flex items-center gap-2 text-2xl font-black font-mono ${signal.action === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {signal.action === 'BUY' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  RR: {signal.riskRewardRatio}
                </div>
              </div>
            </div>

            {/* AI Insight */}
            <div className="bg-white/5 border border-white/10 rounded-[24px] p-6">
              <h4 className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                AI 핵심 추론
              </h4>
              <p className="text-lg text-white leading-relaxed font-medium">
                "{signal.prediction}"
              </p>
              
              <div className="mt-6 flex flex-wrap gap-2">
                {signal.invariants.map((inv, idx) => (
                  <span key={idx} className="text-xs bg-white/5 text-gray-400 border border-white/10 px-3 py-1.5 rounded-full font-medium">
                    {inv}
                  </span>
                ))}
              </div>
            </div>

            {/* Trading Levels */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-[20px] p-5">
                <p className="text-xs text-rose-400 font-bold tracking-widest mb-2 flex justify-between">
                  손절가 (Stop Loss)
                  <span className="font-mono">
                    {(((signal.stopLoss - history[history.length - 1].price) / history[history.length - 1].price) * 100).toFixed(2)}%
                  </span>
                </p>
                <p className="text-2xl font-black text-white">
                  {marketType === 'US' ? '$' : '₩'}{signal.stopLoss.toLocaleString()}
                </p>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[20px] p-5">
                <p className="text-xs text-emerald-400 font-bold tracking-widest mb-2 flex justify-between">
                  목표가 (Take Profit)
                  <span className="font-mono">
                    {(((signal.targetPrice - history[history.length - 1].price) / history[history.length - 1].price) * 100).toFixed(2)}%
                  </span>
                </p>
                <p className="text-2xl font-black text-white">
                  {marketType === 'US' ? '$' : '₩'}{signal.targetPrice.toLocaleString()}
                </p>
              </div>
            </div>

            <button
              onClick={() => onExecuteTrade?.(signal)}
              className={`w-full py-5 rounded-[24px] text-lg font-black transition-all shadow-xl active:scale-[0.98] ${
                signal.action === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20' :
                signal.action === 'SELL' ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20' :
                'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              시그널 즉시 실행
            </button>
            
            <div className="flex items-center justify-between px-2">
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">
                마지막 분석: {new Date(lastAnalysis).toLocaleTimeString()}
              </p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Gemini 1.5 Ultra Live</p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
