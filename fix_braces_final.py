import sys

with open('src/services/kisService.ts', 'r') as f:
    lines = f.readlines()

# Fix getHashKey
# We will insert it at line 176
hashkey_code = """  private async getHashKey(body: any) {
    if (!this.config) throw new Error("KIS Config not initialized");
    try {
      const res = await axios.post(`${this.baseUrl}/uapi/hashkey`, body, {
        headers: { 'content-type': 'application/json', 'appkey': this.config.appKey, 'appsecret': this.config.appSecret }
      });
      return res.data.HASH || '';
    } catch { return ''; }
  }
"""
# Replace line 175-177 (which are `  private async getHashKey(body: any) {`, blank, `  // --- Unified / Router Methods`)
for i, l in enumerate(lines):
    if "private async getHashKey(body: any) {" in l:
        lines[i] = hashkey_code
        break

# Fix getOverseasBuyableAmount
# Around line 449: `  } };`, ``, `    }`, `  }`
# We will replace them with a single `  }`
for i, l in enumerate(lines):
    if "public async getOverseasBuyableAmount" in l:
        # lines[i] is the signature
        # lines[i+1] is return
        # lines[i+2] is `  } };`
        if "} };" in lines[i+2]:
            lines[i+2] = "  }\n"
            lines[i+3] = ""
            lines[i+4] = ""
            lines[i+5] = ""
        break

# Fix getOverseasMinuteChart
# Around line 1018
for i, l in enumerate(lines):
    if "public async getOverseasMinuteChart" in l:
        # lines[i] is signature
        # lines[i+1] is return
        # lines[i+2] is `  };`
        if "};" in lines[i+2]:
            lines[i+2] = "  }\n"
            lines[i+3] = ""
            lines[i+4] = ""
            lines[i+5] = ""
            lines[i+6] = ""
        break

with open('src/services/kisService.ts', 'w') as f:
    f.writelines(lines)
