import sys

with open('src/services/kisService.ts', 'r') as f:
    lines = f.readlines()

for i, l in enumerate(lines):
    if "return this.orderOverseas(symbol, side, price, qty);" in l:
        lines[i] = "      return this.orderOverseas(symbol, qty, price, side === 'BUY');\n"
        break

with open('src/services/kisService.ts', 'w') as f:
    f.writelines(lines)
