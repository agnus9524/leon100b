import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

holdings_block = """              {/* Current Holdings Summary */}
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

# Find the exact string in the file to remove it
idx_old = content.find(holdings_block)
if idx_old != -1:
    content = content[:idx_old] + content[idx_old+len(holdings_block):]
    print("Found and removed from old location.")
else:
    print("Could not find the holdings block in the old location!")

# Wait, the indentation might be slightly different. Let's just remove anything between {/* Current Holdings Summary */} and {/* Country Tabs (한국 | 미국 | 기타) */}
start_marker = "              {/* Current Holdings Summary */}"
end_marker = "              {/* Country Tabs (한국 | 미국 | 기타) */}"

idx_start = content.find(start_marker)
idx_end = content.find(end_marker)

if idx_start != -1 and idx_end != -1 and idx_start < idx_end:
    extracted = content[idx_start:idx_end]
    content = content[:idx_start] + content[idx_end:]
    print("Removed via markers.")
else:
    extracted = holdings_block
    print("Failed to remove via markers, using hardcoded block.")

# Now we want to insert it after the grid.
# The grid ends with:
#                     </select>
#                   </div>
#                 </div>
#               </div>
#             </div>
grid_end_marker = """                    </select>
                  </div>
                </div>
              </div>
            </div>"""
idx_grid_end = content.find(grid_end_marker)
if idx_grid_end != -1:
    insert_pos = idx_grid_end + len(grid_end_marker)
    # Let's adjust styling a bit for the main screen layout
    # Change bg-slate-800/40 to bg-black/40
    # Add max-h to 240px instead of 120px, md:grid-cols-4 or 5
    # The extracted block needs replacing:
    modified = extracted.replace("max-h-[120px]", "max-h-[180px]")
    modified = modified.replace("bg-slate-800/40", "bg-black/40")
    modified = modified.replace("md:grid-cols-3", "md:grid-cols-4 lg:grid-cols-5")
    modified = modified.replace("mb-2 shrink-0", "mt-2 shrink-0 w-full")
    
    content = content[:insert_pos] + "\n\n" + modified + "\n" + content[insert_pos:]
    print("Inserted in new location.")
else:
    print("Could not find grid end marker.")

with open('src/App.tsx', 'w') as f:
    f.write(content)

