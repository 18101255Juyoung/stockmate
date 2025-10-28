/**
 * Stock-related types for KIS API integration
 */

// KIS API Token Response
export interface KISTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  access_token_token_expired?: string
}

// KIS API Base Response
export interface KISApiResponse<T = any> {
  rt_cd: string // "0" = success, others = error
  msg_cd: string
  msg1: string
  output?: T
  output1?: any
  output2?: any
}

// Stock Price Information
export interface StockPrice {
  stockCode: string
  stockName: string
  currentPrice: number
  changePrice: number // 전일 대비
  changeRate: number // 등락률
  openPrice: number
  highPrice: number
  lowPrice: number
  volume: number
  updatedAt: Date
}

// KIS API Stock Price Response (국내 주식 현재가)
export interface KISStockPriceOutput {
  stck_prpr: string // 주식 현재가
  prdy_vrss: string // 전일 대비
  prdy_vrss_sign: string // 전일 대비 부호
  prdy_ctrt: string // 전일 대비율
  stck_oprc: string // 시가
  stck_hgpr: string // 고가
  stck_lwpr: string // 저가
  acml_vol: string // 거래량
  hts_kor_isnm: string // 종목명
}

// Stock Search Result
export interface StockSearchResult {
  stockCode: string
  stockName: string
  market: string // KOSPI, KOSDAQ
}

// KIS API Stock Search Response
export interface KISStockSearchOutput {
  pdno: string // 종목코드
  prdt_name: string // 종목명
  prdt_type_cd: string // 상품유형코드
  mket_id_cd: string // 시장ID코드 (J: KOSPI, Q: KOSDAQ)
}

// Stock Chart Data
export interface StockChartData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// KIS API Chart Data Response
export interface KISChartDataOutput {
  stck_bsop_date: string // 영업일자
  stck_oprc: string // 시가
  stck_hgpr: string // 고가
  stck_lwpr: string // 저가
  stck_clpr: string // 종가
  acml_vol: string // 거래량
}

// KIS API Request Headers
export interface KISApiHeaders {
  'content-type': string
  authorization: string
  appkey: string
  appsecret: string
  tr_id?: string
  custtype?: string
}

// KIS API Configuration
export interface KISApiConfig {
  baseUrl: string
  appKey: string
  appSecret: string
  apiType: 'real' | 'virtual' // 실전투자 or 모의투자
}

// TR ID (거래ID) 목록
// 조회 API는 실전/모의 구분 없이 동일한 TR_ID 사용 (FHKST 시작)
// 주문 API만 실전(TTTC)/모의(VTTC)로 구분
export const KIS_TR_IDS = {
  // 공통 조회 API (실전/모의 구분 없음)
  COMMON: {
    STOCK_PRICE: 'FHKST01010100', // 주식 현재가 시세 조회
    STOCK_SEARCH: 'CTPF1002R', // 종목 검색
    DAILY_CHART: 'FHKST03010100', // 국내주식 기간별 시세
  },
  // 모의투자 전용 (주문 API)
  VIRTUAL: {
    BUY_ORDER: 'VTTC0802U', // 모의투자 매수 주문
    SELL_ORDER: 'VTTC0801U', // 모의투자 매도 주문
  },
  // 실전투자 전용 (주문 API)
  REAL: {
    BUY_ORDER: 'TTTC0802U', // 실전투자 매수 주문
    SELL_ORDER: 'TTTC0801U', // 실전투자 매도 주문
  },
}

// KIS API Endpoints
export const KIS_ENDPOINTS = {
  TOKEN: '/oauth2/tokenP', // 토큰 발급
  STOCK_PRICE: '/uapi/domestic-stock/v1/quotations/inquire-price', // 현재가 조회
  STOCK_SEARCH: '/uapi/domestic-stock/v1/quotations/search-stock-info', // 종목 검색
  DAILY_CHART: '/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice', // 일별 차트
}
