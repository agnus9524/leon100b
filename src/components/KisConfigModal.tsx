import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  KeyRound, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  X, 
  RefreshCw, 
  Trash2, 
  ExternalLink,
  Lock,
  Cpu,
  Zap,
  Building2
} from 'lucide-react';

interface KisConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  kisConfig: {
    appKey: string;
    appSecret: string;
    accountNo: string;
    accountCode?: string;
    accountPw: string;
    isConnected: boolean;
    domesticOrderType?: string;
    isRealOrderEnabled?: boolean;
  };
  setKisConfig: React.Dispatch<React.SetStateAction<any>>;
  onTestConnection: () => Promise<void>;
  onConnect: () => Promise<void>;
  onReset: () => Promise<void>;
  botStatus: string;
}

export const KisConfigModal: React.FC<KisConfigModalProps> = ({
  isOpen,
  onClose,
  kisConfig,
  setKisConfig,
  onTestConnection,
  onConnect,
  onReset,
  botStatus,
}) => {
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'guide'>('config');

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await onTestConnection();
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onConnect();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white tracking-tight">한국투자증권(KIS) 연동 설정</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    kisConfig.isConnected 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {kisConfig.isConnected ? '● 연동 완료' : '○ 미연동'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">실시간 호가 수신, 잔고 동기화 및 초단타 스캘핑 자동매매 API 연동</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/30 gap-4">
            <button
              onClick={() => setActiveTab('config')}
              className={`py-3 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'config'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              API 키 및 계좌 설정
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`py-3 text-xs font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'guide'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              KIS API 발급 안내
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
            {activeTab === 'config' ? (
              <>
                {/* Security Badge */}
                <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-slate-300">
                  <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">종단간 보안 암호화 보관</span>
                    <span className="text-[11px] text-slate-400">
                      입력하신 APP KEY 및 계좌 비밀번호는 안전하게 처리되며 증권사 실거래 주문 및 잔고 조회에만 사용됩니다.
                    </span>
                  </div>
                </div>

                {/* App Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                    <span>APP KEY (한국투자증권 발급 키) <span className="text-rose-400">*</span></span>
                    <span className="text-[11px] font-normal text-slate-400 font-mono">36자리 문자열</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={kisConfig.appKey || ''}
                      onChange={(e) => setKisConfig((prev: any) => ({ ...prev, appKey: e.target.value.trim() }))}
                      placeholder="PS..."
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 font-mono outline-none transition-all"
                    />
                  </div>
                </div>

                {/* App Secret */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                    <span>APP SECRET <span className="text-rose-400">*</span></span>
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showSecret ? '숨기기' : '보기'}</span>
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={kisConfig.appSecret || ''}
                      onChange={(e) => setKisConfig((prev: any) => ({ ...prev, appSecret: e.target.value.trim() }))}
                      placeholder="App Secret 문자열을 입력하세요"
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 font-mono outline-none transition-all pr-10"
                    />
                  </div>
                </div>

                {/* Account Number & Product Code */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-black text-slate-300">
                      계좌번호 (앞 8자리) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      value={kisConfig.accountNo || ''}
                      onChange={(e) => setKisConfig((prev: any) => ({ ...prev, accountNo: e.target.value.replace(/[^0-9]/g, '') }))}
                      placeholder="예: 44431721"
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 font-mono outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-300">
                      상품코드 (뒤 2자리)
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={kisConfig.accountCode || '01'}
                      onChange={(e) => setKisConfig((prev: any) => ({ ...prev, accountCode: e.target.value.trim() }))}
                      placeholder="01"
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono text-center outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Account Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                    <span>계좌 비밀번호 (4자리) <span className="text-rose-400">*</span></span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? '숨기기' : '보기'}</span>
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      maxLength={8}
                      value={kisConfig.accountPw || ''}
                      onChange={(e) => setKisConfig((prev: any) => ({ ...prev, accountPw: e.target.value.trim() }))}
                      placeholder="계좌 개설 시 설정한 4자리 비밀번호"
                      className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 font-mono outline-none transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    * 잔고 조회 및 실시간 매수/매도 주문 전송 시 증권사 인증에 필수적입니다.
                  </p>
                </div>

                {/* Status indicator */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">현재 통신 상태:</span>
                  <span className="font-mono font-bold text-blue-400">{botStatus}</span>
                </div>
              </>
            ) : (
              /* Guide Tab */
              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <h4 className="font-black text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-[11px]">1</span>
                    한국투자증권 KIS Developers 접속
                  </h4>
                  <p className="text-slate-400 pl-7 text-[11px]">
                    한국투자증권 OpenAPI 포털(<a href="https://apiportal.koreainvestment.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline inline-flex items-center gap-0.5">apiportal.koreainvestment.com <ExternalLink className="w-2.5 h-2.5" /></a>)에 로그인합니다.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <h4 className="font-black text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-[11px]">2</span>
                    Koreainvestment Developers 앱 등록
                  </h4>
                  <p className="text-slate-400 pl-7 text-[11px]">
                    [API 신청/관리] 메뉴에서 [앱 등록]을 진행하고, 발급받은 실거래 <strong>App Key</strong>와 <strong>App Secret</strong>을 복사하여 위 입력창에 붙여넣습니다.
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <h4 className="font-black text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-[11px]">3</span>
                    계좌번호 및 비밀번호 입력
                  </h4>
                  <p className="text-slate-400 pl-7 text-[11px]">
                    본인의 8자리 종합위탁 계좌번호와 4자리 계좌 비밀번호를 입력하고 [연결 테스트]를 통해 잔고 조회가 정상 작동하는지 확인합니다.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/80">
            <button
              type="button"
              onClick={onReset}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-bold transition-all border border-slate-700/80 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>설정 초기화</span>
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !kisConfig.appKey || !kisConfig.appSecret}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-blue-400' : ''}`} />
                <span>{isTesting ? '연결 확인 중...' : '연결 테스트'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !kisConfig.appKey || !kisConfig.appSecret || !kisConfig.accountNo}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSaving ? '저장 중...' : '계좌 연동 저장'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
