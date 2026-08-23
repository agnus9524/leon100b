import sys
import re

with open('src/services/kisService.ts', 'r') as f:
    content = f.read()

# 1. Modify price queue delay and remove US stock fetching from _getPriceInternal
old_getPrice = """  public async getPrice(symbol: string): Promise<NormalizedPrice | null> {
    // Serialize and throttle requests to prevent 429
    const delay = () => new Promise(r => setTimeout(r, 200));"""

new_getPrice = """  public async getPrice(symbol: string): Promise<NormalizedPrice | null> {
    // Serialize and throttle requests to prevent 429
    const delay = () => new Promise(r => setTimeout(r, 600));"""
content = content.replace(old_getPrice, new_getPrice)

old_internal = """  private async _getPriceInternal(symbol: string): Promise<NormalizedPrice | null> {
    // Determine if KR or US (approximate)
    const isKR = /^\\d{6}$/.test(symbol);
    try {
      if (isKR) {
        const data = await this.getDomesticPrice(symbol);
        if (!data) return null;
        
        return {
          current: Number(data.stck_prpr),
          prevClose: Number(data.stck_sdpr),
          change: Number(data.prdy_vrss),
          changePercent: Number(data.prdy_ctrt),
          volume: data.acml_vol || '0',
          name: data.hts_kor_isnm || undefined
        };
      } else {
        const data = await this.getOverseasPrice(symbol);
        if (!data) return null;
        
        const current = Number(data.last);
        const prevClose = Number(data.base);
        const change = Number(data.diff || (current - prevClose));
        const changePercent = Number(data.rate || (prevClose > 0 ? (change / prevClose) * 100 : 0));
        
        return {
          current,
          prevClose,
          change,
          changePercent,
          volume: data.tvol || '0',
          name: data.name || undefined
        };
      }
    } catch (error) {
      console.warn(`[KIS Service] Failed to get price for ${symbol}`, error);
      return null;
    }
  }"""

new_internal = """  private async _getPriceInternal(symbol: string): Promise<NormalizedPrice | null> {
    // Determine if KR or US (approximate) - now strictly KR
    const isKR = /^\\d{6}$/.test(symbol);
    if (!isKR) {
      console.warn(`[KIS Service] Overseas stocks are no longer supported. Skipping ${symbol}`);
      return null;
    }
    
    try {
      const data = await this.getDomesticPrice(symbol);
      if (!data) return null;
      
      return {
        current: Number(data.stck_prpr),
        prevClose: Number(data.stck_sdpr),
        change: Number(data.prdy_vrss),
        changePercent: Number(data.prdy_ctrt),
        volume: data.acml_vol || '0',
        name: data.hts_kor_isnm || undefined
      };
    } catch (error) {
      console.warn(`[KIS Service] Failed to get price for ${symbol}`, error);
      return null;
    }
  }"""

content = content.replace(old_internal, new_internal)

# 2. Modify getBalance to not call overseas
old_balance = """  public async getBalance() {
    // Current API points to Domestic Balance as requested
    return this.getDomesticBalance();
  }"""

# it already returns domestic balance!

with open('src/services/kisService.ts', 'w') as f:
    f.write(content)
print("Patched kisService overseas logic")
