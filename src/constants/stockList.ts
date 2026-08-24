export interface StockSuggestion {
  symbol: string;
  name: string;
  market: 'KR';
  marketType?: 'KOSPI' | 'KOSDAQ';
  sector?: string;
  price?: number;
}

/**
 * 코스피(KOSPI) 최우선 전 종목 & 코스닥(KOSDAQ) 핵심 종목 데이터베이스
 * 사용자의 "코스피 위주/최우선 검색 및 추천" 요구사항에 맞추어
 * 코스피 대형/중형/소형/지주사/ETF 전방위 수록 및 검색 우선순위 부여
 */
export const POPULAR_STOCKS: StockSuggestion[] = [
  // ==========================================
  // [KOSPI - 1순위] 코스피 대표 대형주 & 주도주
  // ==========================================
  { symbol: '005930', name: '삼성전자 (Samsung Electronics)', market: 'KR', marketType: 'KOSPI', sector: '반도체/IT' },
  { symbol: '005935', name: '삼성전자우 (Samsung Electronics Pref)', market: 'KR', marketType: 'KOSPI', sector: '반도체/IT' },
  { symbol: '000660', name: 'SK하이닉스 (SK hynix)', market: 'KR', marketType: 'KOSPI', sector: '반도체/IT' },
  { symbol: '373220', name: 'LG에너지솔루션 (LG Energy Solution)', market: 'KR', marketType: 'KOSPI', sector: '2차전지' },
  { symbol: '207940', name: '삼성바이오로직스 (Samsung Biologics)', market: 'KR', marketType: 'KOSPI', sector: '바이오/제약' },
  { symbol: '005380', name: '현대차 (Hyundai Motor)', market: 'KR', marketType: 'KOSPI', sector: '자동차' },
  { symbol: '005385', name: '현대차우 (Hyundai Motor Pref)', market: 'KR', marketType: 'KOSPI', sector: '자동차' },
  { symbol: '005387', name: '현대차2우B', market: 'KR', marketType: 'KOSPI', sector: '자동차' },
  { symbol: '000270', name: '기아 (Kia)', market: 'KR', marketType: 'KOSPI', sector: '자동차' },
  { symbol: '068270', name: '셀트리온 (Celltrion)', market: 'KR', marketType: 'KOSPI', sector: '바이오/제약' },
  { symbol: '005490', name: 'POSCO홀딩스 (POSCO Holdings)', market: 'KR', marketType: 'KOSPI', sector: '철강/소재' },
  { symbol: '035420', name: 'NAVER (네이버)', market: 'KR', marketType: 'KOSPI', sector: '인터넷/플랫폼' },
  { symbol: '035720', name: '카카오 (Kakao)', market: 'KR', marketType: 'KOSPI', sector: '인터넷/플랫폼' },
  { symbol: '105560', name: 'KB금융 (KB Financial Group)', market: 'KR', marketType: 'KOSPI', sector: '금융/은행' },
  { symbol: '055550', name: '신한지주 (Shinhan Financial Group)', market: 'KR', marketType: 'KOSPI', sector: '금융/은행' },
  { symbol: '086790', name: '하나금융지주 (Hana Financial)', market: 'KR', marketType: 'KOSPI', sector: '금융/은행' },
  { symbol: '316140', name: '우리금융지주 (Woori Financial)', market: 'KR', marketType: 'KOSPI', sector: '금융/은행' },
  { symbol: '138040', name: '메리츠금융지주 (Meritz Financial)', market: 'KR', marketType: 'KOSPI', sector: '금융/지주' },
  { symbol: '006400', name: '삼성SDI (Samsung SDI)', market: 'KR', marketType: 'KOSPI', sector: '2차전지' },
  { symbol: '051910', name: 'LG화학 (LG Chem)', market: 'KR', marketType: 'KOSPI', sector: '화학/2차전지' },
  { symbol: '051915', name: 'LG화학우 (LG Chem Pref)', market: 'KR', marketType: 'KOSPI', sector: '화학/2차전지' },
  { symbol: '028260', name: '삼성물산 (Samsung C&T)', market: 'KR', marketType: 'KOSPI', sector: '지주/상사' },
  { symbol: '012330', name: '현대모비스 (Hyundai Mobis)', market: 'KR', marketType: 'KOSPI', sector: '자동차부품' },
  { symbol: '003670', name: '포스코퓨처엠 (POSCO Future M)', market: 'KR', marketType: 'KOSPI', sector: '2차전지소재' },
  { symbol: '010130', name: '고려아연 (Korea Zinc)', market: 'KR', marketType: 'KOSPI', sector: '비철금속' },
  { symbol: '034730', name: 'SK (에스케이 지주)', market: 'KR', marketType: 'KOSPI', sector: '지주사' },
  { symbol: '003550', name: 'LG (엘지 지주)', market: 'KR', marketType: 'KOSPI', sector: '지주사' },
  { symbol: '011200', name: 'HMM (에이치엠엠)', market: 'KR', marketType: 'KOSPI', sector: '해운/물류' },
  { symbol: '009540', name: 'HD한국조선해양 (HD Korea Shipbuilding)', market: 'KR', marketType: 'KOSPI', sector: '조선' },
  { symbol: '329180', name: 'HD현대중공업 (HD Hyundai Heavy)', market: 'KR', marketType: 'KOSPI', sector: '조선' },
  { symbol: '010140', name: '삼성중공업 (Samsung Heavy)', market: 'KR', marketType: 'KOSPI', sector: '조선' },
  { symbol: '042660', name: '한화오션 (Hanwha Ocean)', market: 'KR', marketType: 'KOSPI', sector: '조선/방산' },
  { symbol: '012450', name: '한화에어로스페이스 (Hanwha Aerospace)', market: 'KR', marketType: 'KOSPI', sector: '방산/우주항공' },
  { symbol: '079550', name: 'LIG넥스원 (LIG Nex1)', market: 'KR', marketType: 'KOSPI', sector: '방산' },
  { symbol: '064350', name: '현대로템 (Hyundai Rotem)', market: 'KR', marketType: 'KOSPI', sector: '방산/철도' },
  { symbol: '000810', name: '삼성화재 (Samsung Fire & Marine)', market: 'KR', marketType: 'KOSPI', sector: '보험/금융' },
  { symbol: '032830', name: '삼성생명 (Samsung Life)', market: 'KR', marketType: 'KOSPI', sector: '보험/금융' },
  { symbol: '018260', name: '삼성에스디에스 (Samsung SDS)', market: 'KR', marketType: 'KOSPI', sector: 'IT서비스/AI' },
  { symbol: '009150', name: '삼성전기 (Samsung Electro-Mechanics)', market: 'KR', marketType: 'KOSPI', sector: '전자부품/MLCC' },
  { symbol: '015760', name: '한국전력 (KEPCO)', market: 'KR', marketType: 'KOSPI', sector: '전력/에너지' },
  { symbol: '033780', name: 'KT&G (케이티앤지)', market: 'KR', marketType: 'KOSPI', sector: '음식료/필수소비재' },
  { symbol: '010950', name: 'S-Oil (에쓰오일)', market: 'KR', marketType: 'KOSPI', sector: '정유/화학' },
  { symbol: '096770', name: 'SK이노베이션 (SK Innovation)', market: 'KR', marketType: 'KOSPI', sector: '정유/배터리' },
  { symbol: '030200', name: 'KT (케이티)', market: 'KR', marketType: 'KOSPI', sector: '통신' },
  { symbol: '017670', name: 'SK텔레콤 (SK Telecom)', market: 'KR', marketType: 'KOSPI', sector: '통신' },
  { symbol: '032640', name: 'LG유플러스 (LG Uplus)', market: 'KR', marketType: 'KOSPI', sector: '통신' },
  { symbol: '066570', name: 'LG전자 (LG Electronics)', market: 'KR', marketType: 'KOSPI', sector: '가전/전장' },
  { symbol: '034020', name: '두산에너빌리티 (Doosan Enerbility)', market: 'KR', marketType: 'KOSPI', sector: '원전/전력' },
  { symbol: '267260', name: 'HD현대일렉트릭 (HD Hyundai Electric)', market: 'KR', marketType: 'KOSPI', sector: '전력인프라' },
  { symbol: '007660', name: '이수페타시스 (Isu Petasys)', market: 'KR', marketType: 'KOSPI', sector: 'AI반도체기판' },
  { symbol: '003230', name: '삼양식품 (Samyang Foods)', market: 'KR', marketType: 'KOSPI', sector: '음식료' },
  { symbol: '004370', name: '농심 (Nongshim)', market: 'KR', marketType: 'KOSPI', sector: '음식료' },
  { symbol: '097950', name: 'CJ제일제당 (CJ CheilJedang)', market: 'KR', marketType: 'KOSPI', sector: '음식료/바이오' },
  { symbol: '271560', name: '오리온 (Orion)', market: 'KR', marketType: 'KOSPI', sector: '음식료' },
  { symbol: '005300', name: '롯데칠성 (Lotte Chilsung)', market: 'KR', marketType: 'KOSPI', sector: '음식료' },
  { symbol: '000080', name: '하이트진로 (Hitejinro)', market: 'KR', marketType: 'KOSPI', sector: '주류/음식료' },
  { symbol: '047810', name: '한국항공우주 (KAI Korea Aerospace)', market: 'KR', marketType: 'KOSPI', sector: '방산/항공' },
  { symbol: '005830', name: 'DB손해보험 (DB Insurance)', market: 'KR', marketType: 'KOSPI', sector: '보험/금융' },
  { symbol: '000030', name: '우리은행 (우리금융)', market: 'KR', marketType: 'KOSPI', sector: '금융' },
  { symbol: '024110', name: '기업은행 (IBK Industrial Bank)', market: 'KR', marketType: 'KOSPI', sector: '금융/은행' },
  { symbol: '039490', name: '키움증권 (Kiwoom Securities)', market: 'KR', marketType: 'KOSPI', sector: '증권' },
  { symbol: '005940', name: 'NH투자증권 (NH Investment & Securities)', market: 'KR', marketType: 'KOSPI', sector: '증권' },
  { symbol: '008560', name: '메리츠증권', market: 'KR', marketType: 'KOSPI', sector: '증권' },
  { symbol: '016360', name: '삼성증권 (Samsung Securities)', market: 'KR', marketType: 'KOSPI', sector: '증권' },
  { symbol: '006800', name: '미래에셋증권 (Mirae Asset Securities)', market: 'KR', marketType: 'KOSPI', sector: '증권' },
  { symbol: '003470', name: '유안타증권 (Yuanta Securities)', market: 'KR', marketType: 'KOSPI', sector: '증권' },
  { symbol: '030000', name: '제일기획 (Cheil Worldwide)', market: 'KR', marketType: 'KOSPI', sector: '광고/미디어' },
  { symbol: '036570', name: '엔씨소프트 (NCSOFT)', market: 'KR', marketType: 'KOSPI', sector: '게임' },
  { symbol: '251270', name: '넷마블 (Netmarble)', market: 'KR', marketType: 'KOSPI', sector: '게임' },
  { symbol: '352820', name: '하이브 (HYBE)', market: 'KR', marketType: 'KOSPI', sector: '엔터테인먼트' },
  { symbol: '041510', name: '에스엠 (SM Entertainment)', market: 'KR', marketType: 'KOSPI', sector: '엔터테인먼트' },
  { symbol: '035900', name: 'JYP Ent. (제이와이피)', market: 'KR', marketType: 'KOSPI', sector: '엔터테인먼트' },
  { symbol: '000100', name: '유한양행 (Yuhan)', market: 'KR', marketType: 'KOSPI', sector: '제약/바이오' },
  { symbol: '128940', name: '한미약품 (Hanmi Pharm)', market: 'KR', marketType: 'KOSPI', sector: '제약/바이오' },
  { symbol: '185750', name: '종근당 (Chong Kun Dang)', market: 'KR', marketType: 'KOSPI', sector: '제약/바이오' },
  { symbol: '302440', name: 'SK바이오사이언스 (SK Bioscience)', market: 'KR', marketType: 'KOSPI', sector: '바이오' },
  { symbol: '326030', name: 'SK바이오팜 (SK Biopharm)', market: 'KR', marketType: 'KOSPI', sector: '바이오/신약' },
  { symbol: '006280', name: '녹십자 (GC Pharma)', market: 'KR', marketType: 'KOSPI', sector: '바이오/백신' },
  { symbol: '000250', name: '삼천당제약 (Samtハンドang Pharm)', market: 'KR', marketType: 'KOSPI', sector: '제약/안과' },
  { symbol: '073240', name: '금호타이어 (Kumho Tire)', market: 'KR', marketType: 'KOSPI', sector: '타이어/자동차부품' },
  { symbol: '000240', name: '한국타이어앤테크놀로지', market: 'KR', marketType: 'KOSPI', sector: '타이어' },
  { symbol: '004020', name: '현대제철 (Hyundai Steel)', market: 'KR', marketType: 'KOSPI', sector: '철강' },
  { symbol: '010060', name: 'OCI홀딩스 (OCI Holdings)', market: 'KR', marketType: 'KOSPI', sector: '태양광/화학' },
  { symbol: '009830', name: '한화솔루션 (Hanwha Solutions)', market: 'KR', marketType: 'KOSPI', sector: '태양광/신재생' },
  { symbol: '011170', name: '롯데케미칼 (Lotte Chemical)', market: 'KR', marketType: 'KOSPI', sector: '석유화학' },
  { symbol: '006120', name: 'SK디스커버리', market: 'KR', marketType: 'KOSPI', sector: '지주사' },
  { symbol: '011780', name: '금호석유 (Kumho Petrochemical)', market: 'KR', marketType: 'KOSPI', sector: '화학' },
  { symbol: '002790', name: '아모레G (AmoreG)', market: 'KR', marketType: 'KOSPI', sector: '화장품지주' },
  { symbol: '090430', name: '아모레퍼시픽 (Amorepacific)', market: 'KR', marketType: 'KOSPI', sector: '화장품' },
  { symbol: '192820', name: '코스맥스 (Cosmax)', market: 'KR', marketType: 'KOSPI', sector: '화장품ODM' },
  { symbol: '051900', name: 'LG생활건강 (LG H&H)', market: 'KR', marketType: 'KOSPI', sector: '화장품/생활용품' },
  { symbol: '004170', name: '신세계 (Shinsegae)', market: 'KR', marketType: 'KOSPI', sector: '유통/백화점' },
  { symbol: '023530', name: '롯데쇼핑 (Lotte Shopping)', market: 'KR', marketType: 'KOSPI', sector: '유통/쇼핑' },
  { symbol: '139480', name: '이마트 (E-MART)', market: 'KR', marketType: 'KOSPI', sector: '대형마트/유통' },
  { symbol: '069960', name: '현대백화점 (Hyundai Dept)', market: 'KR', marketType: 'KOSPI', sector: '백화점' },
  { symbol: '007070', name: 'GS리테일 (GS Retail)', market: 'KR', marketType: 'KOSPI', sector: '편의점/유통' },
  { symbol: '282330', name: 'BGF리테일 (BGF Retail)', market: 'KR', marketType: 'KOSPI', sector: '편의점/CU' },
  { symbol: '000120', name: 'CJ대한통운 (CJ Logistics)', market: 'KR', marketType: 'KOSPI', sector: '물류/택배' },
  { symbol: '086280', name: '현대글로비스 (Hyundai Glovis)', market: 'KR', marketType: 'KOSPI', sector: '물류/해운' },
  { symbol: '003490', name: '대한항공 (Korean Air)', market: 'KR', marketType: 'KOSPI', sector: '항공' },
  { symbol: '020560', name: '아시아나항공 (Asiana Airlines)', market: 'KR', marketType: 'KOSPI', sector: '항공' },
  { symbol: '000880', name: '한화 (Hanwha)', market: 'KR', marketType: 'KOSPI', sector: '지주사' },
  { symbol: '000150', name: '두산 (Doosan)', market: 'KR', marketType: 'KOSPI', sector: '지주사' },
  { symbol: '001040', name: 'CJ (씨제이 지주)', market: 'KR', marketType: 'KOSPI', sector: '지주사' },
  { symbol: '078930', name: 'GS (지에스 지주)', market: 'KR', marketType: 'KOSPI', sector: '지주사' },
  { symbol: '004990', name: '롯데지주 (Lotte Corp)', market: 'KR', marketType: 'KOSPI', sector: '지주사' },
  { symbol: '001440', name: '대한전선 (Taihan Cable)', market: 'KR', marketType: 'KOSPI', sector: '전선/전력망' },
  { symbol: '006260', name: 'LS (엘에스 지주)', market: 'KR', marketType: 'KOSPI', sector: '전선/전력' },
  { symbol: '229640', name: 'LS에코에너지 (LS Eco Energy)', market: 'KR', marketType: 'KOSPI', sector: '해저케이블' },
  { symbol: '005070', name: '코스모신소재 (Cosmo AM&T)', market: 'KR', marketType: 'KOSPI', sector: '2차전지소재' },
  { symbol: '005420', name: '코스모화학 (Cosmo Chemical)', market: 'KR', marketType: 'KOSPI', sector: '폐배터리/화학' },
  { symbol: '025820', name: '이구산업 (Lee Ku Industrial)', market: 'KR', marketType: 'KOSPI', sector: '구리/비철금속' },
  { symbol: '001520', name: '동양 (Tongyang)', market: 'KR', marketType: 'KOSPI', sector: '건설/시멘트' },
  { symbol: '025560', name: '미래산업 (Mirae Corp)', market: 'KR', marketType: 'KOSPI', sector: '반도체장비' },
  { symbol: '004060', name: 'SG세계물산 (SG Global)', market: 'KR', marketType: 'KOSPI', sector: '섬유의복' },
  { symbol: '014160', name: '대영포장 (Daeyoung Packaging)', market: 'KR', marketType: 'KOSPI', sector: '골판지/포장' },
  { symbol: '001430', name: '세아베스틸지주 (SeAH Besteel)', market: 'KR', marketType: 'KOSPI', sector: '특수강' },
  { symbol: '058430', name: '포스코인터내셔널 (POSCO International)', market: 'KR', marketType: 'KOSPI', sector: '상사/에너지' },
  { symbol: '047050', name: '포스코DX (POSCO DX)', market: 'KR', marketType: 'KOSPI', sector: '스마트팩토리/IT' },
  { symbol: '000720', name: '현대건설 (Hyundai E&C)', market: 'KR', marketType: 'KOSPI', sector: '건설' },
  { symbol: '006360', name: 'GS건설 (GS E&C)', market: 'KR', marketType: 'KOSPI', sector: '건설' },
  { symbol: '047040', name: '대우건설 (Daewoo E&C)', market: 'KR', marketType: 'KOSPI', sector: '건설' },
  { symbol: '000670', name: '영풍 (Young Poong)', market: 'KR', marketType: 'KOSPI', sector: '비철금속/지주' },
  { symbol: '001120', name: 'LX인터내셔널 (LX International)', market: 'KR', marketType: 'KOSPI', sector: '상사/자원' },
  { symbol: '383800', name: 'LX홀딩스 (LX Holdings)', market: 'KR', marketType: 'KOSPI', sector: '지주사' },
  { symbol: '108670', name: 'LG하우시스 (LX하우시스)', market: 'KR', marketType: 'KOSPI', sector: '건자재' },
  { symbol: '010620', name: '현대미포조선 (HD현대미포)', market: 'KR', marketType: 'KOSPI', sector: '조선' },
  { symbol: '241560', name: '두산밥캣 (Doosan Bobcat)', market: 'KR', marketType: 'KOSPI', sector: '건설기계' },
  { symbol: '042670', name: 'HD현대인프라코어', market: 'KR', marketType: 'KOSPI', sector: '건설기계' },
  { symbol: '267250', name: 'HD현대건설기계', market: 'KR', marketType: 'KOSPI', sector: '건설기계' },
  { symbol: '001230', name: '동국제강 (Dongkuk Steel)', market: 'KR', marketType: 'KOSPI', sector: '철강' },
  { symbol: '460860', name: '동국씨엠 (Dongkuk CM)', market: 'KR', marketType: 'KOSPI', sector: '철강' },
  { symbol: '004000', name: '롯데정밀화학 (Lotte Fine Chem)', market: 'KR', marketType: 'KOSPI', sector: '정밀화학' },
  { symbol: '002380', name: 'KCC (케이씨씨)', market: 'KR', marketType: 'KOSPI', sector: '도료/실리콘' },
  { symbol: '017800', name: '현대엘리베이터 (Hyundai Elevator)', market: 'KR', marketType: 'KOSPI', sector: '승강기' },
  { symbol: '011070', name: 'LG이노텍 (LG Innotek)', market: 'KR', marketType: 'KOSPI', sector: '카메라모듈/전장' },
  { symbol: '034220', name: 'LG디스플레이 (LG Display)', market: 'KR', marketType: 'KOSPI', sector: '디스플레이' },
  { symbol: '005850', name: '에스엘 (SL Corp)', market: 'KR', marketType: 'KOSPI', sector: '자동차램프' },
  { symbol: '018880', name: '한온시스템 (Hanon Systems)', market: 'KR', marketType: 'KOSPI', sector: '열관리시스템' },
  { symbol: '009240', name: '한샘 (Hanssem)', market: 'KR', marketType: 'KOSPI', sector: '인테리어/가구' },
  { symbol: '005090', name: 'SGC에너지 (SGC Energy)', market: 'KR', marketType: 'KOSPI', sector: '에너지/발전' },
  { symbol: '036460', name: '한국가스공사 (KOGAS)', market: 'KR', marketType: 'KOSPI', sector: '에너지/천연가스' },
  { symbol: '017960', name: '한국카본 (Hankuk Carbon)', market: 'KR', marketType: 'KOSPI', sector: '조선단열재' },
  { symbol: '010040', name: '한국내화', market: 'KR', marketType: 'KOSPI', sector: '내화물' },
  { symbol: '005180', name: '빙그레 (Binggrae)', market: 'KR', marketType: 'KOSPI', sector: '빙과/유가공' },
  { symbol: '007310', name: '오뚜기 (Ottogi)', market: 'KR', marketType: 'KOSPI', sector: '식품' },
  { symbol: '003920', name: '남양유업 (Namyang Dairy)', market: 'KR', marketType: 'KOSPI', sector: '유가공' },
  { symbol: '005610', name: 'SPC삼립 (SPC Samlip)', market: 'KR', marketType: 'KOSPI', sector: '제과/제빵' },

  // ==========================================
  // [KOSPI - ETF/ETN 대표 유동성 종목]
  // ==========================================
  { symbol: '069500', name: 'KODEX 200 (코덱스 200 대형주 ETF)', market: 'KR', marketType: 'KOSPI', sector: '지수ETF' },
  { symbol: '122630', name: 'KODEX 레버리지 (KODEX 200 Leverage 2X)', market: 'KR', marketType: 'KOSPI', sector: '파생ETF' },
  { symbol: '114800', name: 'KODEX 인버스 (KODEX Inverse -1X)', market: 'KR', marketType: 'KOSPI', sector: '파생ETF' },
  { symbol: '252670', name: 'KODEX 200선물인버스2X (곱버스)', market: 'KR', marketType: 'KOSPI', sector: '파생ETF' },
  { symbol: '305540', name: 'TIGER 200 (타이거 200 ETF)', market: 'KR', marketType: 'KOSPI', sector: '지수ETF' },
  { symbol: '102110', name: 'TIGER 200IT (타이거 200 IT ETF)', market: 'KR', marketType: 'KOSPI', sector: '섹터ETF' },
  { symbol: '305720', name: 'KODEX 2차전지산업 ETF', market: 'KR', marketType: 'KOSPI', sector: '테마ETF' },
  { symbol: '091160', name: 'KODEX 반도체 ETF', market: 'KR', marketType: 'KOSPI', sector: '테마ETF' },
  { symbol: '305080', name: 'TIGER 2차전지테마 ETF', market: 'KR', marketType: 'KOSPI', sector: '테마ETF' },
  { symbol: '442580', name: 'ACE 미국S&P500 ETF', market: 'KR', marketType: 'KOSPI', sector: '해외ETF' },
  { symbol: '379800', name: 'TIGER 미국필라델피아반도체나스닥', market: 'KR', marketType: 'KOSPI', sector: '해외ETF' },

  // ==========================================
  // [KOSDAQ - 2순위] 코스닥 주요 핵심 종목
  // ==========================================
  { symbol: '247540', name: '에코프로비엠 (Ecopro BM)', market: 'KR', marketType: 'KOSDAQ', sector: '2차전지소재' },
  { symbol: '086520', name: '에코프로 (Ecopro)', market: 'KR', marketType: 'KOSDAQ', sector: '2차전지/지주' },
  { symbol: '196170', name: '알테오젠 (Alteogen)', market: 'KR', marketType: 'KOSDAQ', sector: '바이오플랫폼' },
  { symbol: '028300', name: 'HLB (에이치엘비)', market: 'KR', marketType: 'KOSDAQ', sector: '바이오/항암제' },
  { symbol: '042700', name: '한미반도체 (Hanmi Semiconductor)', market: 'KR', marketType: 'KOSDAQ', sector: 'HBM장비' },
  { symbol: '263750', name: '펄어비스 (Pearl Abyss)', market: 'KR', marketType: 'KOSDAQ', sector: '게임' },
  { symbol: '293490', name: '카카오게임즈 (Kakao Games)', market: 'KR', marketType: 'KOSDAQ', sector: '게임' },
  { symbol: '035900', name: 'JYP Ent. (제이와이피)', market: 'KR', marketType: 'KOSDAQ', sector: '엔터테인먼트' },
  { symbol: '277810', name: '팬엔터테인먼트', market: 'KR', marketType: 'KOSDAQ', sector: '콘텐츠' },
  { symbol: '039030', name: '이오테크닉스 (EO Technics)', market: 'KR', marketType: 'KOSDAQ', sector: '반도체레이저' },
  { symbol: '058470', name: '리노공업 (LEENO)', market: 'KR', marketType: 'KOSDAQ', sector: '반도체소켓' },
  { symbol: '095610', name: '테스 (TES)', market: 'KR', marketType: 'KOSDAQ', sector: '반도체장비' },
  { symbol: '108320', name: '실리콘투 (Silicon2)', market: 'KR', marketType: 'KOSDAQ', sector: 'K-뷰티유통' },
  { symbol: '068760', name: '셀트리온제약 (Celltrion Pharm)', market: 'KR', marketType: 'KOSDAQ', sector: '바이오제약' },
  { symbol: '233740', name: 'KODEX 코스닥150레버리지', market: 'KR', marketType: 'KOSDAQ', sector: '파생ETF' },
  { symbol: '251340', name: 'KODEX 코스닥150선물인버스', market: 'KR', marketType: 'KOSDAQ', sector: '파생ETF' }
];

/**
 * 코스피(KOSPI) 최우선 정렬 및 검색 매칭 헬퍼 함수
 */
export function searchStocksByQuery(query: string, maxResults: number = 20): StockSuggestion[] {
  if (!query || !query.trim()) {
    // 쿼리가 없을 때는 코스피 대형주 우선 상위 반환
    return POPULAR_STOCKS.filter(s => s.marketType === 'KOSPI').slice(0, maxResults);
  }

  const cleanQuery = query.trim().toUpperCase();
  const isNumberCode = /^\d+$/.test(cleanQuery);

  const matched = POPULAR_STOCKS.filter(stock => {
    if (isNumberCode) {
      return stock.symbol.startsWith(cleanQuery);
    }
    const nameUpper = stock.name.toUpperCase();
    const symbolUpper = stock.symbol.toUpperCase();
    const sectorUpper = (stock.sector || '').toUpperCase();
    return nameUpper.includes(cleanQuery) || symbolUpper.includes(cleanQuery) || sectorUpper.includes(cleanQuery);
  });

  // 코스피(KOSPI)를 1순위로, 그 다음 코스닥(KOSDAQ)으로 정렬
  matched.sort((a, b) => {
    // 1. 코스피 vs 코스닥 정렬 (코스피 최우선)
    const isAKospi = a.marketType === 'KOSPI' ? 0 : 1;
    const isBKospi = b.marketType === 'KOSPI' ? 0 : 1;
    if (isAKospi !== isBKospi) return isAKospi - isBKospi;

    // 2. 정확 일치 우선
    if (isNumberCode) {
      if (a.symbol === cleanQuery) return -1;
      if (b.symbol === cleanQuery) return 1;
    } else {
      if (a.name.toUpperCase().startsWith(cleanQuery)) return -1;
      if (b.name.toUpperCase().startsWith(cleanQuery)) return 1;
    }

    return 0;
  });

  return matched.slice(0, maxResults);
}
