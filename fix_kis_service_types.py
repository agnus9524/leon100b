import sys
import re

with open('src/services/kisService.ts', 'r') as f:
    content = f.read()

# Make getOverseasBuyableAmount return the full dummy type
# We know it exists at line 455
new_buyable = """  public async getOverseasBuyableAmount(symbol: string, price: string = '0', ovrsExchCd: string = 'NASD'): Promise<any> {
    return { rt_cd: '0', msg1: '', output: { max_ord_psbl_qty: '0', frcr_ord_psbl_amt1: '0', ord_psbl_frcr_amt: '0', frcr_ord_psbl_amt: '0', ovrs_ord_psbl_amt: '0', nrcy_buy_qty: '0', ord_psbl_qty: '0', max_buy_qty: '0', max_ord_qty: '0' } };
  }"""
content = re.sub(r"public async getOverseasBuyableAmount\(symbol: string, price: string = '0', ovrsExchCd: string = 'NASD'\) \{[\s\S]*?\}", new_buyable, content)

# Add missing methods at the end
closing_idx = content.rfind('}')
methods = """
  public async getOverseasPrice(symbol: string, excd?: string): Promise<any> { return null; }
  public async getOverseasBalance(): Promise<any> { return { rt_cd: '0', msg1: '', output1: [], output2: [], output3: {} }; }
  public async getOverseasOrderableCash(): Promise<any> { return { orderableUsd: 0, usdDeposit: 0, rt_cd: '0', msg1: '' }; }
  public async getOverseasHoldings(): Promise<any> { return { rt_cd: '0', msg1: '', output1: [], output2: [] }; }
  public async orderOverseas(symbol: string, qty: string, price: string, isBuy: boolean, excd: string = 'NASD'): Promise<any> { return { rt_cd: '0', msg1: 'Disabled', output: {} }; }
"""
content = content[:closing_idx] + methods + "\n}\n"

with open('src/services/kisService.ts', 'w') as f:
    f.write(content)
