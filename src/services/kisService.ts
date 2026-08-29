import axios from 'axios';
import { Stock } from '../types';

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
  private tokenIssuedTime: number = 0;
  private pendingTokenPromise: Promise<string> | null = null;
  private onTokenUpdate: ((token: string, expiresAt: number, issuedAt: number) => void) | null = null;

  private get baseUrl() {
    return '/api/kis';
  }

  private get headers() {
    return {
      'custtype': 'P'
    };
  }

public generateRealtimeRecommendations(
  stocks: Stock[],
  detectStockStrategies: (stock: Stock) => any
): ScalperRecommendation[] {

  return stocks
    .map(stock => {

      const strat =
        detectStockStrategies(stock);

      let score = 0;

      if (strat.isPullback) score += 25;
      if (strat.isBreakout) score += 25;
      if (strat.isVwapSupport) score += 25;
      if (strat.isVolumeProfile) score += 25;

      if (strat.hasVolumeMomentum)
        score += 10;

      if (strat.activeCount === 4)
        score += 30;

      score = Math.min(score, 100);

      const grade: 'SSS' | 'SS' | 'S' | 'A+' =
        score >= 95 ? 'SSS' :
        score >= 85 ? 'SS' :
        score >= 70 ? 'S' :
        'A+';

      return {
        rank: 0,

        symbol: stock.symbol,
        name: stock.name,

        marketType: (stock.market === 'US' ? 'KOSDAQ' : 'KOSPI') as 'KOSPI' | 'KOSDAQ',

        price: stock.price,

        change: stock.change || 0,

        changePercent:
          stock.changePercent || 0,

        volume:
          stock.volume || '0',

        tradeAmount: '-',

        volumeSurgeRate:
          strat.hasVolumeMomentum
            ? 200
            : 100,

        volumeIntensity:
          100 + strat.activeCount * 20,

        scalpingScore: score,

        grade,

        category: (
          strat.isVolumeProfile
            ? 'CVD_FLOW'
            : strat.isVwapSupport
            ? 'VWAP_SUPPORT'
            : strat.isBreakout
            ? 'MOMENTUM_BREAKOUT'
            : 'SUPPORT_REBOUND'
        ) as 'VOLUME_SURGE' | 'MOMENTUM_BREAKOUT' | 'SUPPORT_REBOUND' | 'VWAP_SUPPORT' | 'CVD_FLOW',

        targetPrice:
          Math.round(
            stock.price * 1.02
          ),

        stopLoss:
          Math.round(
            stock.price * 0.985
          ),

        expectedReturn:
          Number(
            (score / 30).toFixed(2)
          ),

        rsi:
          Number(strat.rsi || 50),

        reason:
          `${strat.activeCount}/4 전략 충족`,

        tags: [
          strat.isPullback && '#눌림목',
          strat.isBreakout && '#돌파',
          strat.isVwapSupport && '#VWAP',
          strat.isVolumeProfile && '#CVD'
        ].filter(Boolean) as string[],

        holdingTime:
          '3분 ~ 15분'
      };
    })
    .sort(
      (a, b) =>
        b.scalpingScore -
        a.scalpingScore
    )
    .map((item, idx) => ({
      ...item,
      rank: idx + 1
    }))
    .slice(0, 10);
}


  public init(config: KISConfig, savedToken?: string, savedExpiresAt?: number, savedIssuedAt?: number) {
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

    const now = Date.now();
    const localToken = localStorage.getItem('sleek_kis_token') || undefined;
    const localExpires = Number(localStorage.getItem('sleek_kis_token_expires') || 0);
    const localIssued = Number(localStorage.getItem('sleek_kis_token_issued') || 0);

    const firestoreToken = savedToken;
    const firestoreExpires = Number(savedExpiresAt || 0);
    const firestoreIssued = Number(savedIssuedAt || 0);

    // Pick whichever valid token is newest and unexpired
    let chosenToken: string | null = null;
    let chosenExpires = 0;
    let chosenIssued = 0;

    if (firestoreToken && firestoreExpires > now) {
      chosenToken = firestoreToken;
      chosenExpires = firestoreExpires;
      chosenIssued = firestoreIssued || (firestoreExpires - 24 * 3600 * 1000);
    }

    if (localToken && localExpires > now && localExpires >= chosenExpires) {
      chosenToken = localToken;
      chosenExpires = localExpires;
      chosenIssued = localIssued || (localExpires - 24 * 3600 * 1000);
    }

    if (this.accessToken && this.tokenExpireTime > now && this.tokenExpireTime >= chosenExpires) {
      chosenToken = this.accessToken;
      chosenExpires = this.tokenExpireTime;
      chosenIssued = this.tokenIssuedTime;
    }

    if (chosenToken && chosenExpires > now) {
      this.accessToken = chosenToken;
      this.tokenExpireTime = chosenExpires;
      this.tokenIssuedTime = chosenIssued || (chosenExpires - 24 * 3600 * 1000);
      try {
        localStorage.setItem('sleek_kis_token', chosenToken);
        localStorage.setItem('sleek_kis_token_expires', String(chosenExpires));
        localStorage.setItem('sleek_kis_token_issued', String(this.tokenIssuedTime));
      } catch {}
    } else {
      if (!this.accessToken || this.tokenExpireTime <= now) {
        this.accessToken = null;
        this.tokenExpireTime = 0;
        this.tokenIssuedTime = 0;
      }
    }
  }

  public setTokenUpdateHandler(handler: (token: string, expiresAt: number, issuedAt: number) => void) {
    this.onTokenUpdate = handler;
  }

  public getTokenInfo() {
    const now = Date.now();
    
    // Check localStorage if memory is empty
    if (!this.accessToken) {
      const storedToken = localStorage.getItem('sleek_kis_token');
      const storedExpires = Number(localStorage.getItem('sleek_kis_token_expires') || 0);
      const storedIssued = Number(localStorage.getItem('sleek_kis_token_issued') || 0);
      if (storedToken && storedExpires > now) {
        this.accessToken = storedToken;
        this.tokenExpireTime = storedExpires;
        this.tokenIssuedTime = storedIssued || (storedExpires - 24 * 3600 * 1000);
      }
    }

    const hasToken = !!this.accessToken;
    const isExpired = !this.accessToken || now >= this.tokenExpireTime;
    const remainingMs = Math.max(0, this.tokenExpireTime - now);
    const totalRemainingSeconds = Math.floor(remainingMs / 1000);
    const totalRemainingMinutes = Math.floor(remainingMs / (60 * 1000));
    const remainingHours = Math.floor(remainingMs / (3600 * 1000));
    const remainingMinutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
    const remainingSeconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
    const needsRenewal = isExpired || totalRemainingMinutes <= 15;

    // Formatting
    let formattedRemaining = "미발급";
    if (hasToken) {
      if (isExpired) {
        formattedRemaining = "만료됨 (재발급 필요)";
      } else if (remainingHours > 0) {
        formattedRemaining = `${remainingHours}시간 ${String(remainingMinutes).padStart(2, '0')}분`;
      } else if (remainingMinutes > 0) {
        formattedRemaining = `${remainingMinutes}분 ${String(remainingSeconds).padStart(2, '0')}초`;
      } else {
        formattedRemaining = `${remainingSeconds}초`;
      }
    }

    return {
      token: this.accessToken,
      hasToken,
      issuedAt: this.tokenIssuedTime,
      expiresAt: this.tokenExpireTime,
      isExpired,
      remainingMs,
      remainingHours,
      remainingMinutes,
      remainingSeconds,
      totalRemainingMinutes,
      totalRemainingSeconds,
      needsRenewal,
      formattedRemaining
    };
  }

  public async getAccessTokenPublic(): Promise<string> {
    return this.getAccessToken();
  }

  public async forceRefreshToken(): Promise<string> {
    this.accessToken = null;
    this.tokenExpireTime = 0;
    this.tokenIssuedTime = 0;
    localStorage.removeItem('sleek_kis_token');
    localStorage.removeItem('sleek_kis_token_expires');
    localStorage.removeItem('sleek_kis_token_issued');
    return this.getAccessToken();
  }

  public clear() {
    this.config = null;
    this.accessToken = null;
    this.tokenExpireTime = 0;
    this.tokenIssuedTime = 0;
    localStorage.removeItem('sleek_kis_token');
    localStorage.removeItem('sleek_kis_token_expires');
    localStorage.removeItem('sleek_kis_token_issued');
  }

  private async getAccessToken() {
    // 24-hour token validity check: Reuse existing token if still valid
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    // Check localStorage in case another tab or component saved it
    const storedToken = localStorage.getItem('sleek_kis_token');
    const storedExpires = Number(localStorage.getItem('sleek_kis_token_expires') || 0);
    const storedIssued = Number(localStorage.getItem('sleek_kis_token_issued') || 0);
    if (storedToken && storedExpires && Date.now() < storedExpires) {
      this.accessToken = storedToken;
      this.tokenExpireTime = storedExpires;
      this.tokenIssuedTime = storedIssued || (storedExpires - 24 * 3600 * 1000);
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
        const now = Date.now();
        const expiresInSec = Number(res.data.expires_in || 86400); // 24 hours
        // Set expiry buffer to 23.5 hours for full 24h cycle
        const newExpireTime = now + (expiresInSec > 1800 ? expiresInSec - 1800 : expiresInSec) * 1000;
        const issuedAt = now;
        
        this.accessToken = newAccessToken;
        this.tokenExpireTime = newExpireTime;
        this.tokenIssuedTime = issuedAt;

        // Persist for 24-hour cross-session reuse
        localStorage.setItem('sleek_kis_token', newAccessToken);
        localStorage.setItem('sleek_kis_token_expires', String(newExpireTime));
        localStorage.setItem('sleek_kis_token_issued', String(issuedAt));

        if (this.onTokenUpdate) {
          this.onTokenUpdate(newAccessToken, newExpireTime, issuedAt);
        }
        
        return this.accessToken;
      } catch (error: any) {
        this.accessToken = null;
        this.tokenExpireTime = 0;
        this.tokenIssuedTime = 0;
        localStorage.removeItem('sleek_kis_token');
        localStorage.removeItem('sleek_kis_token_expires');
        localStorage.removeItem('sleek_kis_token_issued');

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
    try {
      const res = await axios.post(`${this.baseUrl}/uapi/hashkey`, body, {
        headers: { 'content-type': 'application/json', 'appkey': this.config.appKey, 'appsecret': this.config.appSecret }
      });
      return res.data.HASH || '';
    } catch { return ''; }
  }

  // --- Unified / Router Methods (Main Interface) ---
  // Currently prioritized for Domestic Stocks as requested.

  public async getBalance() {
    // Current API points to Domestic Balance as requested
    return this.getDomesticBalance();
  }

  private static priceQueue: Promise<void> = Promise.resolve();

  public async getPrice(symbol: string): Promise<NormalizedPrice | null> {
    // Serialize and throttle requests to prevent 429
    const delay = () => new Promise(r => setTimeout(r, 600));
    const release = await new Promise<() => void>(resolve => {
      const next = () => resolve(() => {});
      KISService.priceQueue = KISService.priceQueue.then(async () => {
        next();
        await delay();
      });
    });

    try {
      return await this._getPriceInternal(symbol);
    } finally {
      release();
    }
  }

  private async _getPriceInternal(symbol: string): Promise<NormalizedPrice | null> {
    // Determine if KR or US (approximate)
    const isKR = /^\d{6}$/.test(symbol);
    try {
      if (isKR) {
        if (this.config) {
          const data = await this.getDomesticPrice(symbol);
          if (data && data.stck_prpr) {
            const isFalling = data.prdy_vrss_sign === '4' || data.prdy_vrss_sign === '5';
            const rawChange = Math.abs(Number(data.prdy_vrss || 0));
            const change = isFalling ? -rawChange : rawChange;
            const rawPercent = Math.abs(Number(data.prdy_ctrt || 0));
            const changePercent = isFalling ? -rawPercent : rawPercent;
            const current = Number(data.stck_prpr || 0);
            const prevClose = Number(data.stck_sdpr || (current - change));

            return {
              current,
              prevClose: prevClose > 0 ? prevClose : (current - change),
              change,
              changePercent,
              volume: Number(data.acml_vol || 0).toLocaleString(),
              name: data.hts_kor_isnm || undefined
            };
          }
        }

        // Live fallback via Universal Quote Resolver
        try {
          const resp = await axios.get(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`, { timeout: 3500 });
          if (resp.data && resp.data.price) {
            return {
              current: Number(resp.data.price),
              prevClose: Number(resp.data.prevClose || (resp.data.price - (resp.data.change || 0))),
              change: Number(resp.data.change || 0),
              changePercent: Number(resp.data.changePercent || 0),
              volume: String(resp.data.volume || '0'),
              name: resp.data.name || undefined
            };
          }
        } catch {
          // ignore
        }
      } else {
        if (this.config) {
          const data = await this.getOverseasPrice(symbol);
          if (data && data.last) {
            const current = Number(data.last);
            const prevClose = Number(data.base);
            const change = Number(data.diff || (current - prevClose));
            const changePercent = Number(data.rate || (prevClose > 0 ? (change / prevClose) * 100 : 0));
            
            return {
              current,
              prevClose: prevClose > 0 ? prevClose : (current - change),
              change,
              changePercent,
              volume: data.tvol || '0',
              name: data.name || data.orgr_isnm || undefined
            };
          }
        }

        // Live fallback for US quotes
        try {
          const resp = await axios.get(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`, { timeout: 3500 });
          if (resp.data && resp.data.price) {
            return {
              current: Number(resp.data.price),
              prevClose: Number(resp.data.prevClose || (resp.data.price - (resp.data.change || 0))),
              change: Number(resp.data.change || 0),
              changePercent: Number(resp.data.changePercent || 0),
              volume: String(resp.data.volume || '0'),
              name: resp.data.name || undefined
            };
          }
        } catch {
          // ignore
        }
      }
    } catch (e) {
      console.warn(`[KIS Service] Failed to fetch price for ${symbol}:`, e);
    }
    return null;
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
      return this.orderOverseas(symbol, qty, price, side === 'BUY');
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

    public async getOverseasBuyableAmount(symbol: string, price: string = '0', ovrsExchCd: string = 'NASD'): Promise<any> {
    return { rt_cd: '0', msg1: '', output: { max_ord_psbl_qty: '0', frcr_ord_psbl_amt1: '0', ord_psbl_frcr_amt: '0', frcr_ord_psbl_amt: '0', ovrs_ord_psbl_amt: '0', nrcy_buy_qty: '0', ord_psbl_qty: '0', max_buy_qty: '0', max_ord_qty: '0' } };
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

  public async cancelOrder(symbol: string, orgNo: string, ordNo: string, qty: string, ordDvsn: string = '00') {
    const isKR = /^\d{6}$/.test(symbol);
    if (isKR) {
      return this.cancelDomesticOrder(orgNo, ordNo, qty, ordDvsn);
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

console.log(
  '[KIS BUY SEND]',
  {
    symbol,
    qty,
    price,
    ordDvsn,
    side
  }
);



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

  public async cancelDomesticOrder(orgNo: string, ordNo: string, qty: string, ordDvsn: string = '00') {
    return this.reviseDomestic(orgNo, ordNo, qty, "0", '02', ordDvsn);
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
    return { rt_cd: "0", msg1: "Deleted", output: {} };

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
    return { rt_cd: '0', msg1: '', output2: [] };
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

  public async fetchLiveOrderbook(symbol: string): Promise<any> {
    const isKR = /^\d{6}$/.test(symbol);
    if (!isKR) return null;

    // 1. Try KIS API if configured
    if (this.config) {
      try {
        const data = await this.getDomesticOrderbook(symbol);
        const o1 = data?.output1;
        if (o1 && o1.askp1 && o1.bidp1) {
          const askLevels = [
            Number(o1.askp4 || 0),
            Number(o1.askp3 || 0),
            Number(o1.askp2 || 0),
            Number(o1.askp1 || 0)
          ].filter(p => p > 0);

          const askVolumes = [
            Number(o1.askp_rsqn4 || 0),
            Number(o1.askp_rsqn3 || 0),
            Number(o1.askp_rsqn2 || 0),
            Number(o1.askp_rsqn1 || 0)
          ];

          const bidLevels = [
            Number(o1.bidp1 || 0),
            Number(o1.bidp2 || 0),
            Number(o1.bidp3 || 0),
            Number(o1.bidp4 || 0)
          ].filter(p => p > 0);

          const bidVolumes = [
            Number(o1.bidp_rsqn1 || 0),
            Number(o1.bidp_rsqn2 || 0),
            Number(o1.bidp_rsqn3 || 0),
            Number(o1.bidp_rsqn4 || 0)
          ];

          if (askLevels.length > 0 && bidLevels.length > 0) {
            const totalAsk = Number(o1.total_askp_rsqn || askVolumes.reduce((a, b) => a + b, 0));
            const totalBid = Number(o1.total_bidp_rsqn || bidVolumes.reduce((a, b) => a + b, 0));
            const sum = (totalAsk + totalBid) || 1;
            const maxLevelVol = Math.max(...askVolumes, ...bidVolumes, 1);

            return {
              symbol,
              isRealData: true,
              askLevels,
              askVolumes,
              bidLevels,
              bidVolumes,
              totalAskVolume: totalAsk,
              totalBidVolume: totalBid,
              askPctVal: ((totalAsk / sum) * 100).toFixed(1),
              bidPctVal: ((totalBid / sum) * 100).toFixed(1),
              maxLevelVol
            };
          }
        }
      } catch (e) {
        console.warn("[KIS Service] Fetch Orderbook via KIS failed, falling back:", e);
      }
    }

    // 2. Fallback to /api/stocks/orderbook
    try {
      const resp = await axios.get(`/api/stocks/orderbook?symbol=${encodeURIComponent(symbol)}`, { timeout: 3500 });
      if (resp.data && resp.data.isRealData) {
        return resp.data;
      }
    } catch {
      // ignore
    }

    return null;
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
      } catch (e: any) {
        if (e?.response?.status === 429) {
          console.warn(`[KIS Service] 429 Rate Limit for ${trial.trId}. Waiting before next trial...`);
          await new Promise(r => setTimeout(r, 2000));
        } else {
          console.warn(`[KIS Service] Exchange rate trial failed for ${trial.endpoint} (${trial.trId})`, e);
        }
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

  
  public async getOverseasPrice(symbol: string, excd?: string): Promise<any> { return null; }
  public async getOverseasBalance(): Promise<any> { return { rt_cd: '0', msg1: '', output1: [], output2: [], output3: {} }; }
  public async getOverseasOrderableCash(): Promise<any> { return { orderableUsd: 0, usdDeposit: 0, rt_cd: '0', msg1: '' }; }
  public async getOverseasHoldings(): Promise<any> { return { rt_cd: '0', msg1: '', output1: [], output2: [] }; }
  public async orderOverseas(symbol: string, qty: string, price: string, isBuy: boolean, excd: string = 'NASD'): Promise<any> { return { rt_cd: '0', msg1: 'Disabled', output: {} }; }

  public async getScalperRecommendations(): Promise<ScalperRecommendation[]> {
    try {
      const res = await axios.get('/api/stocks/scalper-recommendations', { timeout: 3500 });
      if (res.data && Array.isArray(res.data.recommendations) && res.data.recommendations.length > 0) {
        return res.data.recommendations;
      }
    } catch (error) {
      console.warn("KIS getScalperRecommendations API error, using safe fallback:", error);
    }

    return this.getDefaultScalperRecommendations();
  }

  public getDefaultScalperRecommendations(): ScalperRecommendation[] {
    const rawList: ScalperRecommendation[] = [
      {
        rank: 1,
        symbol: '000660',
        name: 'SK하이닉스',
        marketType: 'KOSPI',
        price: 198000,
        change: 7500,
        changePercent: 3.94,
        volume: '8.8M',
        tradeAmount: '1조 7,424억원',
        volumeSurgeRate: 340,
        volumeIntensity: 185,
        scalpingScore: 98,
        grade: 'SSS' as const,
        category: 'VOLUME_SURGE' as const,
        targetPrice: 204500,
        stopLoss: 195000,
        expectedReturn: 3.28,
        rsi: 64.5,
        reason: '[KOSPI] HBM 공급 확대 및 CVD 실시간 대량 순매수 유입. 호가창 매수 받침이 탄탄하여 초단기 스캘핑 돌파 매매 최적 구간.',
        tags: ['#KOSPI', '#CVD수급집중', '#거래량폭증+340%', '#체결강도185%'],
        theme: 'AI 반도체 HBM 대장주',
        holdingTime: '3분 ~ 10분 (초단타)'
      },
      {
        rank: 2,
        symbol: '012450',
        name: '한화에어로스페이스',
        marketType: 'KOSPI',
        price: 338000,
        change: 15500,
        changePercent: 4.81,
        volume: '1.9M',
        tradeAmount: '6,422억원',
        volumeSurgeRate: 290,
        volumeIntensity: 172,
        scalpingScore: 97,
        grade: 'SSS' as const,
        category: 'MOMENTUM_BREAKOUT' as const,
        targetPrice: 348000,
        stopLoss: 333000,
        expectedReturn: 2.96,
        rsi: 66.8,
        reason: '[KOSPI] 방산 해외 수주 모멘텀으로 직전 고점 강한 양봉 돌파. 5분봉 골든크로스 발생 타점.',
        tags: ['#KOSPI', '#모멘텀돌파', '#K-방산', '#체결강도172%'],
        theme: 'K-방산 우주항공 대장',
        holdingTime: '5분 ~ 15분 (초단타)'
      },
      {
        rank: 3,
        symbol: '005930',
        name: '삼성전자',
        marketType: 'KOSPI',
        price: 77600,
        change: 1800,
        changePercent: 2.37,
        volume: '15.2M',
        tradeAmount: '1조 1,795억원',
        volumeSurgeRate: 210,
        volumeIntensity: 155,
        scalpingScore: 96,
        grade: 'SS' as const,
        category: 'VWAP_SUPPORT' as const,
        targetPrice: 79800,
        stopLoss: 76400,
        expectedReturn: 2.83,
        rsi: 58.4,
        reason: '[KOSPI] 당일 VWAP(기관·외인 거래량 가중평균가) 상단 안정적 지지 확인 후 우상향 추세 필터 통과.',
        tags: ['#KOSPI', '#VWAP지지', '#코스피대장', '#기관평단위'],
        theme: '종합 반도체 대장',
        holdingTime: '5분 ~ 20분 (단기)'
      },
      {
        rank: 4,
        symbol: '267260',
        name: 'HD현대일렉트릭',
        marketType: 'KOSPI',
        price: 348000,
        change: 13000,
        changePercent: 3.88,
        volume: '1.2M',
        tradeAmount: '4,176억원',
        volumeSurgeRate: 260,
        volumeIntensity: 168,
        scalpingScore: 96,
        grade: 'SS' as const,
        category: 'VOLUME_SURGE' as const,
        targetPrice: 358000,
        stopLoss: 343000,
        expectedReturn: 2.87,
        rsi: 62.1,
        reason: '[KOSPI] 북미 초고압 변압기 수주 지속 및 CVD 누적 순매수 자금 유입. 강력한 수급 확인.',
        tags: ['#KOSPI', '#CVD수급집중', '#전력인프라', '#거래량급증'],
        theme: 'AI 전력망 변압기',
        holdingTime: '3분 ~ 12분 (초단타)'
      },
      {
        rank: 5,
        symbol: '064350',
        name: '현대로템',
        marketType: 'KOSPI',
        price: 57200,
        change: 2200,
        changePercent: 4.00,
        volume: '3.5M',
        tradeAmount: '2,002억원',
        volumeSurgeRate: 240,
        volumeIntensity: 160,
        scalpingScore: 95,
        grade: 'SS' as const,
        category: 'MOMENTUM_BREAKOUT' as const,
        targetPrice: 58800,
        stopLoss: 56300,
        expectedReturn: 2.80,
        rsi: 63.4,
        reason: '[KOSPI] K2 전차 수출 기대감으로 당일 전고점 돌파. 체결강도 160% 매수세 집중.',
        tags: ['#KOSPI', '#모멘텀돌파', '#K2전차수출', '#외인순매수'],
        theme: 'K-방산 전차 수출',
        holdingTime: '5분 ~ 15분 (초단타)'
      },
      {
        rank: 6,
        symbol: '042700',
        name: '한미반도체',
        marketType: 'KOSPI',
        price: 118500,
        change: 4500,
        changePercent: 3.95,
        volume: '1.4M',
        tradeAmount: '1,659억원',
        volumeSurgeRate: 215,
        volumeIntensity: 158,
        scalpingScore: 94,
        grade: 'SS' as const,
        category: 'SUPPORT_REBOUND' as const,
        targetPrice: 122000,
        stopLoss: 116500,
        expectedReturn: 2.95,
        rsi: 59.2,
        reason: '[KOSPI] 5분봉 20선 지지선 눌림목 반등 타점 포착. 저위험 고수익 손익비 우수 구간.',
        tags: ['#KOSPI', '#눌림목반등', '#TC본더', '#손익비최상'],
        theme: 'AI 반도체 장비',
        holdingTime: '3분 ~ 15분 (초단타)'
      },
      {
        rank: 7,
        symbol: '034020',
        name: '두산에너빌리티',
        marketType: 'KOSPI',
        price: 21800,
        change: 850,
        changePercent: 4.06,
        volume: '8.2M',
        tradeAmount: '1,787억원',
        volumeSurgeRate: 220,
        volumeIntensity: 155,
        scalpingScore: 93,
        grade: 'S' as const,
        category: 'VWAP_SUPPORT' as const,
        targetPrice: 22500,
        stopLoss: 21400,
        expectedReturn: 3.21,
        rsi: 61.0,
        reason: '[KOSPI] 체코 원전 및 SMR 수주 모멘텀. VWAP 지지선 상단에서 안정적 반등 진행.',
        tags: ['#KOSPI', '#VWAP지지', '#체코원전', '#원전주도'],
        theme: '원전 & 가스터빈',
        holdingTime: '3분 ~ 15분 (초단타)'
      },
      {
        rank: 8,
        symbol: '068270',
        name: '셀트리온',
        marketType: 'KOSPI',
        price: 198500,
        change: 5500,
        changePercent: 2.85,
        volume: '950K',
        tradeAmount: '1,885억원',
        volumeSurgeRate: 190,
        volumeIntensity: 152,
        scalpingScore: 92,
        grade: 'S' as const,
        category: 'SUPPORT_REBOUND' as const,
        targetPrice: 204500,
        stopLoss: 195500,
        expectedReturn: 3.02,
        rsi: 57.8,
        reason: '[KOSPI] 코스피 바이오 대장주. 주요 매물대 지지 후 눌림목 양봉 반등 시그널 확인.',
        tags: ['#KOSPI', '#눌림목반등', '#짐펜트라', '#바이오대장'],
        theme: '바이오 시밀러 대장',
        holdingTime: '5분 ~ 20분 (단기)'
      },
      {
        rank: 9,
        symbol: '001440',
        name: '대한전선',
        marketType: 'KOSPI',
        price: 13800,
        change: 550,
        changePercent: 4.15,
        volume: '6.5M',
        tradeAmount: '897억원',
        volumeSurgeRate: 230,
        volumeIntensity: 162,
        scalpingScore: 92,
        grade: 'S' as const,
        category: 'VOLUME_SURGE' as const,
        targetPrice: 14250,
        stopLoss: 13550,
        expectedReturn: 3.26,
        rsi: 61.2,
        reason: '[KOSPI] 초고압 해저케이블 글로벌 수주 모멘텀. CVD 자금 유입 및 호가창 매수세 우위.',
        tags: ['#KOSPI', '#CVD수급', '#해저케이블', '#전력망'],
        theme: '초고압 전력 케이블',
        holdingTime: '3분 ~ 15분 (초단타)'
      },
      {
        rank: 10,
        symbol: '025820',
        name: '이구산업',
        marketType: 'KOSPI',
        price: 5200,
        change: 280,
        changePercent: 5.69,
        volume: '9.8M',
        tradeAmount: '509억원',
        volumeSurgeRate: 310,
        volumeIntensity: 175,
        scalpingScore: 91,
        grade: 'S' as const,
        category: 'VOLUME_SURGE' as const,
        targetPrice: 5400,
        stopLoss: 5100,
        expectedReturn: 3.85,
        rsi: 65.0,
        reason: '[KOSPI] 구리 원자재 가격 급등 수혜. 장중 거래량 310% 폭증하며 5분봉 돌파 발생.',
        tags: ['#KOSPI', '#구리원자재', '#초단기돌파', '#1만원이하'],
        theme: '비철금속 & 구리소재',
        holdingTime: '3분 ~ 10분 (초단타)'
      },
      {
        rank: 11,
        symbol: '088350',
        name: '한화생명',
        marketType: 'KOSPI',
        price: 3250,
        change: 95,
        changePercent: 3.01,
        volume: '4.2M',
        tradeAmount: '136억원',
        volumeSurgeRate: 185,
        volumeIntensity: 148,
        scalpingScore: 90,
        grade: 'S' as const,
        category: 'SUPPORT_REBOUND' as const,
        targetPrice: 3350,
        stopLoss: 3190,
        expectedReturn: 3.08,
        rsi: 56.0,
        reason: '[KOSPI] 저PBR 밸류업 프로그램 수급 유입. 바닥권 지지선 확인 후 눌림목 반등 타점.',
        tags: ['#KOSPI', '#저PBR', '#1만원이하', '#눌림목반등'],
        theme: '금융 & 밸류업',
        holdingTime: '5분 ~ 20분 (단기)'
      },
      {
        rank: 12,
        symbol: '003230',
        name: '삼양식품',
        marketType: 'KOSPI',
        price: 565000,
        change: 18000,
        changePercent: 3.29,
        volume: '320K',
        tradeAmount: '1,808억원',
        volumeSurgeRate: 180,
        volumeIntensity: 145,
        scalpingScore: 91,
        grade: 'S' as const,
        category: 'MOMENTUM_BREAKOUT' as const,
        targetPrice: 580000,
        stopLoss: 556000,
        expectedReturn: 2.65,
        rsi: 59.5,
        reason: '[KOSPI] K-푸드 불닭볶음면 글로벌 수출 호조세 지속. 전고점 모멘텀 돌파 타점.',
        tags: ['#KOSPI', '#모멘텀돌파', '#K-푸드수출', '#신고가패턴'],
        theme: '음식료 수출 대장',
        holdingTime: '5분 ~ 15분 (초단타)'
      },
      {
        rank: 13,
        symbol: '005380',
        name: '현대차',
        marketType: 'KOSPI',
        price: 246000,
        change: 6000,
        changePercent: 2.50,
        volume: '1.1M',
        tradeAmount: '2,706억원',
        volumeSurgeRate: 175,
        volumeIntensity: 148,
        scalpingScore: 90,
        grade: 'S' as const,
        category: 'VWAP_SUPPORT' as const,
        targetPrice: 253000,
        stopLoss: 242000,
        expectedReturn: 2.85,
        rsi: 56.5,
        reason: '[KOSPI] 밸류업 프로그램 및 호실적 기반 기관 매수세. VWAP 지지선 상단 안착.',
        tags: ['#KOSPI', '#VWAP지지', '#밸류업', '#자동차대장'],
        theme: '자동차 & 미래 모빌리티',
        holdingTime: '5분 ~ 20분 (단기)'
      }
    ];
    return rawList;
  }

}

export interface ScalperRecommendation {
  rank: number;
  symbol: string;
  name: string;
  marketType?: 'KOSPI' | 'KOSDAQ';
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  tradeAmount: string;
  volumeSurgeRate: number;
  volumeIntensity: number;
  scalpingScore: number;
  grade: 'SSS' | 'SS' | 'S' | 'A+';
  category: 'VOLUME_SURGE' | 'MOMENTUM_BREAKOUT' | 'SUPPORT_REBOUND' | 'VWAP_SUPPORT' | 'CVD_FLOW';
  targetPrice: number;
  stopLoss: number;
  expectedReturn: number;
  rsi: number;
  reason: string;
  tags: string[];
  theme?: string;
  holdingTime?: string;
}

export const kisService = new KISService();
