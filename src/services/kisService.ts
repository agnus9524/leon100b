import axios from 'axios';

/**
 * 한국투자증권 KIS API 연동 서비스
 */

interface KISConfig {
  appKey: string;
  appSecret: string;
  accountNo: string; // 계좌번호 8자리
  accountCode: string; // 상품코드 2자리 (보통 01)
  accountPw: string; // 계좌비밀번호 4자리
  isConnected: boolean;
}

export interface NormalizedPrice {
  current: number;
  prevClose: number;
  change: number;
  changePercent: number;
  volume: string;
  name?: string;
}

class KISService {
  private config: KISConfig | null = null;
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;
  private pendingTokenPromise: Promise<string> | null = null;
  private onTokenUpdate: ((token: string, expiresAt: number) => void) | null = null;

  private get baseUrl() {
    return '/api/kis';
  }

  private get headers() {
    return {
      'custtype': 'P'
    };
  }

  public init(config: KISConfig, savedToken?: string, savedExpiresAt?: number) {
    // Sanitize config by trimming strings to eliminate accidental trailing whitespace
    this.config = {
      ...config,
      appKey: (config.appKey || '').trim(),
      appSecret: (config.appSecret || '').trim(),
      accountNo: (config.accountNo || '').trim(),
      accountCode: (config.accountCode || '01').trim(),
      accountPw: (config.accountPw || '').trim()
    };
    
    // Add request interceptor to append the isRealServer header dynamically
    if (!(axios as any)._kisInterceptorAdded) {
      (axios as any)._kisInterceptorAdded = true;
      axios.interceptors.request.use((reqConfig: any) => {
        if (reqConfig.url?.includes('/api/kis') && this.config) {
          reqConfig.headers = reqConfig.headers || {};
          reqConfig.headers['x-is-real-server'] = 'true';
        }
        return reqConfig;
      });
    }

    // Reset internal token if environment changed or it's empty
    if (savedToken && savedExpiresAt && Date.now() < savedExpiresAt) {
      this.accessToken = savedToken;
      this.tokenExpireTime = savedExpiresAt;
    } else {
      this.accessToken = null;
      this.tokenExpireTime = 0;
    }
  }

  public setTokenUpdateHandler(handler: (token: string, expiresAt: number) => void) {
    this.onTokenUpdate = handler;
  }

  public clear() {
    this.config = null;
    this.accessToken = null;
    this.tokenExpireTime = 0;
  }

  private async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    if (this.pendingTokenPromise) {
      return this.pendingTokenPromise;
    }

    if (!this.config) throw new Error("KIS 설정 정보(AppKey / AppSecret)가 초기화되지 않았습니다.");

    this.pendingTokenPromise = (async () => {
      try {
        const cleanAppKey = (this.config!.appKey || '').trim();
        const cleanAppSecret = (this.config!.appSecret || '').trim();

        if (!cleanAppKey || !cleanAppSecret) {
          throw new Error("App Key 또는 App Secret이 비어있습니다. KIS 연동 설정에서 확인 후 재입력해주세요.");
        }

        const endpoint = '/oauth2/tokenP';
        const payload = {
          grant_type: 'client_credentials',
          appkey: cleanAppKey,
          appsecret: cleanAppSecret
        };

        const res = await axios.post(`${this.baseUrl}${endpoint}`, payload, { 
          headers: {
            ...this.headers,
            'Content-Type': 'application/json'
          } 
        });
        
        // Handle potential KIS error responses or missing access token
        if (!res.data || !res.data.access_token) {
          const rawErr = res.data?.error_description 
            || res.data?.msg1 
            || res.data?.error_code 
            || res.data?.msg_cd 
            || '접근 토큰 발급 실패';

          let friendlyMsg = rawErr;
          if (rawErr.includes('EGW00201') || rawErr.includes('APPKEY')) {
            friendlyMsg = "유효하지 않은 AppKey/AppSecret입니다. (공백 또는 오타 확인 필요)";
          } else if (rawErr.includes('EGW00002')) {
            friendlyMsg = "AppKey 또는 AppSecret 정보가 일치하지 않습니다.";
          }

          throw new Error(friendlyMsg);
        }

        const newAccessToken = res.data.access_token;
        const expiresInSec = Number(res.data.expires_in || 86400);
        // Buffer for safety (1 hour before actual expiry or 23h since token lasts 24h)
        const newExpireTime = Date.now() + (expiresInSec > 3600 ? expiresInSec - 3600 : expiresInSec - 60) * 1000;
        
        this.accessToken = newAccessToken;
        this.tokenExpireTime = newExpireTime;

        if (this.onTokenUpdate) {
          this.onTokenUpdate(newAccessToken, newExpireTime);
        }
        
        return this.accessToken;
      } catch (error: any) {
        this.accessToken = null;
        this.tokenExpireTime = 0;

        const dataErr = error.response?.data;
        const kisDetail = dataErr?.error_description 
          || dataErr?.msg1 
          || dataErr?.error_code 
          || error.message;

        let userFriendlyReason = kisDetail;
        if (kisDetail.includes('EGW00201') || kisDetail.includes('APPKEY')) {
          userFriendlyReason = "유효하지 않은 AppKey/AppSecret입니다. 한국투자증권 KIS Developers에서 발급된 키인지 확인해주세요.";
        } else if (kisDetail.includes('400') || kisDetail.includes('401')) {
          userFriendlyReason = "인증 실패: AppKey/AppSecret 복사 시 앞뒤 공백이 포함되었거나 모의투자/실전 계좌 키가 다를 수 있습니다.";
        }

        throw new Error(userFriendlyReason.startsWith('[토큰 발급 오류]') ? userFriendlyReason : `[토큰 발급 오류] ${userFriendlyReason}`);
      } finally {
        this.pendingTokenPromise = null;
      }
    })();

    return this.pendingTokenPromise;
  }

  private async getHashKey(body: any) {
    if (!this.config) throw new Error("KIS Config not initialized");
    const endpoint = '/uapi/hashkey';
    
    const headers = {
      'content-type': 'application/json',
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
    };

    const res = await axios.post(`${this.baseUrl}${endpoint}`, body, { headers });
    if (!res.data.HASH) {
      throw new Error(`Hashkey request failed: ${res.data.msg1 || 'Unknown error'}`);
    }
    return res.data.HASH;
  }

  public async orderOverseas(symbol: string, side: 'BUY' | 'SELL', price: string, qty: string) {
    if (!this.config) throw new Error("KIS Config not initialized");
    
    return this.queueRequest(async () => {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/overseas-stock/v1/trading/order';
      
      const isVirtual = this.baseUrl.includes('openapivts');
      let trId = isVirtual
        ? (side === 'BUY' ? 'VTSM1002U' : 'VTSM1006U')
        : (side === 'BUY' ? 'TTTS1002U' : 'TTTS1006U');

      const body = {
          CANO: this.config.accountNo,
          ACNT_PRDT_CD: this.config.accountCode,
          OVRS_EXGI_CD: 'NASD',
          PDNO: symbol,
          ORD_QTY: qty,
          OVRS_ORD_UNPR: price,
          ORD_SVR_DVSN_CD: '0',
          ORD_DVSN: '00'
      };

      const hashkey = await this.getHashKey(body);

      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': trId,
        'hashkey': hashkey,
        'custtype': 'P',
      };

      const res = await axios.post(`${this.baseUrl}${endpoint}`, body, { headers });
      if (res.data.rt_cd && res.data.rt_cd !== '0') {
        if (res.data.msg_cd === 'EGW00201' || res.data.msg1?.includes('초당 거래건수')) {
          throw new Error(`[429] ${res.data.msg1}`);
        }
        throw new Error(`해외 주문 실패: ${res.data.msg1} (${res.data.msg_cd})`);
      }
      return res.data;
    });
  }

  public async getOverseasPrice(symbol: string, excd?: string) {
     if (!this.config) throw new Error("KIS Config not initialized");
     const token = await this.getAccessToken();
     
     // Trials with common US exchanges if not specified
     const excds = excd ? [excd] : ['NAS', 'NYS', 'AMS'];
     const endpoint = '/uapi/overseas-price/v1/quotations/price';
     let lastError = null;

     for (const currentExcd of excds) {
       const trId = 'HHDFS00000300';
       
       const headers: any = {
          'authorization': `Bearer ${token}`,
          'appkey': this.config.appKey,
          'appsecret': this.config.appSecret,
          'tr-id': trId,
          'custtype': 'P'
       };
  
       const params = {
         AUTH: '',
         EXCD: currentExcd,
         SYMB: symbol
       };
  
       try {
         const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
         if (res.data.rt_cd === '0' && res.data.output) {
           return res.data.output;
         }
         
         // Fallback if real-time fails (EGW00310) try Global Delayed for this exchange
         if (res.data.msg_cd === 'EGW00310' || res.data.msg1?.includes('EGW00310')) {
            headers['tr-id'] = 'HHDFS00000100';
            const retryRes = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
            if (retryRes.data.rt_cd === '0') return retryRes.data.output;
         }
         
         lastError = `${res.data.msg1} (${res.data.msg_cd})`;
         console.warn(`[KIS Service] Overseas Price Trial (${currentExcd}) failed for ${symbol}: ${lastError}`);
       } catch (error: any) {
         lastError = error.message;
       }
     }
     
     throw new Error(`KIS Inquiry Error for ${symbol}: ${lastError}`);
  }

  public async getOverseasBalance() {
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    const endpoint = '/uapi/overseas-stock/v1/trading/inquire-present-balance';
    
    // US Balance TR_ID: TTTS3012R (Real) / VTSM3012R or VTTS3012R (Virtual)
    const isVirtual = this.baseUrl.includes('openapivts');
    const trId = isVirtual ? 'VTSM3012R' : 'TTTS3012R';
    
    const headers: any = {
      'authorization': `Bearer ${token}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr-id': trId,
      'tr-cont': '',
      'custtype': 'P'
    };

    const params: any = {
      CANO: this.config.accountNo,
      ACNT_PRDT_CD: this.config.accountCode,
      OVRS_EXGI_CD: 'NASD',
      TR_CRC_CD: 'USD',
      CTX_AREA_FK200: '',
      CTX_AREA_NK200: '',
      CANO_PWD: this.config.accountPw || ''
    };

    try {
      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      if (res.data.rt_cd && res.data.rt_cd !== '0') {
         if (res.data.msg_cd === 'EGW00310' || res.data.msg1?.includes('EGW00310')) {
            headers['tr-id'] = isVirtual ? 'VTSM3010R' : 'TTTS3010R';
            const retryRes = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
            if (retryRes.data.rt_cd === '0') return retryRes.data;
         }
         console.warn(`[KIS Service] Overseas Balance Query Skipped/Failed: ${res.data.msg1}`);
         return { rt_cd: '1', msg1: res.data.msg1 || 'Overseas balance query failed', output1: [], output2: [] };
      }
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Overseas Balance Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '1', msg1: error?.response?.data?.msg1 || error?.message || 'Overseas balance exception', output1: [], output2: [] };
    }
  }

  public async getOverseasOrderableCash() {
    if (!this.config) return { orderableUsd: 0, usdDeposit: 0, rt_cd: '1', msg1: "KIS Config not initialized" };
    try {
      const balanceData = await this.getOverseasBalance();
      if (balanceData?.rt_cd === '0') {
        const out2List = Array.isArray(balanceData.output2) 
          ? balanceData.output2 
          : (balanceData.output2 ? [balanceData.output2] : []);
        const usdItem = out2List.find((item: any) => item.crcy_cd === 'USD') || out2List[0] || {};
        const out3 = Array.isArray(balanceData.output3) 
          ? (balanceData.output3[0] || {}) 
          : (balanceData.output3 || {});

        const usdDeposit = Number(usdItem.frcr_dncl_amt || usdItem.frcr_drwg_psbl_amt || out3.frcr_dncl_amt || 0);
        const ordPsblUsd = Number(
          usdItem.frcr_ord_psbl_amt1 || 
          usdItem.ord_psbl_frcr_amt || 
          usdItem.frcr_dncl_amt || 
          out3.frcr_ord_psbl_amt1 || 
          out3.ovrs_ord_psbl_amt || 
          0
        );

        return {
          orderableUsd: ordPsblUsd > 0 ? ordPsblUsd : usdDeposit,
          usdDeposit,
          rt_cd: '0',
          msg1: 'OK'
        };
      }

      // Secondary check via inquire-psbl-order for a high-volume liquid stock (AAPL)
      const buyable = await this.getOverseasBuyableAmount('AAPL', '100');
      if (buyable?.rt_cd === '0' && buyable.output) {
        const rawUsd = Number(
          buyable.output.ovrs_ord_psbl_amt || 
          buyable.output.frcr_ord_psbl_amt1 || 
          buyable.output.ord_psbl_frcr_amt || 
          buyable.output.frcr_ord_psbl_amt || 
          0
        );
        return {
          orderableUsd: rawUsd,
          usdDeposit: rawUsd,
          rt_cd: '0',
          msg1: 'OK'
        };
      }

      return { orderableUsd: 0, usdDeposit: 0, rt_cd: balanceData?.rt_cd || '1', msg1: balanceData?.msg1 || 'No data' };
    } catch (e: any) {
      return { orderableUsd: 0, usdDeposit: 0, rt_cd: '1', msg1: e.message };
    }
  }

  public async getOverseasHoldings() {
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    const endpoint = '/uapi/overseas-stock/v1/trading/inquire-present-balance';
    
    // Also use TTTS3012R or CTRP6504R. App.tsx expects output1 for holdings.
    // TTTS3012R has output1 as stock list.
    return this.getOverseasBalance();
  }

  // --- Unified / Router Methods (Main Interface) ---
  // Currently prioritized for Domestic Stocks as requested.

  public async getBalance() {
    // Current API points to Domestic Balance as requested
    return this.getDomesticBalance();
  }

  public async getPrice(symbol: string): Promise<NormalizedPrice | null> {
    // Determine if KR or US (approximate)
    const isKR = /^\d{6}$/.test(symbol);
    try {
      if (isKR) {
        const data = await this.getDomesticPrice(symbol);
        if (!data) return null;
        
        return {
          current: Number(data.stck_prpr),
          prevClose: Number(data.stck_sdpr),
          change: Number(data.prdy_vrss),
          changePercent: Number(data.prdy_ctrt),
          volume: data.acml_vol || '0',
          name: data.hts_kor_isnm || undefined
        };
      } else {
        const data = await this.getOverseasPrice(symbol);
        if (!data) return null;
        
        const current = Number(data.last);
        const prevClose = Number(data.base);
        const change = Number(data.diff || (current - prevClose));
        const changePercent = Number(data.rate || (prevClose > 0 ? (change / prevClose) * 100 : 0));
        
        return {
          current,
          prevClose,
          change,
          changePercent,
          volume: data.tvol || '0',
          name: data.name || data.orgr_isnm || undefined
        };
      }
    } catch (e) {
      console.warn(`[KIS Service] Failed to fetch price for ${symbol}:`, e);
      return null;
    }
  }

  public async getHoldings() {
    // Return domestic holdings as part of the current API prioritize domestic
    const domesticData = await this.getDomesticBalance();
    // Wrap to match overseas holdings structure for compatibility if needed
    return domesticData;
  }

  public async order(symbol: string, side: 'BUY' | 'SELL', price: string, qty: string, ordDvsn?: string) {
    const isKR = /^\d{6}$/.test(symbol);
    if (isKR) {
      return this.orderDomestic(symbol, side, price, qty, ordDvsn);
    } else {
      return this.orderOverseas(symbol, side, price, qty);
    }
  }

  // --- Domestic (Korean) Stock ---

  public async getInvestmentAssetStatus() {
    if (!this.config) throw new Error("KIS Config not initialized");

    const token = await this.getAccessToken();
    const endpoint = '/uapi/domestic-stock/v1/trading/inquire-account-balance';
    
    const headers = {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr-id': 'CTRP6548R',
      'custtype': 'P',
    };

    const params = {
      CANO: this.config.accountNo,
      ACNT_PRDT_CD: this.config.accountCode,
      INQR_DVSN_1: '',
      BSPR_BF_DT_APLY_YN: '',
      CANO_PWD: this.config.accountPw || ''
    };

    const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
    return res.data;
  }

  public async getIntegratedMarginStatus() {
    if (!this.config) throw new Error("KIS Config not initialized");

    const token = await this.getAccessToken();
    const endpoint = '/uapi/domestic-stock/v1/trading/intgr-margin';
    
    const headers = {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr-id': 'TTTC0869R',
      'custtype': 'P',
    };

    const params = {
      CANO: this.config.accountNo,
      ACNT_PRDT_CD: this.config.accountCode,
      CMA_EVLU_AMT_ICLD_YN: 'N',
      WCRC_FRCR_DVSN_CD: '01',
      FWEX_CTRT_FRCR_DVSN_CD: '01'
    };

    const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
    return res.data;
  }

  public async getDomesticBalance() {
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    const endpoint = '/uapi/domestic-stock/v1/trading/inquire-balance';
    
    const isVirtual = this.baseUrl.includes('openapivts');
    const defaultTrId = isVirtual ? 'VTTC8434R' : 'TTTC8434R';
    
    const headers: any = {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr-id': defaultTrId,
      'tr-cont': '',
      'custtype': 'P',
    };

    const params = {
      CANO: this.config.accountNo,
      ACNT_PRDT_CD: this.config.accountCode,
      AFHR_FLPR_YN: 'N',
      OFL_YN: '',
      INQR_DVSN: '02',
      UNPR_DVSN: '01',
      FUND_STTL_ICLD_YN: 'N',
      FNCG_AMT_AUTO_RDPT_YN: 'N',
      PRCS_DVSN: '00',
      CTX_AREA_FK100: '',
      CTX_AREA_NK100: '',
      CANO_PWD: this.config.accountPw || ''
    };

    try {
      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      if (res.data.rt_cd && res.data.rt_cd !== '0') {
        const isTrIdError = res.data.msg_cd === 'EGW00310' || res.data.msg1?.includes('EGW00310');
        if (isTrIdError) {
           headers['tr-id'] = 'TTTC8432R';
           const retryRes = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
           if (retryRes.data.rt_cd === '0') return retryRes.data;
        }
        console.warn(`[KIS Service] Domestic Balance Error: ${res.data.msg1} (${res.data.msg_cd})`);
        return { rt_cd: '1', msg1: res.data.msg1 || 'Domestic balance failed', output1: [], output2: [] };
      }
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Domestic Balance Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '1', msg1: error?.response?.data?.msg1 || error?.message || 'Domestic balance exception', output1: [], output2: [] };
    }
  }

  public async getDomesticBuyableAmount(symbol: string = '005930', price: string = '0', ordDvsn: string = '01') {
    if (!this.config) return { rt_cd: '1', msg1: "KIS Config not initialized", output: { max_ord_psbl_qty: '0', ord_psbl_cash: '0', ord_psbl_amt: '0', nrcy_ord_psbl_amt: '0' } };
    const querySymbol = (symbol && /^\d{6}$/.test(symbol)) ? symbol : '005930';
    try {
      await this.throttleRequest();
      const token = await this.getAccessToken();
      const endpoint = '/uapi/domestic-stock/v1/trading/inquire-psbl-order';
      
      const isVirtual = this.baseUrl.includes('openapivts');
      const trId = isVirtual ? 'VTTC8908R' : 'TTTC8908R';

      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': trId,
        'custtype': 'P',
      };

      const numericPrice = Number(price);
      // If limit order (00) but price is 0 or empty, query as market order (01) to fetch account orderable cash successfully
      const effectiveOrdDvsn = (ordDvsn === '00' && (!numericPrice || numericPrice <= 0)) ? '01' : ordDvsn;
      const effectivePrice = (effectiveOrdDvsn === '00' && numericPrice > 0) ? price : '0';

      const params = {
        CANO: this.config.accountNo,
        ACNT_PRDT_CD: this.config.accountCode,
        PDNO: querySymbol,
        ORD_UNPR: effectivePrice,
        ORD_DVSN: effectiveOrdDvsn,
        CMA_EVLU_AMT_ICLD_YN: 'Y',
        OVRS_ICLD_YN: 'N',
        CANO_PWD: this.config.accountPw || ''
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      if (res.data.rt_cd && res.data.rt_cd !== '0') {
        console.warn(`[KIS Service] Domestic Buyable Amount Error: ${res.data.msg1} (${res.data.msg_cd})`);
        return { rt_cd: res.data.rt_cd || '1', msg1: res.data.msg1 || 'Domestic buyable error', output: { max_ord_psbl_qty: '0', ord_psbl_cash: '0', ord_psbl_amt: '0', nrcy_ord_psbl_amt: '0', nrcy_buy_qty: '0', ord_psbl_qty: '0' } };
      }
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Domestic Buyable Amount Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '1', msg1: error?.message || 'Domestic buyable exception', output: { max_ord_psbl_qty: '0', ord_psbl_cash: '0', ord_psbl_amt: '0', nrcy_ord_psbl_amt: '0', nrcy_buy_qty: '0', ord_psbl_qty: '0' } };
    }
  }

  public async getDomesticOrderableCash(targetSymbol?: string) {
    if (!this.config) return { orderableKrw: 0, ord_psbl_cash: 0, ord_psbl_amt: 0, nrcy_ord_psbl_amt: 0, rt_cd: '1', msg1: "KIS Config not initialized" };
    try {
      const sym = (targetSymbol && /^\d{6}$/.test(targetSymbol)) ? targetSymbol : '005930';
      const buyableRes = await this.getDomesticBuyableAmount(sym, '0', '01');
      if (buyableRes && buyableRes.rt_cd === '0' && buyableRes.output) {
        const out = buyableRes.output;
        // KIS exact API fields: ord_psbl_cash (주문가능현금), nrcy_ord_psbl_amt (비대면주문가능금액), ord_psbl_amt (주문가능금액)
        const ord_psbl_cash = Number(out.ord_psbl_cash || 0);
        const nrcy_ord_psbl_amt = Number(out.nrcy_ord_psbl_amt || 0);
        const ord_psbl_amt = Number(out.ord_psbl_amt || 0);
        
        // Exact real-time orderable KRW priority: ord_psbl_cash > nrcy_ord_psbl_amt > ord_psbl_amt
        const exactCash = ord_psbl_cash > 0 ? ord_psbl_cash : (nrcy_ord_psbl_amt > 0 ? nrcy_ord_psbl_amt : ord_psbl_amt);
        return {
          orderableKrw: exactCash,
          ord_psbl_cash,
          ord_psbl_amt,
          nrcy_ord_psbl_amt,
          rt_cd: '0',
          msg1: 'OK'
        };
      }
      return { orderableKrw: 0, ord_psbl_cash: 0, ord_psbl_amt: 0, nrcy_ord_psbl_amt: 0, rt_cd: buyableRes?.rt_cd || '1', msg1: buyableRes?.msg1 || 'No data' };
    } catch (e: any) {
      return { orderableKrw: 0, ord_psbl_cash: 0, ord_psbl_amt: 0, nrcy_ord_psbl_amt: 0, rt_cd: '1', msg1: e.message };
    }
  }

  public async getOverseasBuyableAmount(symbol: string, price: string = '0', ovrsExchCd: string = 'NASD') {
    if (!this.config) return { rt_cd: '1', msg1: "KIS Config not initialized", output: { max_ord_psbl_qty: '0' } };
    try {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/overseas-stock/v1/trading/inquire-psbl-order';
      
      const isVirtual = this.baseUrl.includes('openapivts');
      const trId = isVirtual ? 'VTSM3007R' : 'TTTS3007R';

      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': trId,
        'custtype': 'P',
      };

      const params = {
        CANO: this.config.accountNo,
        ACNT_PRDT_CD: this.config.accountCode,
        OVRS_EXCH_CD: ovrsExchCd,
        PDNO: symbol,
        ORD_UNPR: price,
        ITEM_DVSN: '01',
        CANO_PWD: this.config.accountPw || ''
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      if (res.data.rt_cd && res.data.rt_cd !== '0') {
        console.warn(`[KIS Service] Overseas Buyable Amount Error: ${res.data.msg1} (${res.data.msg_cd})`);
        return { rt_cd: res.data.rt_cd || '1', msg1: res.data.msg1 || 'Overseas buyable error', output: { max_ord_psbl_qty: '0', ord_psbl_qty: '0' } };
      }
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Overseas Buyable Amount Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '1', msg1: error?.message || 'Overseas buyable exception', output: { max_ord_psbl_qty: '0', ord_psbl_qty: '0' } };
    }
  }

  public async getDomesticSellableQuantity(symbol: string) {
    if (!this.config) return { rt_cd: '1', msg1: "KIS Config not initialized", output: { ord_psbl_qty: '0', nrc_psbl_qty: '0' } };
    if (!symbol || !/^\d{6}$/.test(symbol)) return { rt_cd: '0', output: { ord_psbl_qty: '0', nrc_psbl_qty: '0' } };
    try {
      await this.throttleRequest();
      const token = await this.getAccessToken();
      const endpoint = '/uapi/domestic-stock/v1/trading/inquire-psbl-sell';
      
      const isVirtual = this.baseUrl.includes('openapivts');
      const trId = isVirtual ? 'VTTC8408R' : 'TTTC8408R';

      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': trId,
        'custtype': 'P',
      };

      const params = {
        CANO: this.config.accountNo,
        ACNT_PRDT_CD: this.config.accountCode,
        PDNO: symbol,
        CANO_PWD: this.config.accountPw || ''
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Domestic Sellable Quantity Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '0', output: { ord_psbl_qty: '0' } };
    }
  }

  public async getPeriodTradeProfit(startDate: string, endDate: string, symbol: string = '', sortDvsn: string = '02') {
    if (!this.config) return { rt_cd: '1', msg1: "KIS Config not initialized", output1: [], output2: [] };
    try {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/domestic-stock/v1/trading/inquire-period-trade-profit';

      const isVirtual = this.baseUrl.includes('openapivts');
      const trId = isVirtual ? 'VTTC8715R' : 'TTTC8715R';

      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': trId,
        'tr_id': trId,
        'custtype': 'P',
      };

      const params = {
        CANO: this.config.accountNo,
        ACNT_PRDT_CD: this.config.accountCode,
        SORT_DVSN: sortDvsn,
        PDNO: symbol || '',
        INQR_STRT_DT: startDate,
        INQR_END_DT: endDate,
        CTX_AREA_NK100: '',
        CBLC_DVSN: '00',
        CTX_AREA_FK100: ''
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params, timeout: 8000 });
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Period Trade Profit Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '0', output1: [], output2: [] };
    }
  }

  public async getDomesticPeriodRealizedPnL(startDate: string, endDate: string, symbol: string = '') {
    if (!this.config) return { rt_cd: '1', msg1: "KIS Config not initialized", output1: [], output2: {} };
    try {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/domestic-stock/v1/trading/inquire-period-profit';

      const isVirtual = this.baseUrl.includes('openapivts');
      const trId = isVirtual ? 'VTTC8494R' : 'TTTC8494R';

      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': trId,
        'tr_id': trId,
        'custtype': 'P',
      };

      const params = {
        CANO: this.config.accountNo,
        ACNT_PRDT_CD: this.config.accountCode,
        INQR_STRT_DT: startDate,
        INQR_END_DT: endDate,
        SLL_BUY_DVSN_CD: '00',
        INQR_DVSN: '00',
        PDNO: symbol || '',
        CCLD_DVSN: '00',
        ORD_GNO_BRNO: '',
        ODNO: '',
        INQR_DVSN_3: '00',
        INQR_DVSN_1: '00',
        INQR_DVSN_2: '00',
        COST_ICLD_YN: 'N',
        PRCS_DVSN: '00', // 00: 가결제포함 (당일/최근 체결 매매 전체 포함)
        CTX_AREA_FK100: '',
        CTX_AREA_NK100: '',
        CANO_PWD: this.config.accountPw || ''
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params, timeout: 8000 });
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Period Realized PnL Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '0', output1: [], output2: {} };
    }
  }

  public async getDomesticOrderExecutions(startDate: string, endDate: string, oderFg: '00' | '01' | '02' = '00', prcsDvsn: '00' | '01' | '02' = '00') {
    if (!this.config) return { rt_cd: '1', msg1: "KIS Config not initialized", output1: [], output2: [] };
    try {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/domestic-stock/v1/trading/inquire-daily-ccnl';
      
      const isVirtual = this.baseUrl.includes('openapivts');
      const trId = isVirtual ? 'VTTC8001R' : 'TTTC8001R';

      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': trId,
        'tr_id': trId,
        'custtype': 'P',
      };

      const params = {
        CANO: this.config.accountNo,
        ACNT_PRDT_CD: this.config.accountCode,
        INQR_STRT_DT: startDate,
        INQR_END_DT: endDate,
        SND_CD: '',
        SMRT_OTSN_YN: 'N',
        SMRT_SND_CD: '',
        ODER_FG_CD: oderFg,
        CTX_AREA_FK100: '',
        CTX_AREA_NK100: '',
        INQR_DVSN: '00',
        PRCS_DVSN: prcsDvsn,
        CANO_PWD: this.config.accountPw || ''
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Domestic Order Executions Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '0', output1: [], output2: [] };
    }
  }

  public async cancelOrder(symbol: string, orgNo: string, ordNo: string, qty: string) {
    const isKR = /^\d{6}$/.test(symbol);
    if (isKR) {
      return this.cancelDomesticOrder(orgNo, ordNo, qty);
    } else {
      return this.cancelOverseasOrder(orgNo, ordNo, symbol, qty);
    }
  }

  public async checkOrderExecution(odno: string) {
    if (!this.config) throw new Error("KIS Config not initialized");
    if (!odno) return { found: false, isFullyFilled: false, isPartiallyFilled: false, isUnfilled: true, price: 0 };
    
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const cleanOdno = odno.toString().trim().replace(/^0+/, '');
    const paddedOdno = odno.toString().trim().padStart(10, '0');

    try {
      const res = await this.getDomesticOrderExecutions(todayStr, todayStr);
      if (res && res.rt_cd === '0' && res.output1 && Array.isArray(res.output1)) {
        const order = res.output1.find((item: any) => {
          const itemOdno = (item.odno || item.ODNO || '').toString().trim();
          const cleanItemOdno = itemOdno.replace(/^0+/, '');
          return itemOdno === odno || itemOdno === paddedOdno || cleanItemOdno === cleanOdno;
        });
        if (order) {
          const ordQty = Number(order.ord_qty || order.ORD_QTY || 0);
          const ccldQty = Number(order.tot_ccld_qty || order.TOT_CCLD_QTY || 0);
          const rmndQty = Number(order.rmnd_qty || order.RMND_QTY || 0);
          const prpr = Number(order.avg_prvs || order.AVG_PRVS || order.ord_unpr || order.ORD_UNPR || 0);
          
          return {
            found: true,
            ordQty,
            ccldQty,
            rmndQty,
            isFullyFilled: ccldQty === ordQty && ordQty > 0,
            isPartiallyFilled: ccldQty > 0 && ccldQty < ordQty,
            isUnfilled: ccldQty === 0,
            price: prpr
          };
        }
      }
      return { found: false, isFullyFilled: false, isPartiallyFilled: false, isUnfilled: true, price: 0 };
    } catch (e) {
      console.error("[KIS Service] checkOrderExecution error:", e);
      return { found: false, isFullyFilled: false, isPartiallyFilled: false, isUnfilled: true, price: 0, error: e };
    }
  }

  public async orderDomestic(symbol: string, side: 'BUY' | 'SELL', price: string, qty: string, ordDvsn: string = '00') {
    if (!this.config) throw new Error("KIS Config not initialized");
    return this.queueRequest(async () => {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/domestic-stock/v1/trading/order-cash';
      
      // SLL_TYPE is required for domestic stock sell orders
      // 01: General Cash Sell
      const body: any = {
        CANO: this.config.accountNo,
        ACNT_PRDT_CD: this.config.accountCode,
        PDNO: symbol,
        ORD_DVSN: ordDvsn, // 00 for Limit, 01 for Market
        ORD_QTY: qty,
        ORD_UNPR: ordDvsn === '01' ? '0' : price,
      };

      if (side === 'SELL') {
        body.SLL_TYPE = '01'; // Default to 01 (General Cash Sell)
      }

      const hashkey = await this.getHashKey(body);

      const isVirtual = this.baseUrl.includes('openapivts');
      const trId = isVirtual
        ? (side === 'BUY' ? 'VTTC0802U' : 'VTTC0801U')
        : (side === 'BUY' ? 'TTTC0802U' : 'TTTC0801U');

      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': trId,
        'hashkey': hashkey,
        'custtype': 'P',
      };

      const res = await axios.post(`${this.baseUrl}${endpoint}`, body, { headers });
      if (res.data.rt_cd && res.data.rt_cd !== '0') {
        if (res.data.msg_cd === 'EGW00201' || res.data.msg1?.includes('초당 거래건수')) {
          throw new Error(`[429] ${res.data.msg1}`);
        }
        throw new Error(`국내 주문 실패: ${res.data.msg1} (${res.data.msg_cd})`);
      }
      return res.data;
    });
  }

  public async cancelDomesticOrder(orgNo: string, ordNo: string, qty: string) {
    return this.reviseDomestic(orgNo, ordNo, qty, "0", '02');
  }

  public async reviseDomestic(orgNo: string, ordNo: string, qty: string, price: string, dvsn: '01' | '02' = '01', ordDvsn: string = '00') {
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    const endpoint = '/uapi/domestic-stock/v1/trading/order-rvsecncl';
    
    // KIS OpenAPI specifications for order revision / cancellation:
    // 1. ORGN_ODNO (Original Order No): MUST be 10 digits string padded with leading zeros
    const formattedOrdNo = ordNo ? ordNo.toString().trim().padStart(10, '0') : '';
    
    // 2. KRX_FWDG_ORD_ORGNO: Exchange order organization no (5 chars, or empty string if not applicable)
    const formattedOrgNo = orgNo ? orgNo.toString().trim() : '';

    // 3. QTY_ALL_ORD_YN & ORD_QTY:
    // When cancelling full remaining quantity (dvsn === '02'), QTY_ALL_ORD_YN = 'Y' and ORD_QTY = '0' per KIS spec.
    const isCancel = dvsn === '02';
    const allOrdYn = isCancel ? 'Y' : (qty && qty !== '0' ? 'N' : 'Y');
    const orderQty = (isCancel || allOrdYn === 'Y') ? '0' : (qty || '0');

    const body = {
      CANO: this.config.accountNo,
      ACNT_PRDT_CD: this.config.accountCode,
      KRX_FWDG_ORD_ORGNO: formattedOrgNo,
      ORGN_ODNO: formattedOrdNo,
      ORD_DVSN: ordDvsn,
      RVSE_CNCL_DVSN_CD: dvsn, // '01': 정정, '02': 취소
      ORD_QTY: orderQty,
      ORD_UNPR: isCancel ? '0' : (price || '0'),
      QTY_ALL_ORD_YN: allOrdYn,
      CNDT_PRIC: '',
      EXCG_ID_DVSN_CD: 'KRX'
    };

    const hashkey = await this.getHashKey(body);

    const isVirtual = this.baseUrl.includes('openapivts');
    // TR_ID: TTTC0803U (실전 주식 정정/취소) / VTTC0803U (모의주식 정정/취소)
    const trId = isVirtual ? 'VTTC0803U' : 'TTTC0803U';

    const headers = {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr-id': trId,
      'hashkey': hashkey,
      'custtype': 'P',
    };

    const res = await axios.post(`${this.baseUrl}${endpoint}`, body, { headers });
    if (res.data.rt_cd && res.data.rt_cd !== '0') {
      console.warn(`[KIS Service] Revise/Cancel Order Result (${res.data.rt_cd}): ${res.data.msg1} (${res.data.msg_cd})`);
    }
    return res.data;
  }

  public async cancelOverseasOrder(orgNo: string, ordNo: string, symbol: string, qty: string) {
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    const endpoint = '/uapi/overseas-stock/v1/trading/order-rvsecncl';

    const formattedOrdNo = ordNo ? ordNo.toString().trim().padStart(10, '0') : '';

    const body = {
      CANO: this.config.accountNo,
      ACNT_PRDT_CD: this.config.accountCode,
      OVRS_EXCG_CD: 'NASD',
      PDNO: symbol,
      ORGN_ODNO: formattedOrdNo,
      RVSE_CNCL_DVSN_CD: '02', // '02': 취소
      ORD_QTY: qty,
      ORD_UNPR: '0',
      MGENA_APLP_YN: 'N'
    };

    const hashkey = await this.getHashKey(body);
    const isVirtual = this.baseUrl.includes('openapivts');
    // TR_ID: TTTS1003U (실전 해외주식 정정/취소) / VTSM1003U (모의 해외주식 정정/취소)
    const trId = isVirtual ? 'VTSM1003U' : 'TTTS1003U';

    const headers = {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr-id': trId,
      'hashkey': hashkey,
      'custtype': 'P',
    };

    const res = await axios.post(`${this.baseUrl}${endpoint}`, body, { headers });
    if (res.data.rt_cd && res.data.rt_cd !== '0') {
      console.warn(`[KIS Service] Overseas Cancel Order Result (${res.data.rt_cd}): ${res.data.msg1} (${res.data.msg_cd})`);
    }
    return res.data;
  }

  public async getDomesticDailyPrice(symbol: string, periodCode: 'D' | 'W' | 'M' = 'D') {
    if (!this.config) return { rt_cd: '1', msg1: "KIS Config not initialized", output: [] };
    try {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/domestic-stock/v1/quotations/inquire-daily-price';
      
      const trId = 'FHKST01010400';
      
      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': trId,
        'custtype': 'P',
      };

      const params = {
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: symbol,
        FID_PERIOD_DIV_CODE: periodCode,
        FID_ORG_ADJ_PRC: '0000000001',
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Domestic Daily Price Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '0', output: [] };
    }
  }

  private lastRequestTime = 0;
  private minRequestInterval = 500; // Minimum 500ms interval between API calls to prevent Rate Limit (EGW00201 / 429)
  private requestQueueChain: Promise<any> = Promise.resolve();

  public async queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    const nextInQueue = this.requestQueueChain.then(async () => {
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;
      if (timeSinceLast < this.minRequestInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLast));
      }
      this.lastRequestTime = Date.now();
      return await this.executeWithBackoff(fn);
    });

    this.requestQueueChain = nextInQueue.catch(() => {});
    return nextInQueue;
  }

  private async executeWithBackoff<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      try {
        return await fn();
      } catch (error: any) {
        const status = error?.response?.status;
        const dataStr = typeof error?.response?.data === 'object' ? JSON.stringify(error?.response?.data) : String(error?.response?.data || error?.message || '');
        
        const isRateLimit = status === 429 || 
          dataStr.includes('429') || 
          dataStr.includes('Too many requests') || 
          dataStr.includes('EGW00201') || 
          dataStr.includes('Edge rate limit') ||
          dataStr.includes('초당 거래건수') ||
          dataStr.includes('Protection triggered');

        if (isRateLimit && attempt < maxRetries) {
          const backoffMs = Math.min(8000, 1000 * Math.pow(2, attempt - 1)); // 1s, 2s, 4s, 8s
          console.warn(`[KIS Edge Rate Limit 429] Retrying attempt ${attempt}/${maxRetries} after ${backoffMs}ms backoff...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else {
          throw error;
        }
      }
    }
    throw new Error("KIS API 요청 제한(429 Rate Limit) 초과: 재시도 횟수를 초과하였습니다.");
  }

  private async throttleRequest() {
    return this.queueRequest(async () => {});
  }

  public async getDomesticPrice(symbol: string, marketCode: string = 'J') {
    if (!this.config) throw new Error("KIS Config not initialized");
    if (!symbol || !/^\d{6}$/.test(symbol)) {
      return null;
    }
    const token = await this.getAccessToken();
    const endpoint = '/uapi/domestic-stock/v1/quotations/inquire-price';
    
    // Official KIS TR-ID for domestic price inquiry (FHKST01010100 is valid for both Real and Virtual accounts)
    const trId = 'FHKST01010100';
    const maxRetries = 5;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Throttle minimum interval between consecutive API requests
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;
      if (timeSinceLast < this.minRequestInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLast));
      }
      this.lastRequestTime = Date.now();

      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': trId,
        'custtype': 'P',
      };

      const params = {
        FID_COND_MRKT_DIV_CODE: marketCode,
        FID_INPUT_ISCD: symbol
      };

      try {
        const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
        
        if (res.data.rt_cd === '0' && res.data.output) {
          return res.data.output;
        }
        
        // If not zero code, check if it's a rate limit error or temporary 500 error
        lastError = res.data.msg1 || res.data.message || res.data.msg_cd || 'Unknown Error';
        
        const isRateLimitOrServerError = 
          typeof lastError === 'string' && (
            lastError.includes('초당') || 
            lastError.includes('초과') || 
            lastError.includes('500') || 
            lastError.includes('대기') ||
            lastError.includes('오류') ||
            res.data.msg_cd === 'EGW00201' || 
            res.data.msg_cd === 'KIS_PROXY_NOTICE'
          );

        if (isRateLimitOrServerError && attempt < maxRetries) {
          const backoff = attempt * 600; // 600ms, 1200ms, 1800ms, 2400ms...
          console.warn(`[KIS Retry] ${symbol} (시도 ${attempt}/${maxRetries}): ${lastError}. ${backoff}ms 대기 후 자동 재시도...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }

        console.warn(`[KIS Service] Domestic Price fetch failed for ${symbol}: ${lastError}`);
        return null;
      } catch (error: any) {
        lastError = error.response?.data?.msg1 || error.message;
        const status = error.response?.status;
        if ((status === 500 || status === 429 || (typeof lastError === 'string' && (lastError.includes('초당') || lastError.includes('초과') || lastError.includes('500') || lastError.includes('status code 500')))) && attempt < maxRetries) {
          const backoff = attempt * 600;
          console.warn(`[KIS HTTP ${status || 'Error'} Retry] ${symbol} (시도 ${attempt}/${maxRetries}): ${lastError}. ${backoff}ms 대기 후 자동 재시도...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
      }
    }
    
    console.warn(`[KIS Service] Domestic Price (${trId}) reached max retries for ${symbol}: ${lastError}`);
    return null;
  }

  public async getDomesticMinuteChart(symbol: string, time: string = '') {
    if (!this.config) return { rt_cd: '1', msg1: "KIS Config not initialized", output2: [] };
    try {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice';

      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': 'FHKST03010200', // Domestic Minute Chart
        'custtype': 'P'
      };

      const params = {
        FID_ETC_CLS_CODE: '',
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: symbol,
        FID_TERM_GUBUN_CODE: '1', // 1: Minute
        FID_INPUT_HOUR_1: time // e.g. "153000" or empty for current
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Domestic Minute Chart Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '0', output2: [] };
    }
  }

  public async getOverseasMinuteChart(symbol: string, excd: string = 'NAS', time: string = '') {
    if (!this.config) return { rt_cd: '1', msg1: "KIS Config not initialized", output2: [] };
    try {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/overseas-price/v1/quotations/inquire-time-itemchartprice';

      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': 'HHDFS76010100', // US Minute Chart
        'custtype': 'P'
      };

      const params = {
        AUTH: '',
        EXCD: excd,
        SYMB: symbol,
        NMIN: '1', // 1 minute
        PINC: '0', // Include current
        NEXT: '',
        FILL: ''
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Overseas Minute Chart Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '0', output2: [] };
    }
  }

  public async getDomesticOvertimePrice(symbol: string, marketCode: string = 'J') {
    if (!this.config) return { rt_cd: '1', msg1: "KIS Config not initialized", output: {} };
    try {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/domestic-stock/v1/quotations/inquire-overtime-price';
      
      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': 'FHPST02300000',
        'custtype': 'P'
      };

      const params = {
        FID_COND_MRKT_DIV_CODE: marketCode,
        FID_INPUT_ISCD: symbol
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Domestic Overtime Price Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '0', output: {} };
    }
  }

  public async getDomesticExecutionInfo(symbol: string, marketCode: string = 'J') {
    if (!this.config) return { rt_cd: '1', msg1: "KIS Config not initialized", output: [] };
    try {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/domestic-stock/v1/quotations/inquire-ccnl';
      
      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': 'FHKST01010300',
        'custtype': 'P'
      };

      const params = {
        FID_COND_MRKT_DIV_CODE: marketCode,
        FID_INPUT_ISCD: symbol
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Domestic Execution Info Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '0', output: [] };
    }
  }

  public async getDomesticOrderbook(symbol: string, marketCode: string = 'J') {
    if (!this.config) return { rt_cd: '1', msg1: "KIS Config not initialized", output1: {}, output2: {} };
    try {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/domestic-stock/v1/quotations/inquire-asking-price-exp-ccn';
      
      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': 'FHKST01010200',
        'custtype': 'P'
      };

      const params = {
        FID_COND_MRKT_DIV_CODE: marketCode,
        FID_INPUT_ISCD: symbol
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      return res.data;
    } catch (error: any) {
      console.warn("[KIS Service] Domestic Orderbook Exception safely caught:", error?.response?.data || error?.message);
      return { rt_cd: '0', output1: {}, output2: {} };
    }
  }

  public async getExchangeRate() {
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    
    // Fallback trials from overseas/present balance endpoints
    const trials = [
      { 
        endpoint: '/uapi/overseas-price/v1/quotations/price', 
        trId: 'HHDFS00000300', 
        symbol: 'NAS@AAPL',
        useAuth: true
      },
      { 
        endpoint: '/uapi/overseas-price/v1/quotations/price', 
        trId: 'HHDFS00000300', 
        symbol: 'NAS@MSFT' 
      },
      { 
        endpoint: '/uapi/overseas-stock/v1/trading/inquire-present-balance', 
        trId: 'TTTS3012R', 
        symbol: '' 
      }
    ];

    for (const trial of trials) {
      try {
        const headers: any = {
          'content-type': 'application/json',
          'authorization': `Bearer ${token}`,
          'appkey': this.config.appKey,
          'appsecret': this.config.appSecret,
          'tr-id': trial.trId,
          'custtype': 'P'
        };
        
        const params: any = {
          FID_COND_MRKT_DIV_CODE: 'U',
          FID_INPUT_ISCD: (trial as any).symbol || 'AAPL'
        };

        if (trial.endpoint.includes('balance') || trial.trId === 'TTTS3012R') {
          params.CANO = this.config.accountNo;
          params.ACNT_PRDT_CD = this.config.accountCode;
          params.OVRS_EXGI_CD = 'NASD';
          params.TR_CRC_CD = 'USD';
          params.CTX_AREA_FK200 = '';
          params.CTX_AREA_NK200 = '';
          params.CANO_PWD = this.config.accountPw || '';
        }

        const res = await axios.get(`${this.baseUrl}${trial.endpoint}`, { headers, params });
        if (res?.data?.rt_cd === '0') {
          // Check for exchange rate in various common output fields
          const out1 = res.data.output || res.data.output1;
          const out2 = res.data.output2;
          
          const data1 = Array.isArray(out1) ? out1[0] : out1;
          const data2 = Array.isArray(out2) ? out2[0] : out2;
          
          const rate = data1?.fx_rt || data1?.last || data1?.t_xrt || data1?.frcr_buy_mgn_rt || 
                       data2?.frst_bltn_exrt || data2?.fx_rt;
          
          if (rate && Number(rate) > 500) {
            console.log(`[KIS Service] Exchange rate found via ${trial.trId}: ${rate}`);
            return [{ fx_rt: rate.toString() }];
          }
        }
      } catch (e) {
        console.warn(`[KIS Service] Exchange rate trial failed for ${trial.endpoint} (${trial.trId})`, e);
      }
    }
    
    return [{ fx_rt: '1400.00' }]; 
  }

  public async getWebsocketApprovalKey() {
    if (!this.config) throw new Error("KIS Config not initialized");
    const endpoint = '/oauth2/Approval';
    
    const payload = {
      grant_type: 'client_credentials',
      appkey: this.config.appKey,
      appsecret: this.config.appSecret
    };

    const res = await axios.post(`${this.baseUrl}${endpoint}`, payload, {
      headers: {
        'content-type': 'application/json'
      }
    });

    return res.data.approval_key;
  }

  public async revokeToken() {
    if (!this.config || !this.accessToken) return;
    const endpoint = '/oauth2/revokeP';
    
    const payload = {
      appkey: this.config.appKey,
      appsecret: this.config.appSecret,
      token: this.accessToken
    };

    try {
      const res = await axios.post(`${this.baseUrl}${endpoint}`, payload, {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json'
        }
      });
      
      this.accessToken = null;
      this.tokenExpireTime = 0;
      return res.data;
    } catch (error) {
      console.error("Token Revoke Error:", error);
      throw error;
    }
  }

  public async refreshAccessToken() {
    this.accessToken = null;
    this.tokenExpireTime = 0;
    return await this.getAccessToken();
  }

  public getTokenStatus() {
    if (!this.accessToken) return 'missing';
    if (Date.now() >= this.tokenExpireTime) return 'expired';
    return {
      status: 'valid',
      expiresAt: this.tokenExpireTime
    };
  }
}

export const kisService = new KISService();
