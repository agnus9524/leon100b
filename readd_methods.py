import sys

with open('src/services/kisService.ts', 'r') as f:
    content = f.read()

# Add them right before the last `}`
closing_idx = content.rfind('}')

methods = """
  public async getOverseasPrice(symbol: string, excd?: string) { return null; }
  public async getOverseasBalance() { return { rt_cd: '0', msg1: '', output1: [], output2: [], output3: {} }; }
  public async getOverseasOrderableCash() { return { orderableUsd: 0, usdDeposit: 0, rt_cd: '0', msg1: '' }; }
  public async getOverseasHoldings() { return { rt_cd: '0', msg1: '', output1: [], output2: [] }; }
  public async getOverseasBuyableAmount(symbol: string, price: string = '0', ovrsExchCd: string = 'NASD') {
    return { rt_cd: '0', msg1: '', output: { max_ord_psbl_qty: '0', frcr_ord_psbl_amt1: '0', ord_psbl_frcr_amt: '0', frcr_ord_psbl_amt: '0', ovrs_ord_psbl_amt: '0', nrcy_buy_qty: '0', ord_psbl_qty: '0', max_buy_qty: '0', max_ord_qty: '0' } };
  }
  public async getOverseasMinuteChart(symbol: string, excd: string = 'NAS', time: string = '') { return { rt_cd: '0', msg1: '', output2: [] }; }
  public async orderOverseas(symbol: string, qty: string, price: string, isBuy: boolean, excd: string = 'NASD') { return { rt_cd: '0', msg1: 'Disabled', output: {} }; }
"""

new_content = content[:closing_idx] + methods + content[closing_idx:]

with open('src/services/kisService.ts', 'w') as f:
    f.write(new_content)
