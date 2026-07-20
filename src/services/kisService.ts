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
  isRealServer?: boolean;
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
    this.config = config;
    
    // Add request interceptor to append the isRealServer header dynamically
    if (!(axios as any)._kisInterceptorAdded) {
      (axios as any)._kisInterceptorAdded = true;
      axios.interceptors.request.use((reqConfig: any) => {
        if (reqConfig.url?.includes('/api/kis') && this.config) {
          reqConfig.headers = reqConfig.headers || {};
          reqConfig.headers['x-is-real-server'] = this.config.isRealServer === false ? 'false' : 'true';
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

  private async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    if (this.pendingTokenPromise) {
      return this.pendingTokenPromise;
    }

    if (!this.config) throw new Error("KIS Config not initialized");

    this.pendingTokenPromise = (async () => {
      try {
        const endpoint = '/oauth2/tokenP';
        const payload = {
          grant_type: 'client_credentials',
          appkey: this.config!.appKey,
          appsecret: this.config!.appSecret
        };

        const res = await axios.post(`${this.baseUrl}${endpoint}`, payload, { 
          headers: {
            ...this.headers,
            'Content-Type': 'application/json'
          } 
        });
        
        if (!res.data.access_token) {
          throw new Error(`Token request failed: ${res.data.msg1 || 'Unknown error'}`);
        }

        const newAccessToken = res.data.access_token;
        // Buffer for safety (1 hour before actual expiry or 23h since token lasts 24h)
        const newExpireTime = Date.now() + (Number(res.data.expires_in || 86400) - 3600) * 1000;
        
        this.accessToken = newAccessToken;
        this.tokenExpireTime = newExpireTime;

        if (this.onTokenUpdate) {
          this.onTokenUpdate(newAccessToken, newExpireTime);
        }
        
        return this.accessToken;
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
    
    try {
      const token = await this.getAccessToken();
      const endpoint = '/uapi/overseas-stock/v1/trading/order';
      
      let trId = side === 'BUY' ? 'TTTS1002U' : 'TTTS1006U';

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
        throw new Error(`해외 주문 실패: ${res.data.msg1} (${res.data.msg_cd})`);
      }
      return res.data;
    } catch (error: any) {
      console.error("KIS Overseas Order Exception:", error.response?.data || error.message);
      throw error;
    }
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
    
    // US Balance: TTTS3012R
    const trId = 'TTTS3012R';
    
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
            headers['tr-id'] = 'TTTS3010R';
            const retryRes = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
            if (retryRes.data.rt_cd === '0') return retryRes.data;
         }
         throw new Error(`KIS 해외 잔고 조회 실패: ${res.data.msg1} (${res.data.msg_cd})`);
      }
      return res.data;
    } catch (error: any) {
      throw error;
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
    
    const headers: any = {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr-id': 'TTTC8434R',
      'tr-cont': '',
      'custtype': 'P',
    };

    const params = {
      CANO: this.config.accountNo,
      ACNT_PRDT_CD: this.config.accountCode,
      AFHR_FLPR_YN: 'N',
      OFL_YN: '',
      INQR_DVSN: '01',
      UNPR_DVSN: '01',
      FUND_STTL_ICLD_YN: 'N',
      FNCG_AMT_AUTO_RDPT_YN: 'N',
      PRCS_DVSN: '01',
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
        throw new Error(`KIS Domestic Balance Error: ${res.data.msg1} (${res.data.msg_cd})`);
      }
      return res.data;
    } catch (error: any) {
       throw error;
    }
  }

  public async getDomesticBuyableAmount(symbol: string, price: string = '0', ordDvsn: string = '01') {
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    const endpoint = '/uapi/domestic-stock/v1/trading/inquire-psbl-order';
    
    const headers = {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr-id': 'TTTC8908R',
      'custtype': 'P',
    };

    const params = {
      CANO: this.config.accountNo,
      ACNT_PRDT_CD: this.config.accountCode,
      PDNO: symbol,
      ORD_UNPR: ordDvsn === '00' ? price : '0',
      ORD_DVSN: ordDvsn,
      CMA_EVLU_AMT_ICLD_YN: 'N',
      OVRS_ICLD_YN: 'N',
      CANO_PWD: this.config.accountPw || ''
    };

    const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
    return res.data;
  }

  public async getDomesticSellableQuantity(symbol: string) {
    if (!this.config) throw new Error("KIS Config not initialized");

    const token = await this.getAccessToken();
    const endpoint = '/uapi/domestic-stock/v1/trading/inquire-psbl-sell';
    
    const headers = {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr-id': 'TTTC8408R',
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
  }

  public async getPeriodTradeProfit(startDate: string, endDate: string, symbol: string = '', sortDvsn: string = '02') {
    if (!this.config) throw new Error("KIS Config not initialized");

    const token = await this.getAccessToken();
    const endpoint = '/uapi/domestic-stock/v1/trading/inquire-period-trade-profit';

    const headers = {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr-id': 'TTTC8715R',
      'custtype': 'P',
    };

    const params = {
      CANO: this.config.accountNo,
      ACNT_PRDT_CD: this.config.accountCode,
      SORT_DVSN: sortDvsn,
      PDNO: symbol,
      INQR_STRT_DT: startDate,
      INQR_END_DT: endDate,
      CTX_AREA_NK100: '',
      CBLC_DVSN: '00',
      CTX_AREA_FK100: ''
    };

    const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
    return res.data;
  }

  public async getDomesticOrderExecutions(startDate: string, endDate: string, oderFg: '00' | '01' | '02' = '00', prcsDvsn: '00' | '01' | '02' = '00') {
    if (!this.config) throw new Error("KIS Config not initialized");

    const token = await this.getAccessToken();
    const endpoint = '/uapi/domestic-stock/v1/trading/inquire-ccnl';
    
    const headers = {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr-id': this.config.isRealServer === false ? 'VTTC8001R' : 'TTTC8001R',
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
  }

  public async checkOrderExecution(odno: string) {
    if (!this.config) throw new Error("KIS Config not initialized");
    
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    try {
      const res = await this.getDomesticOrderExecutions(todayStr, todayStr);
      if (res && res.rt_cd === '0' && res.output1 && Array.isArray(res.output1)) {
        const order = res.output1.find((item: any) => item.odno === odno);
        if (order) {
          const ordQty = Number(order.ord_qty || 0);
          const ccldQty = Number(order.tot_ccld_qty || 0);
          const rmndQty = Number(order.rmnd_qty || 0);
          const prpr = Number(order.avg_prvs || order.ord_unpr || 0);
          
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
    try {
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

      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': side === 'BUY' ? 'TTTC0012U' : 'TTTC0011U',
        'hashkey': hashkey,
        'custtype': 'P',
      };

      const res = await axios.post(`${this.baseUrl}${endpoint}`, body, { headers });
      if (res.data.rt_cd && res.data.rt_cd !== '0') {
        throw new Error(`국내 주문 실패: ${res.data.msg1} (${res.data.msg_cd})`);
      }
      return res.data;
    } catch (error: any) {
      console.error("KIS Domestic Order Exception:", error.response?.data || error.message);
      throw error;
    }
  }

  public async reviseDomestic(orgNo: string, ordNo: string, qty: string, price: string, dvsn: '01' | '02' = '01', ordDvsn: string = '00') {
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    const endpoint = '/uapi/domestic-stock/v1/trading/order-rvsecncl';
    
    const body = {
      CANO: this.config.accountNo,
      ACNT_PRDT_CD: this.config.accountCode,
      KRX_FWDG_ORD_ORGNO: orgNo,
      ORGN_ODNO: ordNo,
      ORD_DVSN: ordDvsn,
      RVSE_CNCL_DVSN_CD: dvsn,
      ORD_QTY: qty,
      ORD_UNPR: price,
      QTY_ALL_ORD_YN: 'Y',
      CNDT_PRIC: '',
      EXCG_ID_DVSN_CD: 'KRX'
    };

    const hashkey = await this.getHashKey(body);

    const headers = {
      'content-type': 'application/json',
      'authorization': `Bearer ${token}`,
      'appkey': this.config.appKey,
      'appsecret': this.config.appSecret,
      'tr-id': 'TTTC0013U',
      'hashkey': hashkey,
      'custtype': 'P',
    };

    const res = await axios.post(`${this.baseUrl}${endpoint}`, body, { headers });
    return res.data;
  }

  public async getDomesticDailyPrice(symbol: string, periodCode: 'D' | 'W' | 'M' = 'D') {
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    const endpoint = '/uapi/domestic-stock/v1/quotations/inquire-daily-price';
    
    // Daily Price: FHKST01010400
    const trId = 'FHKST01010400';
    console.log(`[KIS Service] Domestic Daily Price TR-ID: ${trId} for ${symbol}`);
    
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
  }

  public async getDomesticPrice(symbol: string, marketCode: string = 'J') {
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    const endpoint = '/uapi/domestic-stock/v1/quotations/inquire-price';
    
    // TR-IDs to try: FHKST01010100 (Real), SHKST01010100 (Virtual Stock)
    const trIds = ['FHKST01010100', 'SHKST01010100'];
    
    let lastError = null;

    for (const trId of trIds) {
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
        
        // If not zero code, it might be a TR-ID mismatch or other error
        lastError = res.data.msg1 || res.data.message || 'Unknown Error';
        console.warn(`[KIS Service] Domestic Price Trial (${trId}) failed for ${symbol}: ${lastError}`);
      } catch (error: any) {
        lastError = error.message;
      }
    }
    
    throw new Error(`주가 조회 실패: ${lastError}`);
  }

  public async getDomesticMinuteChart(symbol: string, time: string = '') {
    if (!this.config) throw new Error("KIS Config not initialized");
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
  }

  public async getOverseasMinuteChart(symbol: string, excd: string = 'NAS', time: string = '') {
    if (!this.config) throw new Error("KIS Config not initialized");
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
  }

  public async getDomesticOvertimePrice(symbol: string, marketCode: string = 'J') {
    if (!this.config) throw new Error("KIS Config not initialized");
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
  }

  public async getDomesticExecutionInfo(symbol: string, marketCode: string = 'J') {
    if (!this.config) throw new Error("KIS Config not initialized");
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
  }

  public async getExchangeRate() {
    if (!this.config) throw new Error("KIS Config not initialized");
    const token = await this.getAccessToken();
    
    // 1. Try real-time Current Price for FX symbol (FX@KFX_USDKRW)
    try {
      const endpoint = '/uapi/domestic-stock/v1/quotations/inquire-price';
      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': 'FHKST01010100', 
        'custtype': 'P'
      };
      
      const params = {
        FID_COND_MRKT_DIV_CODE: 'U',
        FID_INPUT_ISCD: 'FX@KFX_USDKRW'
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      if (res?.data?.rt_cd === '0' && res.data.output) {
        const rate = res.data.output.stck_prpr; // Current FX Rate
        if (rate && Number(rate) > 500) {
          return [{ fx_rt: rate.toString() }];
        }
      }
    } catch (e) {
      console.warn("[KIS Service] Real-time FX symbol fetch failed", e);
    }
    
    // 2. Try Domestic Daily Price (Historical/Backup)
    try {
      const endpoint = '/uapi/domestic-stock/v1/quotations/inquire-daily-price';
      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': this.config.appKey,
        'appsecret': this.config.appSecret,
        'tr-id': 'FHKST01010400',
        'custtype': 'P'
      };
      
      const params = {
        FID_COND_MRKT_DIV_CODE: 'U',
        FID_INPUT_ISCD: 'FX@KFX_USDKRW',
        FID_PERIOD_DIV_CODE: 'D',
        FID_ORG_ADJ_PRC: '0000000001'
      };

      const res = await axios.get(`${this.baseUrl}${endpoint}`, { headers, params });
      if (res?.data?.rt_cd === '0' && res.data.output?.[0]) {
        const rate = res.data.output[0].stck_prpr; // Current FX Rate
        if (rate && Number(rate) > 500) {
          return [{ fx_rt: rate.toString() }];
        }
      }
    } catch (e) {
      console.warn("[KIS Service] Daily FX rate fetch failed", e);
    }
    
    // 3. Fallback trials from other endpoints (Same robust way as valuation)
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
