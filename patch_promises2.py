import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# missingSymbols
old_missing = """        const addedStocks: Stock[] = await Promise.all(missingSymbols.map(async (sym) => {
          const isUSStock = /^[A-Z]/.test(sym);
          const stockMarket = isUSStock ? 'US' : 'KR';
          try {
            const p = await kisService.getPrice(sym);
            const resolvedName = (p && p.name && p.name !== sym) 
              ? p.name 
              : getResolvedStockName(sym, newStockNames[sym] ? { name: newStockNames[sym] } : undefined);
            if (p) {
              return {
                symbol: sym,
                name: resolvedName,
                price: p.current,
                change: p.change,
                changePercent: p.changePercent,
                volume: p.volume,
                history: [{ time: '09:00', price: p.current }],
                market: stockMarket,
                isAI: false
              };
            }
          } catch (e) {
            console.error(`Failed to fetch initial price for missing symbol ${sym}:`, e);
          }
          return null;
        }));"""

new_missing = """        const addedStocks: Stock[] = [];
        for (const sym of missingSymbols) {
          const isUSStock = /^[A-Z]/.test(sym);
          const stockMarket = isUSStock ? 'US' : 'KR';
          try {
            const p = await kisService.getPrice(sym);
            const resolvedName = (p && p.name && p.name !== sym) 
              ? p.name 
              : getResolvedStockName(sym, newStockNames[sym] ? { name: newStockNames[sym] } : undefined);
            if (p) {
              addedStocks.push({
                symbol: sym,
                name: resolvedName,
                price: p.current,
                change: p.change,
                changePercent: p.changePercent,
                volume: p.volume,
                history: [{ time: '09:00', price: p.current }],
                market: stockMarket,
                isAI: false
              });
            }
          } catch (e) {
            console.error(`Failed to fetch initial price for missing symbol ${sym}:`, e);
          }
          await new Promise(r => setTimeout(r, 200));
        }"""

if old_missing in content:
    content = content.replace(old_missing, new_missing)
    print("Patched missingSymbols")

# updatedStocks inside currentStocks 
old_updated = """          const updatedStocks = await Promise.all(currentStocks.map(async (s) => {
            try {
              const pData = await kisService.getPrice(s.symbol);
              if (pData) {
                return {
                  ...s,
                  price: pData.current,
                  change: pData.change,
                  changePercent: pData.changePercent,
                  volume: pData.volume,
                  isRealTime: true,
                  lastUpdated: new Date().toLocaleTimeString()
                };
              }
            } catch (err) {
              console.warn(`[Load] Price update failed for ${s.symbol}:`, err);
            }
            return s;
          }));"""

new_updated = """          const updatedStocks: Stock[] = [];
          for (const s of currentStocks) {
            try {
              const pData = await kisService.getPrice(s.symbol);
              if (pData) {
                updatedStocks.push({
                  ...s,
                  price: pData.current,
                  change: pData.change,
                  changePercent: pData.changePercent,
                  volume: pData.volume,
                  isRealTime: true,
                  lastUpdated: new Date().toLocaleTimeString()
                });
              } else {
                updatedStocks.push(s);
              }
            } catch (err) {
              console.warn(`[Load] Price update failed for ${s.symbol}:`, err);
              updatedStocks.push(s);
            }
            await new Promise(r => setTimeout(r, 200));
          }"""

if old_updated in content:
    content = content.replace(old_updated, new_updated)
    print("Patched currentStocks")

with open('src/App.tsx', 'w') as f:
    f.write(content)
