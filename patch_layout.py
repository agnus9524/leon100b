import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Search block
content = content.replace(
    'div ref={searchRef} className="relative z-[100] w-36 sm:w-44 md:w-48 shrink-0"',
    'div ref={searchRef} className="relative z-[100] w-full sm:w-44 md:w-48 shrink-0"'
)

# 2. Selected stock info
content = content.replace(
    'div className="w-[180px] sm:w-[220px] md:w-[240px] shrink-0 flex flex-col justify-center overflow-hidden"',
    'div className="w-full sm:w-[220px] md:w-[240px] shrink-0 flex flex-col justify-center overflow-hidden"'
)

# 3. Current Price block
content = content.replace(
    'div className="min-w-[195px] sm:min-w-[225px] shrink-0 bg-black/70 px-3 py-2 rounded-2xl border border-white/20 shadow-xl flex flex-col justify-center gap-1.5 backdrop-blur-md"',
    'div className="w-full sm:w-auto sm:min-w-[225px] shrink-0 bg-black/70 px-3 py-2 rounded-2xl border border-white/20 shadow-xl flex flex-col justify-center gap-1.5 backdrop-blur-md"'
)

# 4. Stat 1 (당일 가격 제한폭)
content = content.replace(
    'div className="shrink-0 bg-black/40 px-2.5 py-1.5 rounded-2xl border border-white/10 flex flex-col justify-between min-w-[140px] text-xs"',
    'div className="w-full sm:w-auto shrink-0 bg-black/40 px-2.5 py-1.5 rounded-2xl border border-white/10 flex flex-col justify-between min-w-[140px] text-xs"'
)

# 5. Stat 2 (호가 총 잔량 비율)
content = content.replace(
    'div className="shrink-0 bg-black/40 px-2.5 py-1.5 rounded-2xl border border-white/10 flex flex-col justify-between min-w-[160px] text-xs"',
    'div className="w-full sm:w-auto shrink-0 bg-black/40 px-2.5 py-1.5 rounded-2xl border border-white/10 flex flex-col justify-between min-w-[160px] text-xs"'
)

# 6. Stat 3 (실시간 누적 거래량)
content = content.replace(
    'div className="shrink-0 bg-black/40 px-2.5 py-1.5 rounded-2xl border border-white/10 flex flex-col justify-between min-w-[135px] text-xs"',
    'div className="w-full sm:w-auto shrink-0 bg-black/40 px-2.5 py-1.5 rounded-2xl border border-white/10 flex flex-col justify-between min-w-[135px] text-xs"'
)

# 7. Stat 4 (AI 스캘핑 점수)
content = content.replace(
    'div className="shrink-0 bg-black/40 px-2.5 py-1.5 rounded-2xl border border-white/10 flex flex-col justify-between min-w-[130px] text-xs"',
    'div className="w-full sm:w-auto shrink-0 bg-black/40 px-2.5 py-1.5 rounded-2xl border border-white/10 flex flex-col justify-between min-w-[130px] text-xs"'
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Patched layout classes")
