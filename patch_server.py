import sys

with open('server.ts', 'r') as f:
    content = f.read()

# Fix 1: update headers in fetchKrxStocks
headers_old = """      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }"""
headers_new = """      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://kind.krx.co.kr/corpgeneral/corpList.do?method=loadInitPage'
      }"""
content = content.replace(headers_old, headers_new)

# Let's also enforce English stripping in the name when searching.
# Though we did it on the frontend, let's also do it here so Yahoo doesn't get messed up
# Actually, the user asked to strip English suffixes from the Korean stock names.
# For example, "삼성전자(Samsung Electronics)" or "삼성전자 Samsung".
strip_logic = """
        const name = tds[0].replace(/<[^>]*>/g, '').trim();
"""
strip_logic_new = """
        let name = tds[0].replace(/<[^>]*>/g, '').trim();
        name = name.replace(/\\s*\\([A-Za-z0-9\\s,.-]+\\)\\s*$/, '').trim();
        name = name.replace(/\\s+[A-Za-z]+(\\s+[A-Za-z]+)*\\s*$/, '').trim();
"""
content = content.replace(strip_logic, strip_logic_new)

with open('server.ts', 'w') as f:
    f.write(content)

