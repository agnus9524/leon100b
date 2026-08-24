import sys
import re

with open('src/services/kisService.ts', 'r') as f:
    content = f.read()

# find `expiresAt: this.tokenExpireTime`
idx = content.find("expiresAt: this.tokenExpireTime")
if idx != -1:
    idx2 = content.find("};", idx)
    if idx2 != -1:
        # replace `};` with `};\n  }\n`
        content = content[:idx2+2] + "\n  }\n" + content[idx2+2:]

# remove `export const kisService = new KISService();`
content = content.replace("export const kisService = new KISService();", "")
content += "\nexport const kisService = new KISService();\n"

with open('src/services/kisService.ts', 'w') as f:
    f.write(content)
