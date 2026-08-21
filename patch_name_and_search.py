import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Update getResolvedStockName to strip English suffixes from Korean stocks.
marker = "return symbol;"
idx = content.find(marker, content.find("const getResolvedStockName"))
if idx != -1:
    replacement = """
    let resolved = symbol;
    if (customStockNames[symbol] && customStockNames[symbol] !== symbol) resolved = customStockNames[symbol];
    else if (stockObj?.name && stockObj.name !== symbol) resolved = stockObj.name;
    else if (foundInStocks?.name && foundInStocks.name !== symbol) resolved = foundInStocks.name;
    else if (foundInCacheKR?.name && foundInCacheKR.name !== symbol) resolved = foundInCacheKR.name;
    else if (foundInCacheUS?.name && foundInCacheUS.name !== symbol) resolved = foundInCacheUS.name;
    else if (foundInInitKR?.name && foundInInitKR.name !== symbol) resolved = foundInInitKR.name;
    else if (foundInInitUS?.name && foundInInitUS.name !== symbol) resolved = foundInInitUS.name;
    
    // Strip English from Korean stock names (e.g. "삼성전자(Samsung Electronics)" or "삼성전자 Samsung")
    if (/^\d+$/.test(symbol) && resolved) {
      resolved = resolved.replace(/\s*\([A-Za-z0-9\s,.-]+\)\s*$/, '').trim();
      resolved = resolved.replace(/\s+[A-Za-z]+(\s+[A-Za-z]+)*\s*$/, '').trim();
    }
    return resolved;
"""
    # we need to remove the existing return logic up to `return symbol;`
    # Let's replace the whole function instead to be safe.
