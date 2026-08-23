import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace Promise.all in missingSymbols
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
                volume: String(p.volume || '0'),
                history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: p.current * (0.98 + Math.random() * 0.04) })),
                market: stockMarket,
                isAI: false,
                isRealTime: true,
                lastUpdated: new Date().toLocaleTimeString()
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
                volume: String(p.volume || '0'),
                history: Array.from({ length: 40 }, (_, i) => ({ time: `${i}:00`, price: p.current * (0.98 + Math.random() * 0.04) })),
                market: stockMarket,
                isAI: false,
                isRealTime: true,
                lastUpdated: new Date().toLocaleTimeString()
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

# Replace Promise.all in Step 3
old_step3 = """      // Step 3: Fetch latest real-time market prices for current market stocks
      const currentStocks = stocksRef.current;
      if (currentStocks.length > 0) {
        try {
          const updatedStocks = await Promise.all(currentStocks.map(async (s) => {
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

new_step3 = """      // Step 3: Fetch latest real-time market prices for current market stocks
      const currentStocks = stocksRef.current;
      if (currentStocks.length > 0) {
        try {
          const updatedStocks: Stock[] = [];
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

if old_step3 in content:
    content = content.replace(old_step3, new_step3)
    print("Patched Step 3")

# Replace Promise.all in syncAllPrices
old_syncAll = """      const syncAllPrices = async () => {
        try {
          const currentStocks = stocksRef.current;
          if (currentStocks.length === 0) return;
          const updatedStocks = await Promise.all(currentStocks.map(async (s) => {
            try {
              const priceData = await kisService.getPrice(s.symbol);
              if (priceData) {
                const realPrice = priceData.current;
                const safeHist = Array.isArray(s.history) ? s.history : [];
                
                return {
                  ...s,
                  price: realPrice,
                  change: priceData.change,
                  changePercent: priceData.changePercent,
                  volume: priceData.volume,
                  isRealTime: true,
                  lastUpdated: new Date().toLocaleTimeString(),
                  history: [...safeHist.slice(1), { 
                    time: new Date().toLocaleTimeString('ko-KR', { hour12: false }), 
                    price: realPrice 
                  }]
                };
              }
            } catch (err) {
              // Fail silently for background sync
            }
            return s;
          }));"""

new_syncAll = """      const syncAllPrices = async () => {
        try {
          const currentStocks = stocksRef.current;
          if (currentStocks.length === 0) return;
          const updatedStocks: Stock[] = [];
          for (const s of currentStocks) {
            try {
              const priceData = await kisService.getPrice(s.symbol);
              if (priceData) {
                const realPrice = priceData.current;
                const safeHist = Array.isArray(s.history) ? s.history : [];
                
                updatedStocks.push({
                  ...s,
                  price: realPrice,
                  change: priceData.change,
                  changePercent: priceData.changePercent,
                  volume: priceData.volume,
                  isRealTime: true,
                  lastUpdated: new Date().toLocaleTimeString(),
                  history: [...safeHist.slice(1), { 
                    time: new Date().toLocaleTimeString('ko-KR', { hour12: false }), 
                    price: realPrice 
                  }]
                });
              } else {
                updatedStocks.push(s);
              }
            } catch (err) {
              // Fail silently for background sync
              updatedStocks.push(s);
            }
            await new Promise(r => setTimeout(r, 200));
          }"""

if old_syncAll in content:
    content = content.replace(old_syncAll, new_syncAll)
    print("Patched syncAllPrices")
    
# Add sleep to fetchHoldingsPrices
old_holdings = """          if (pData && pData.current > 0 && isSubscribed) {
            const liveName = pData.name || sym;
            const newStock: Stock = {"""

new_holdings = """          if (pData && pData.current > 0 && isSubscribed) {
            const liveName = pData.name || sym;
            const newStock: Stock = {"""
            
if old_holdings in content:
    # Just need to add sleep at end of try/catch block
    content = content.replace("        } catch (err) {\n          console.warn(`[Holdings Price Fetch] Error for ${sym}:`, err);\n        }\n      }", "        } catch (err) {\n          console.warn(`[Holdings Price Fetch] Error for ${sym}:`, err);\n        }\n        await new Promise(r => setTimeout(r, 200));\n      }")
    print("Patched fetchHoldingsPrices")

with open('src/App.tsx', 'w') as f:
    f.write(content)

