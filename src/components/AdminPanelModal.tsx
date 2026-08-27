import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Key, 
  RefreshCw, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Download, 
  ShieldCheck, 
  Clock, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  allLicenses: any[];
  allAuthKeys: any[];
  isLoading: boolean;
  onRefresh: () => void;
  onGenerateKey: () => void;
  onUpdateStatus: (userId: string, newStatus: 'active' | 'suspended', currentData?: any) => void;
  onExtendLicense: (userId: string, days?: number, currentData?: any) => void;
  onDeleteLicense: (userId: string) => void;
  onDeleteAuthKey: (keyId: string) => void;
  onExportCSV: () => void;
  adminTab: 'users' | 'keys';
  setAdminTab: (tab: 'users' | 'keys') => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  allLicenses,
  allAuthKeys,
  isLoading,
  onRefresh,
  onGenerateKey,
  onUpdateStatus,
  onExtendLicense,
  onDeleteLicense,
  onDeleteAuthKey,
  onExportCSV,
  adminTab,
  setAdminTab,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const handleCopy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  } catch (e) {
    console.error(e);
  }
};

  const filteredLicenses = allLicenses.filter(lic => {
    const term = searchTerm.toLowerCase();
    const email = (lic.email || '').toLowerCase();
    const id = (lic.userId || lic.id || '').toLowerCase();
    const key = (lic.key || '').toLowerCase();
    return email.includes(term) || id.includes(term) || key.includes(term);
  });

  const filteredKeys = allAuthKeys.filter(k => {
    const term = searchTerm.toLowerCase();
    const id = (k.id || '').toLowerCase();
    const usedBy = (k.usedBy || '').toLowerCase();
    return id.includes(term) || usedBy.includes(term);
  });

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[999999] flex items-start justify-center p-3 sm:p-5 pt-6 sm:pt-10 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -20 }}
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white relative"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">슈퍼 관리자 패널</h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                전체 라이선스 회원 현황 조회, 승인/연장 및 30일 전용 인증키 발급·관리
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold"
              title="데이터 새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">새로고침</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAdminTab('users')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                adminTab === 'users'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>회원 라이선스 ({allLicenses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('keys')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                adminTab === 'keys'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>인증키 목록 ({allAuthKeys.length})</span>
            </button>
          </div>

          {/* Search and Action Buttons */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={adminTab === 'users' ? '이메일, UID, 키 검색...' : '인증키, UID 검색...'}
              className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all w-full sm:w-48"
            />

            {adminTab === 'keys' && (
              <button
                type="button"
                onClick={onGenerateKey}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>30일 키 발급</span>
              </button>
            )}

            <button
              type="button"
              onClick={onExportCSV}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
              title="CSV 파일로 다운로드"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">CSV 내보내기</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-sm font-bold text-slate-400">데이터를 불러오는 중입니다...</p>
            </div>
          ) : adminTab === 'users' ? (
            /* Users Table */
            filteredLicenses.length === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-sm font-bold">등록된 라이선스 회원이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px]">
                        <th className="py-2.5 px-3">사용자 / UID</th>
                        <th className="py-2.5 px-3">상태</th>
                        <th className="py-2.5 px-3">만료일</th>
                        <th className="py-2.5 px-3">적용 인증키</th>
                        <th className="py-2.5 px-3 text-right">관리 작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredLicenses.map((lic) => {
                        const uid = lic.userId || lic.id || '';
                        const isExpired = lic.expiresAt ? new Date(lic.expiresAt).getTime() < Date.now() : false;
                        const isActive = lic.status === 'active' && !isExpired;

                        return (
                          <tr key={uid} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-sans font-bold text-white text-xs">{lic.email || '익명/미입력'}</div>
                              <div className="text-[10px] text-slate-500">{uid}</div>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                {isActive ? '활성 (정상)' : isExpired ? '기간 만료' : '중지됨'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <span>{lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : '설정 없음'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-400 text-[11px]">
                              {lic.key || '-'}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 font-sans">
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => onUpdateStatus(uid, lic.status === 'active' ? 'suspended' : 'active', lic)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50 ${
                                    lic.status === 'active' 
                                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30' 
                                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                                  }`}
                                >
                                  {lic.status === 'active' ? '중지' : '활성화'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => onExtendLicense(uid, 30, lic)}
                                  className="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                  title="30일 연장"
                                >
                                  +30일 연장
                                </button>
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => onDeleteLicense(uid)}
                                  className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                                  title="라이선스 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            /* Keys Table */
            filteredKeys.length === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-sm font-bold">생성된 인증키가 없습니다. 우측 상단의 [30일 키 발급] 버튼을 눌러보세요.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px]">
                        <th className="py-2.5 px-3">인증키 (Auth Key)</th>
                        <th className="py-2.5 px-3">유효 기간</th>
                        <th className="py-2.5 px-3">사용 여부</th>
                        <th className="py-2.5 px-3">사용자 UID</th>
                        <th className="py-2.5 px-3 text-right">관리 작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredKeys.map((k) => (
                        <tr key={k.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-400 tracking-wider text-xs">{k.id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(k.id)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                                title="인증키 복사"
                              >
                                {copiedKey === k.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>{k.durationDays || 30}일</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              k.used 
                                ? 'bg-slate-700 text-slate-400 border border-slate-600' 
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {k.used ? '사용 완료' : '미사용 (사용 가능)'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400 text-[11px]">
                            {k.usedBy || '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-sans">
                            <button
                              type="button"
                              onClick={() => onDeleteAuthKey(k.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 transition-all"
                              title="인증키 폐기"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div>
            총 <strong className="text-white">{allLicenses.length}</strong>명 회원 / <strong className="text-white">{allAuthKeys.length}</strong>개 인증키
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
          >
            닫기
          </button>
        </div>
      </motion.div>
    </div>
  );
};
