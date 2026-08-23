import sys

with open('src/services/kisService.ts', 'r') as f:
    content = f.read()

content = content.replace("KisService.priceQueue", "KISService.priceQueue")

with open('src/services/kisService.ts', 'w') as f:
    f.write(content)
print("Patched class name")
