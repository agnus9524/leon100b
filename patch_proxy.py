import sys

with open('server.ts', 'r') as f:
    content = f.read()

old_proxy = """    try {
      const axiosConfig: any = {
        method: req.method,
        url: fullUrl,
        headers,
        params: req.query,
        httpsAgent: agent,
        timeout: 8000
      };
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        axiosConfig.data = req.body;
      }
      const response = await axios(axiosConfig);
      if (isGetQuote && response.status === 200) {
        setCachedData(cacheKey, response.data, 2000); // 2 seconds cache
        res.setHeader('Cache-Control', 'public, max-age=2, s-maxage=2');
      }
      return res.status(response.status).json(response.data);
    } catch (error: any) {"""

new_proxy = """    let retries = 3;
    let response: any;
    for (let i = 0; i < retries; i++) {
      try {
        const axiosConfig: any = {
          method: req.method,
          url: fullUrl,
          headers,
          params: req.query,
          httpsAgent: agent,
          timeout: 8000
        };
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          axiosConfig.data = req.body;
        }
        response = await axios(axiosConfig);
        break;
      } catch (error: any) {
        if (i < retries - 1 && (error.response?.status === 429 || error.response?.status >= 500)) {
          console.warn(`[KIS Proxy] ${error.response?.status} on ${fullUrl}. Retrying in ${Math.pow(2, i) * 1000}ms...`);
          await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
        } else {
          const errorData = error.response?.data;
          const status = error.response?.status || 500;
          
          console.warn(`[KIS Proxy Notice] ${status} [${req.method}] ${fullUrl}: ${error.message}`);
          
          if (errorData) {
            return res.status(200).json(errorData); // KIS often returns 200 with error codes inside
          } else {
            return res.status(200).json({ 
              rt_cd: '-1', 
              msg_cd: 'KIS_PROXY_NOTICE',
              msg1: `KIS API 서버 응답 대기/오류 (${error.message})` 
            });
          }
        }
      }
    }
    
    if (response) {
      if (isGetQuote && response.status === 200) {
        setCachedData(cacheKey, response.data, 2000); // 2 seconds cache
        res.setHeader('Cache-Control', 'public, max-age=2, s-maxage=2');
      }
      return res.status(response.status).json(response.data);
    }"""

if old_proxy in content:
    content = content.replace(old_proxy, new_proxy)
    print("Patched KIS proxy")
else:
    print("Could not find KIS proxy")

with open('server.ts', 'w') as f:
    f.write(content)
