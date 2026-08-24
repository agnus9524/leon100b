import React from 'react';
import { motion } from 'motion/react';
import { 
  Bot, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  RefreshCw, 
  TrendingUp, 
  KeyRound, 
  Building2, 
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export interface StepItem {
  id: string;
  title: string;
  desc: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  detail?: string;
}

interface KisStartupVerificationProps {
  steps: StepItem[];
  progress: number;
  currentMessage: string;
  isReady: boolean;
  onEnter: () => void;
  onOpenConfig?: () => void;
  onRetry?: () => void;
  hasError?: boolean;
  errorMessage?: string;
}

export const KisStartupVerification: React.FC<KisStartupVerificationProps> = ({
  steps,
  progress,
  currentMessage,
  isReady,
  onEnter,
  onOpenConfig,
  onRetry,
  hasError = false,
  errorMessage
}) => {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Top Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400" />

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/30 border border-blue-500/40 flex items-center justify-center shadow-inner">
            <Bot className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-extrabold tracking-wider border border-blue-500/30">
                KIS OPEN API VERIFICATION
              </span>
              <span className="text-[11px] font-mono text-slate-400 font-medium">KRX REGULAR</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
              <span>한국투자증권 데이터 무결성 검증</span>
            </h2>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="mb-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-300 flex items-center gap-2">
              {hasError ? (
                <span className="text-rose-400 flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" /> 데이터 연동 실패
                </span>
              ) : isReady ? (
                <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 모든 실시간 데이터 동기화 완료
                </span>
              ) : (
                <span className="text-blue-400 flex items-center gap-1.5 font-bold animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" /> {currentMessage || "실시간 데이터 수신 중..."}
                </span>
              )}
            </span>
            <span className="font-mono font-black text-sm text-blue-400">
              {Math.min(100, Math.round(progress))}%
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <motion.div
              className={`h-full rounded-full transition-all duration-300 ${
                hasError 
                  ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)]' 
                  : isReady 
                    ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-400 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
              }`}
              style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
            />
          </div>
        </div>

        {/* Step-by-Step Validation List */}
        <div className="space-y-2.5 mb-7 max-h-[290px] overflow-y-auto pr-1 custom-scrollbar">
          {steps.map((step, idx) => {
            const isCompleted = step.status === 'success';
            const isLoading = step.status === 'loading';
            const isStepError = step.status === 'error';

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200'
                    : isLoading
                      ? 'bg-blue-500/10 border-blue-500/30 text-white shadow-sm'
                      : isStepError
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                        : 'bg-slate-950/40 border-slate-800/60 text-slate-400 opacity-60'
                }`}
              >
                <div className="mt-0.5">
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  ) : isLoading ? (
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </div>
                  ) : isStepError ? (
                    <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-[10px] font-mono font-bold">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                      {step.title}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        VERIFIED
                      </span>
                    )}
                    {isLoading && (
                      <span className="text-[10px] font-mono text-blue-400 font-bold px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 animate-pulse">
                        CHECKING...
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    {step.desc}
                  </p>
                  {step.detail && (
                    <p className="text-[10px] font-mono text-blue-300/80 mt-1 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                      {step.detail}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {hasError ? (
            <div className="flex items-center gap-2 w-full">
              {onOpenConfig && (
                <button
                  type="button"
                  onClick={onOpenConfig}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>KIS API 설정 확인</span>
                </button>
              )}
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>다시 검증하기</span>
                </button>
              )}
            </div>
          ) : isReady ? (
            <button
              type="button"
              onClick={onEnter}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5)] active:scale-[0.98] cursor-pointer"
            >
              <span>스캘퍼 터미널 시작하기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-full flex items-center justify-between text-slate-400 text-xs py-1">
              <span className="flex items-center gap-2 text-slate-400">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>안전한 자동매매를 위해 한국투자증권 실시간 데이터를 정밀 검증 중입니다.</span>
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
