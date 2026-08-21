import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

start_marker = "/* Individual Slot Mode (개별 모드 - 매수진입/체결 및 매도싸인만 표시) */"
end_marker = "})()"

start_idx = content.find(start_marker)
if start_idx == -1:
    print("Start marker not found")
    sys.exit(1)

# Find the specific end_marker corresponding to this block
# We know it ends before "// 2. Real-time Gap Monitor Gauge"
next_section = content.find("{/* 2. Real-time Gap Monitor Gauge */}", start_idx)
end_idx = content.rfind("})()", start_idx, next_section) + 4

if end_idx == -1 or end_idx < start_idx:
    print("End marker not found")
    sys.exit(1)

replacement = """/* Individual Slot Mode (개별 모드 - 매수진입/체결 및 매도싸인만 표시) */
                      (() => {
                        const stockPendingBuys = pendingBuyOrders.filter(p => p.symbol === currentStock?.symbol);
                        const stockPendingSells = pendingSellOrders.filter(p => p.symbol === currentStock?.symbol);
                        
                        const allLogItems: React.ReactNode[] = [];
                        let slotCounter = 1;

                        stockPendingBuys.forEach((pb, idx) => {
                          allLogItems.push(
                            <div key={`pb-${pb.id || idx}`} className="text-[11px] font-mono text-white mb-2.5 leading-relaxed bg-black/20 p-2 rounded border border-white/5">
                              <div className="font-bold opacity-90">{currentStock?.name}(매수주문 #{slotCounter++})</div>
                              <div className="text-amber-400 mt-0.5">매수주문가 {formatCurrency(pb.orderPrice)}</div>
                            </div>
                          );
                        });

                        currentInventory.forEach((inv, idx) => {
                          const buyPrice = typeof inv === 'number' ? inv : (inv.price || 0);
                          const pSell = stockPendingSells.find(s => s.slotId === (inv as any).id);
                          if (pSell) {
                            allLogItems.push(
                              <div key={`inv-${idx}`} className="text-[11px] font-mono text-white mb-2.5 leading-relaxed bg-black/20 p-2 rounded border border-white/5">
                                <div className="font-bold opacity-90">{currentStock?.name}(매도주문 #{slotCounter++})</div>
                                <div className="text-rose-400 mt-0.5">목표가 {formatCurrency(pSell.orderPrice)}</div>
                              </div>
                            );
                          } else {
                            allLogItems.push(
                              <div key={`inv-${idx}`} className="text-[11px] font-mono text-white mb-2.5 leading-relaxed bg-black/20 p-2 rounded border border-white/5">
                                <div className="font-bold opacity-90">{currentStock?.name}(매수 #{slotCounter++})</div>
                                <div className="text-emerald-400 mt-0.5">매수가 {formatCurrency(buyPrice)}</div>
                              </div>
                            );
                          }
                        });

                        const recentSellFills = tradeLogs.filter(log => log.symbol === currentStock?.symbol && (log.type === 'SELL' || log.type === '매도') && (log.reason?.includes('체결') || log.reason?.includes('익절'))).slice(0, 5);

                        recentSellFills.forEach((log, idx) => {
                          let profitDisplay = "";
                          const pnlMatch = log.reason.match(/순익\s*([+-]?[\d.,]+(?:원|%))/);
                          if (pnlMatch) profitDisplay = ` 순익 ${pnlMatch[1]}`;
                          else if (log.reason.includes('익절')) profitDisplay = ` (익절)`;
                          else if (log.reason.includes('손절')) profitDisplay = ` (손절)`;
                          
                          allLogItems.push(
                            <div key={`sell-${idx}`} className="text-[11px] font-mono text-white mb-2.5 leading-relaxed bg-black/20 p-2 rounded border border-white/5 opacity-80">
                              <div className="font-bold opacity-90">{currentStock?.name}(매도 #{slotCounter++})</div>
                              <div className="text-sky-400 mt-0.5">
                                매도가 {formatCurrency(log.price)} <span className="text-emerald-400 ml-1">{profitDisplay}</span>
                              </div>
                            </div>
                          );
                        });

                        if (allLogItems.length === 0) {
                          return (
                            <div className="text-[10px] text-gray-500 text-center py-2 font-mono">
                              {currentStock?.name || '선택'} 종목의 매수/매도 진행 로그가 없습니다.
                            </div>
                          );
                        }
                        return <div>{allLogItems}</div>;
                      })()"""

new_content = content[:start_idx] + replacement + content[end_idx:]

with open('src/App.tsx', 'w') as f:
    f.write(new_content)

print("Patch successful!")
