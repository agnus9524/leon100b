import React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, 
  TrendingUp, 
  BarChart3, 
  Clock, 
  ShieldAlert, 
  Target, 
  Info,
  ChevronRight,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Activity
} from 'lucide-react';

interface ScalperGuideProps {
  onClose: () => void;
}

export default function ScalperGuide({ onClose }: ScalperGuideProps) {
  return (
    <div className="space-y-8 py-2">
      {/* Header Info */}
      <div className="bg-sleek-blue/10 border border-sleek-blue/20 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-12 h-12 bg-sleek-blue/20 rounded-xl flex items-center justify-center shrink-0">
          <Zap className="w-6 h-6 text-sleek-blue" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white mb-1">스캘핑(Scalping) 매매란?</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            매우 짧은 시간 동안 발생하는 작은 가격 변동을 반복적으로 수익화하는 단타 매매 기법입니다. 
            보통 수 초에서 수 분 내에 진입과 청산을 완료하여 리스크를 최소화합니다.
          </p>
        </div>
      </div>

      {/* 5 Core Principles */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-sleek-blue" />
          <h4 className="text-sm font-black text-white uppercase tracking-wider">스캘핑의 핵심 원칙 5가지</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PrincipleCard 
            icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
            title="1. 큰 수익보다 높은 승률"
            description="목표 수익은 0.3%~2% 정도로 짧게 잡습니다. 한 번에 크게 벌기보다 작은 수익을 여러 번 쌓아 복리 효과를 누리는 것이 핵심입니다."
            example="+0.8% 수익 7번, -0.5% 손실 2번 → 강력한 우상향"
          />
          <PrincipleCard 
            icon={<BarChart3 className="w-5 h-5 text-amber-400" />}
            title="2. 거래량이 가장 중요"
            description="가격보다 거래량 증가를 먼저 봅니다. 거래량 없는 상승은 가짜일 확률이 높습니다. 평소 대비 거래량이 터지는 종목에만 진입하세요."
            example="체결 강도 증가, 매수 호가가 빠르게 쌓이는 순간"
          />
          <PrincipleCard 
            icon={<Activity className="w-5 h-5 text-sleek-blue" />}
            title="3. 추세 방향만 공략"
            description="상승 추세에서는 눌림목 매수, 하락 추세에서는 관망을 원칙으로 합니다. 역추세 매매(역발상)는 스캘핑에서 가장 피해야 할 습관입니다."
          />
          <PrincipleCard 
            icon={<ShieldAlert className="w-5 h-5 text-rose-400" />}
            title="4. 기계적인 손절"
            description="스캘퍼에게 가장 중요한 능력입니다. -1% 등 기준 손실 도달 시 즉시 손절하세요. 물타기는 절대 금물입니다."
            quote="작게 자주 잃고, 크게 잃지 않는다."
          />
          <PrincipleCard 
            icon={<Clock className="w-5 h-5 text-slate-400" />}
            title="5. 활발한 시간대 거래"
            description="변동성이 있는 시간대에만 집중합니다. 국내장은 개장 후 1시간, 미국장은 개장 전후 1시간이 가장 효율적입니다."
          />
        </div>
      </section>

      {/* Entry Patterns */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h4 className="text-sm font-black text-white uppercase tracking-wider">대표적인 진입 패턴</h4>
        </div>
        
        <div className="space-y-3">
          <PatternRow 
            title="① 거래량 돌파"
            condition="거래량 급증 + 전고점 돌파"
            entry="돌파 확인 후 즉시"
            exit="1~2% 수익 또는 거래량 감소 시"
          />
          <PatternRow 
            title="② 눌림목 매매"
            condition="강한 상승 발생 후 짧은 조정"
            entry="이동평균선(5일/20일) 지지 확인 시"
            exit="이전 고점 부근"
          />
          <PatternRow 
            title="③ VWAP 매매"
            condition="기관용 평균 매매가격(VWAP) 활용"
            entry="가격이 VWAP 위로 올라올 때"
            exit="VWAP 아래로 꺾일 때"
          />
        </div>
      </section>

      {/* Key Indicators */}
      <section className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">자주 사용하는 기술적 지표</h4>
        <div className="flex flex-wrap gap-2">
          {['거래량(Volume)', '체결강도', '호가창 잔량', 'VWAP', '5일 이평선', '20일 이평선', 'RSI'].map(tag => (
            <span key={tag} className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-[11px] font-bold text-white italic">
              #{tag}
            </span>
          ))}
        </div>
        <p className="mt-4 text-[10px] text-slate-400 leading-relaxed italic">
          * 실전에서는 RSI 같은 보조지표보다 실시간 거래량과 호가창의 움직임을 더 중요하게 보는 것이 스캘핑의 정석입니다.
        </p>
      </section>

      {/* Closing Summary */}
      <div className="bg-sleek-blue border border-sleek-blue/30 rounded-2xl p-6 text-center shadow-xl shadow-sleek-blue/20">
        <Lightbulb className="w-8 h-8 text-white mx-auto mb-3" />
        <h3 className="text-lg font-black text-white mb-2">"거래량이 터진 종목을 추세 방향으로 따라가고, 손절은 짧게 한다."</h3>
        <p className="text-xs text-blue-100/80 leading-relaxed">
          스캘핑의 성패는 매수 타이밍보다 손절 관리와 원칙 준수에 달려 있습니다.<br/>
          작은 손실을 빠르게 인정할 수 있는 사람이 시장에서 장기적으로 살아남습니다.
        </p>
      </div>

      <div className="flex justify-center pt-4">
        <button 
          onClick={onClose}
          className="px-10 py-3.5 bg-white text-black rounded-xl font-black text-sm hover:scale-[1.03] active:scale-95 transition-all shadow-xl"
        >
          원칙을 숙지했습니다
        </button>
      </div>
    </div>
  );
}

function PrincipleCard({ icon, title, description, example, quote }: { icon: React.ReactNode, title: string, description: string, example?: string, quote?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 hover:bg-white/10 transition-all group">
      <div className="flex items-center gap-3">
        {icon}
        <h5 className="font-bold text-white text-sm">{title}</h5>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        {description}
      </p>
      {example && (
        <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> {example}
        </div>
      )}
      {quote && (
        <div className="text-[10px] text-rose-400 font-bold italic border-l-2 border-rose-500/50 pl-3 py-1">
          "{quote}"
        </div>
      )}
    </div>
  );
}

function PatternRow({ title, condition, entry, exit }: { title: string, condition: string, entry: string, exit: string }) {
  return (
    <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="text-xs font-black text-white">{title}</div>
        <div className="text-[10px] text-sleek-text-secondary">조건: {condition}</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-sleek-text-secondary uppercase mb-1">Entry</span>
          <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">{entry}</span>
        </div>
        <div className="h-6 w-px bg-white/10" />
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-sleek-text-secondary uppercase mb-1">Exit</span>
          <span className="text-[10px] font-bold text-sleek-blue px-2 py-0.5 bg-sleek-blue/10 rounded border border-sleek-blue/20">{exit}</span>
        </div>
      </div>
    </div>
  );
}
