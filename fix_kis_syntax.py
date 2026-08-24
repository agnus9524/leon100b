import sys

with open('src/services/kisService.ts', 'r') as f:
    lines = f.readlines()

# We will remove specific ranges based on the dangling code we saw.
# It's safer to identify start and end markers.

def find_range(start_marker, end_marker):
    start = -1
    end = -1
    for i, l in enumerate(lines):
        if start_marker in l and start == -1:
            start = i
        if start != -1 and end_marker in l:
            end = i
            break
    return start, end

# 1. getOverseasPrice dangling
start, end = find_range("appkey': this.config.appKey,", "throw new Error(`KIS Inquiry Error for ${symbol}: ${lastError}`);")
if start != -1 and end != -1:
    # also remove the closing } after the throw new Error
    for i in range(end, end + 5):
        if "}" in lines[i]:
            end = i
            break
    # the start should be 1 line before (the `}`)
    if "}`," in lines[start-1]:
        start -= 1
    # print(f"Deleting {start} to {end}")
    for i in range(start, end+1):
        lines[i] = ""

# 2. getOverseasHoldings dangling
start, end = find_range("if (!this.config) throw new Error(\"KIS Config not initialized\");", "return this.getOverseasBalance();")
if start != -1 and end != -1:
    for i in range(end, end + 5):
        if "}" in lines[i]:
            end = i
            break
    if "};" in lines[start-1]:
        lines[start-1] = "  }\n"
    for i in range(start, end+1):
        lines[i] = ""

# 3. getOverseasBuyableAmount dangling
start, end = find_range("if (!this.config) return { rt_cd: '1', msg1: \"KIS Config not initialized\", output: { max_ord_psbl_qty: '0' } };", "return { rt_cd: '1', msg1: error?.message || 'Overseas buyable exception', output: { max_ord_psbl_qty: '0', ord_psbl_qty: '0' } };")
if start != -1 and end != -1:
    for i in range(end, end + 5):
        if "}" in lines[i]:
            end = i
            break
    if "} };" in lines[start-1]:
        lines[start-1] = "  }\n"
    for i in range(start, end+1):
        lines[i] = ""

# 4. getOverseasMinuteChart dangling
start, end = find_range("const endpoint = '/uapi/overseas-price/v1/quotations/inquire-time-itemchartprice';", "return { rt_cd: '0', output2: [] };")
if start != -1 and end != -1:
    for i in range(end, end + 5):
        if "}" in lines[i]:
            end = i
            break
    if "try {" in lines[start-1]:
        start -= 1
    if "};" in lines[start-1]:
        lines[start-1] = "  }\n"
    for i in range(start, end+1):
        lines[i] = ""

# write back
with open('src/services/kisService.ts', 'w') as f:
    f.writelines(lines)
