import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_button_area = """                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* 종목추가 버튼 & 카운트 */}
                    <button
                      type="button"
                      onClick={() => {"""

new_button_area = """                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* AI 추천종목 찾기 딥리서치 버튼 */}
                    <button
                      type="button"
                      onClick={handleRefreshScalperTop3}
                      disabled={isRefreshingTop3}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 text-[10.5px] font-black font-mono flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 disabled:opacity-50"
                      title="실시간 거래량 및 추세를 딥리서치 분석하여 AI 추천종목을 갱신합니다."
                    >
                      {isRefreshingTop3 ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                      <span>{isRefreshingTop3 ? "딥리서치 분석중..." : "추천종목 찾기"}</span>
                    </button>
                    {/* 종목추가 버튼 & 카운트 */}
                    <button
                      type="button"
                      onClick={() => {"""

if old_button_area in content:
    content = content.replace(old_button_area, new_button_area)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched UI successfully.")
else:
    print("Could not find the UI area.")
