import sys

with open('src/services/kisService.ts', 'r') as f:
    content = f.read()

# Add queue logic at the top of getPrice
old_getPrice = """  public async getPrice(symbol: string): Promise<NormalizedPrice | null> {
    // Determine if KR or US (approximate)"""

new_getPrice = """  private static priceQueue: Promise<void> = Promise.resolve();

  public async getPrice(symbol: string): Promise<NormalizedPrice | null> {
    // Serialize and throttle requests to prevent 429
    const delay = () => new Promise(r => setTimeout(r, 200));
    const release = await new Promise<() => void>(resolve => {
      const next = () => resolve(() => {});
      KisService.priceQueue = KisService.priceQueue.then(async () => {
        next();
        await delay();
      });
    });

    try {
      return await this._getPriceInternal(symbol);
    } finally {
      release();
    }
  }

  private async _getPriceInternal(symbol: string): Promise<NormalizedPrice | null> {
    // Determine if KR or US (approximate)"""

if old_getPrice in content:
    content = content.replace(old_getPrice, new_getPrice)
    print("Patched getPrice with queue")
else:
    print("Could not find getPrice")

# Also let's fix getExchangeRate retry logic inside kisService.ts
old_exchange = """    for (const trial of trials) {
      try {
        const headers: any = {"""

new_exchange = """    for (const trial of trials) {
      try {
        const headers: any = {"""
        
with open('src/services/kisService.ts', 'w') as f:
    f.write(content)
