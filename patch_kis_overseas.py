import sys

with open('src/services/kisService.ts', 'r') as f:
    content = f.read()

old_balance = """  public async getOverseasBalance() {
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    const endpoint = '/uapi/overseas-stock/v1/trading/inquire-present-balance';
    const isVirtual = !this.config.isRealOrderEnabled;
    const trId = isVirtual ? 'VTTS3012R' : 'TTTS3012R';"""

new_balance = """  public async getOverseasBalance() {
    return { rt_cd: '0', msg1: '', output1: [], output2: [], output3: {} };
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    const endpoint = '/uapi/overseas-stock/v1/trading/inquire-present-balance';
    const isVirtual = !this.config.isRealOrderEnabled;
    const trId = isVirtual ? 'VTTS3012R' : 'TTTS3012R';"""
    
old_cash = """  public async getOverseasOrderableCash() {
    if (!this.config) return { orderableUsd: 0, usdDeposit: 0, rt_cd: '1', msg1: "KIS Config not initialized" };
    try {
      const balanceData = await this.getOverseasBalance();"""

new_cash = """  public async getOverseasOrderableCash() {
    return { orderableUsd: 0, usdDeposit: 0, rt_cd: '0', msg1: '' };
    if (!this.config) return { orderableUsd: 0, usdDeposit: 0, rt_cd: '1', msg1: "KIS Config not initialized" };
    try {
      const balanceData = await this.getOverseasBalance();"""
      
if old_balance in content:
    content = content.replace(old_balance, new_balance)
if old_cash in content:
    content = content.replace(old_cash, new_cash)
    
with open('src/services/kisService.ts', 'w') as f:
    f.write(content)
