import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

old_func = """  const getResolvedStockName = useCallback((symbol: string, stockObj?: { name?: string }) => {
    if (!symbol) return '';

    // 1. Check customStockNames state
    if (customStockNames[symbol] && customStockNames[symbol] !== symbol) {
      return customStockNames[symbol];
    }

    // 2. Check passed stock object name
    if (stockObj?.name && stockObj.name !== symbol) {
      return stockObj.name;
    }

    // 3. Check current active stocks state
    const foundInStocks = stocks.find(s => s.symbol === symbol);
    if (foundInStocks?.name && foundInStocks.name !== symbol) {
      return foundInStocks.name;
    }

    // 4. Check stocksCache KR and US
    const foundInCacheKR = stocksCache?.KR?.find(s => s.symbol === symbol);
    if (foundInCacheKR?.name && foundInCacheKR.name !== symbol) {
      return foundInCacheKR.name;
    }
    const foundInCacheUS = stocksCache?.US?.find(s => s.symbol === symbol);
    if (foundInCacheUS?.name && foundInCacheUS.name !== symbol) {
      return foundInCacheUS.name;
    }

    // 5. Check INITIAL_STOCKS_KR
    const foundInInitKR = INITIAL_STOCKS_KR.find(s => s.symbol === symbol);
    if (foundInInitKR?.name && foundInInitKR.name !== symbol) {
      return foundInInitKR.name;
    }

    // 6. Check INITIAL_STOCKS (US)
    const foundInInitUS = INITIAL_STOCKS.find(s => s.symbol === symbol);
    if (foundInInitUS?.name && foundInInitUS.name !== symbol) {
      return foundInInitUS.name;
    }

    return symbol;
  }, [customStockNames, stocks, stocksCache]);"""

new_func = """  const getResolvedStockName = useCallback((symbol: string, stockObj?: { name?: string }) => {
    if (!symbol) return '';

    let resolved = symbol;

    if (customStockNames[symbol] && customStockNames[symbol] !== symbol) resolved = customStockNames[symbol];
    else if (stockObj?.name && stockObj.name !== symbol) resolved = stockObj.name;
    else {
      const foundInStocks = stocks.find(s => s.symbol === symbol);
      if (foundInStocks?.name && foundInStocks.name !== symbol) resolved = foundInStocks.name;
      else {
        const foundInCacheKR = stocksCache?.KR?.find(s => s.symbol === symbol);
        if (foundInCacheKR?.name && foundInCacheKR.name !== symbol) resolved = foundInCacheKR.name;
        else {
          const foundInCacheUS = stocksCache?.US?.find(s => s.symbol === symbol);
          if (foundInCacheUS?.name && foundInCacheUS.name !== symbol) resolved = foundInCacheUS.name;
          else {
            const foundInInitKR = INITIAL_STOCKS_KR.find(s => s.symbol === symbol);
            if (foundInInitKR?.name && foundInInitKR.name !== symbol) resolved = foundInInitKR.name;
            else {
              const foundInInitUS = INITIAL_STOCKS.find(s => s.symbol === symbol);
              if (foundInInitUS?.name && foundInInitUS.name !== symbol) resolved = foundInInitUS.name;
            }
          }
        }
      }
    }

    if (/^\\d+$/.test(symbol) && resolved !== symbol) {
      resolved = resolved.replace(/\\s*\\([A-Za-z0-9\\s,.-]+\\)\\s*$/, '').trim();
      resolved = resolved.replace(/\\s+[A-Za-z]+(\\s+[A-Za-z]+)*\\s*$/, '').trim();
    }
    
    return resolved;
  }, [customStockNames, stocks, stocksCache]);"""

content = content.replace(old_func, new_func)

# 2. Fix the overflow issue for search dropdown
# Old: <div className="flex items-center gap-2.5 flex-nowrap overflow-x-auto custom-scrollbar grow py-0.5">
# New: <div className="flex items-center gap-2.5 flex-wrap grow py-0.5">
old_div = '<div className="flex items-center gap-2.5 flex-nowrap overflow-x-auto custom-scrollbar grow py-0.5">'
new_div = '<div className="flex items-center gap-2.5 flex-wrap grow py-0.5 overflow-visible">'
content = content.replace(old_div, new_div)

# Also fix the inner container if needed:
# <div ref={searchRef} className="relative z-[100] w-36 sm:w-44 md:w-48 shrink-0">
# The z-[100] should be enough if the parent is not overflow-hidden.
# However, sometimes if parent has a z-index lower than next sibling, the dropdown gets hidden.
# Let's ensure z-[100] is on the dropdown and its parents.
old_parent = '<div className="relative z-[90] bg-gradient-to-br from-slate-900/95 via-slate-900/98 to-slate-950/95 border border-slate-700/60 p-3 sm:p-3.5 rounded-3xl shadow-2xl backdrop-blur-xl">'
new_parent = '<div className="relative z-[110] bg-gradient-to-br from-slate-900/95 via-slate-900/98 to-slate-950/95 border border-slate-700/60 p-3 sm:p-3.5 rounded-3xl shadow-2xl backdrop-blur-xl">'
content = content.replace(old_parent, new_parent)

with open('src/App.tsx', 'w') as f:
    f.write(content)
