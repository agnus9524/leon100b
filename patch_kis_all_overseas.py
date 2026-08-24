import sys
import re

with open('src/services/kisService.ts', 'r') as f:
    content = f.read()

# getOverseasPrice
content = re.sub(
    r"public async getOverseasPrice\(.*?\) \{.*?\}",
    r"public async getOverseasPrice(symbol: string, excd?: string) {\n    return null;\n  }",
    content,
    flags=re.DOTALL
)

# getOverseasHoldings
content = re.sub(
    r"public async getOverseasHoldings\(\) \{.*?\}",
    r"public async getOverseasHoldings() {\n    return { rt_cd: '0', msg1: '', output1: [], output2: [] };\n  }",
    content,
    flags=re.DOTALL
)

# getOverseasBuyableAmount
content = re.sub(
    r"public async getOverseasBuyableAmount\(.*?\) \{.*?\}",
    r"public async getOverseasBuyableAmount(symbol: string, price: string = '0', ovrsExchCd: string = 'NASD') {\n    return { rt_cd: '0', msg1: '', output: { max_ord_psbl_qty: '0' } };\n  }",
    content,
    flags=re.DOTALL
)

# getOverseasMinuteChart
content = re.sub(
    r"public async getOverseasMinuteChart\(.*?\) \{.*?\}",
    r"public async getOverseasMinuteChart(symbol: string, excd: string = 'NAS', time: string = '') {\n    return { rt_cd: '0', msg1: '', output2: [] };\n  }",
    content,
    flags=re.DOTALL
)

with open('src/services/kisService.ts', 'w') as f:
    f.write(content)
