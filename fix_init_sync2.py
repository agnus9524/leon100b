import sys
import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Make the start button always start the app unconditionally, ignoring KIS connect or sync
content = re.sub(
    r"""              <button 
                onClick=\{.*?\}
                disabled=\{.*?\}
                className=\{.*?\}
              >
                .*?
              </button>""",
    """              <button 
                onClick={() => setIsAppInitialized(true)}
                className="w-full py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg transition-all flex items-center justify-center gap-3 group bg-sleek-blue text-white shadow-[0_10px_30px_-10px_rgba(30,144,255,0.5)] hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Zap className="w-5 h-5 fill-white group-hover:animate-bounce" />
                <span>정보 업데이트 및 시스템 가동</span>
              </button>""",
    content,
    flags=re.DOTALL
)

# And make the UI not conditionally render based on isAppInitialized (or at least let the button work)
with open('src/App.tsx', 'w') as f:
    f.write(content)
