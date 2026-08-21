import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

marker = "{/* Country Tabs (한국 | 미국 | 기타) */}"

idx = content.find(marker)
if idx == -1:
    print("Marker not found")
    sys.exit(1)

injection = """
              {/* Current Holdings Summary */}
              {(() => {
                const heldSymbols = Object.keys(holdings).filter(sym => holdings[sym] > 0);
                if (heldSymbols.length === 0) return null;
                
                return (
                  <div className="bg-slate-800/40 rounded-2xl p-3 border border-slate-700/50 mb-2 shrink-0">
                    <div className="text-xs font-bold text-slate-400 mb-2 px-1">보유 종목 현황</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto max-h-[120px] custom-scrollbar pr-1">
                      {heldSymbols.map(sym => {
                        const qty = holdings[sym];
                        const avgP = avgPrices[sym] || 0;
                        const st = stocks.find(s => s.symbol === sym) || INITIAL_STOCKS_KR.find(s => s.symbol === sym) || INITIAL_STOCKS.find(s => s.symbol === sym);
                        const currentP = st?.price || avgP;
                        const pnlPct = avgP > 0 ? ((currentP - avgP) / avgP) * 100 : 0;
                        const pnlAmt = (currentP - avgP) * qty;
                        
                        return (
                          <div key={sym} className="flex items-center justify-between bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                            <div className="truncate pr-2">
                              <div className="font-bold text-[13px] text-white truncate">{st?.name || sym}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{qty.toLocaleString()}주 · 평단 {formatCurrency(avgP)}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className={cn("text-[11px] font-bold font-mono", pnlPct > 0 ? "text-rose-400" : pnlPct < 0 ? "text-sky-400" : "text-slate-300")}>
                                {pnlPct > 0 ? "+" : ""}{formatCurrency(pnlAmt)}
                              </div>
                              <div className={cn("text-[10px] font-mono mt-0.5", pnlPct > 0 ? "text-rose-400/80" : pnlPct < 0 ? "text-sky-400/80" : "text-slate-400")}>
                                {pnlPct > 0 ? "+" : ""}{pnlPct.toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              """

new_content = content[:idx] + injection + content[idx:]

with open('src/App.tsx', 'w') as f:
    f.write(new_content)

print("Patch successful!")
