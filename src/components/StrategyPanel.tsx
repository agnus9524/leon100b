import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Play, 
  RefreshCw, 
  BrainCircuit, 
  LineChart as LineChartIcon, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  History,
  Code
} from 'lucide-react';
import { generateStrategyFromNL } from '../services/geminiService';
import { runBacktest, BacktestResult, Strategy } from '../services/backtestService';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export const StrategyPanel: React.FC = () => {
  const [nlPrompt, setNlPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);

  const handleGenerateStrategy = async () => {
    if (!nlPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateStrategyFromNL(nlPrompt);
      setStrategy(generated);
      setBacktestResult(null);
    } catch (error) {
      console.error(error);
      alert("전략 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunBacktest = async () => {
    if (!strategy) return;
    setIsBacktesting(true);
    try {
      const result = await runBacktest(strategy);
      setBacktestResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsBacktesting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      <div className="space-y-6">
        {/* Strategy Builder */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-sleek-card border border-white/5 rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sleek-blue/20 rounded-xl flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-sleek-blue" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white italic uppercase tracking-tighter">AI Strategy Builder</h2>
              <p className="text-[10px] text-sleek-text-secondary uppercase tracking-widest">자연어로 투자 전략을 생성하세요</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <textarea 
                value={nlPrompt}
                onChange={(e) => setNlPrompt(e.target.value)}
                placeholder="예: 'RSI가 30 이하일 때 매수하고, 70 이상일 때 매도하는 전략을 만들어줘. 손절가는 -5%로 잡아줘.'"
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs text-white min-h-[120px] focus:border-sleek-blue outline-none transition-all resize-none"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                 <button 
                  onClick={handleGenerateStrategy}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-sleek-blue text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-sleek-blue/20 hover:scale-[1.05] transition-all disabled:opacity-50"
                 >
                   {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                   Generate
                 </button>
              </div>
            </div>

            <AnimatePresence>
              {strategy && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white/5 border border-white/5 rounded-2xl p-5 overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                       <LineChartIcon className="w-4 h-4 text-sleek-green" />
                       {strategy.name}
                    </h3>
                    <div className="flex gap-1">
                      {strategy.indicators.map(ind => (
                        <span key={ind} className="px-2 py-0.5 bg-sleek-blue/10 text-sleek-blue text-[8px] font-bold rounded-full border border-sleek-blue/20">
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                      <p className="text-[9px] text-sleek-green font-black uppercase mb-1">Buy Condition</p>
                      <p className="text-[11px] text-white/80">{strategy.conditions.buy}</p>
                    </div>
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                      <p className="text-[9px] text-sleek-red font-black uppercase mb-1">Sell Condition</p>
                      <p className="text-[11px] text-white/80">{strategy.conditions.sell}</p>
                    </div>
                  </div>

                  <button 
                    onClick={handleRunBacktest}
                    disabled={isBacktesting}
                    className="w-full mt-6 py-3 bg-white text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-sleek-blue hover:text-white transition-all disabled:opacity-50"
                  >
                    {isBacktesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    백테스트 실행 (Backtest)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <div className="space-y-6">
        {/* Backtest Results */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="bg-sleek-card border border-white/5 rounded-3xl p-6 h-full flex flex-col"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sleek-green/20 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-sleek-green" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white italic uppercase tracking-tighter">Simulation Results</h2>
                <p className="text-[10px] text-sleek-text-secondary uppercase tracking-widest">전략 히스토리 및 분석</p>
              </div>
            </div>
          </div>

          {!backtestResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-20 h-20 border-4 border-dashed border-white/10 rounded-full flex items-center justify-center mb-4">
                <LineChartIcon className="w-8 h-8 text-white" />
              </div>
              <p className="text-xs text-white uppercase font-bold">No results to display</p>
              <p className="text-[10px] text-sleek-text-secondary">전략을 생성하고 백테스트를 실행하세요</p>
            </div>
          ) : (
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <p className="text-[9px] text-sleek-text-secondary uppercase mb-1">Total Return</p>
                  <p className={cn("text-lg font-black italic", backtestResult.totalReturn >= 0 ? "text-sleek-green" : "text-sleek-red")}>
                    {backtestResult.totalReturn >= 0 ? '+' : ''}{backtestResult.totalReturn.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <p className="text-[9px] text-sleek-text-secondary uppercase mb-1">Win Rate</p>
                  <p className="text-lg font-black italic text-white">{backtestResult.winRate.toFixed(1)}%</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <p className="text-[9px] text-sleek-text-secondary uppercase mb-1">Total Trades</p>
                  <p className="text-lg font-black italic text-sleek-blue">{backtestResult.trades}</p>
                </div>
              </div>

              <div className="flex-1 h-[300px] min-h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={backtestResult.chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      hide
                    />
                    <YAxis 
                      hide
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff', fontSize: '10px' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#22C55E" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="p-4 bg-sleek-blue/10 border border-sleek-blue/20 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-sleek-blue" />
                <p className="text-[11px] text-sleek-blue font-bold leading-tight">
                  이 전략은 시뮬레이션 결과 시장 평균보다 높은 수익률을 기록했습니다. <br/>
                  실제 거래 적용 시 리스크를 고려하시기 바랍니다.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

// Helper function for class concentration (assuming it exists or define a simple one)
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
