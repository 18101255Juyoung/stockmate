/**
 * Market Data Collection Service
 * 네이버 금융 크롤링을 통해 시장 전체 데이터를 수집하는 서비스
 * - KOSPI/KOSDAQ 지수
 * - 주요 업종별 지수
 * - 시장 뉴스
 */

import {
  fetchNaverIndex,
  fetchNaverSectors,
  fetchMarketNews,
} from './naverFinanceService'
import { KSTDate, KSTDateTime } from '@/lib/utils/kst-date'

/**
 * 시장 데이터 인터페이스
 */
export interface MarketData {
  // 수집 시간
  collectedAt: Date

  // 주요 지수 (네이버 크롤링)
  indices: {
    kospi: IndexData
    kosdaq: IndexData
  }

  // 업종별 데이터 (네이버 크롤링)
  sectors: SectorData[]

  // 시장 뉴스 (네이버 뉴스)
  news: NewsData[]

  // 시장 전체 요약
  summary: {
    totalAdvance: number // 상승 종목 수 (추정)
    totalDecline: number // 하락 종목 수 (추정)
    marketSentiment: 'bullish' | 'bearish' | 'neutral' // 시장 심리
  }
}

export interface IndexData {
  name: string
  value: number
  change: number
  changeRate: number
  volume?: number
}

export interface SectorData {
  name: string
  change: number
  changeRate: number
}

export interface NewsData {
  title: string
  link: string
  pubDate: string
}

/**
 * 시장 데이터 수집
 * 네이버 금융 크롤링을 통해 KOSPI, KOSDAQ, 업종별 데이터, 뉴스를 수집
 */
export async function collectMarketData(): Promise<MarketData> {
  try {
    // 네이버에서 모든 데이터 수집 (병렬)
    const [kospiData, kosdaqData, sectorsData, newsData] = await Promise.all([
      fetchNaverIndex('KOSPI'),
      fetchNaverIndex('KOSDAQ'),
      fetchNaverSectors(),
      fetchMarketNews(5),
    ])

    // 시장 심리 판단 (KOSPI + KOSDAQ 평균)
    const avgChangeRate = (kospiData.changeRate + kosdaqData.changeRate) / 2
    let marketSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (avgChangeRate > 0.5) marketSentiment = 'bullish'
    else if (avgChangeRate < -0.5) marketSentiment = 'bearish'

    // 상승/하락 종목 수 추정 (업종 데이터 기반)
    const upCount = sectorsData.filter((s) => s.changeRate > 0).length
    const totalCount = sectorsData.length

    return {
      collectedAt: KSTDateTime.now(),
      indices: {
        kospi: {
          name: 'KOSPI',
          value: kospiData.value,
          change: kospiData.change,
          changeRate: kospiData.changeRate,
          volume: kospiData.volume,
        },
        kosdaq: {
          name: 'KOSDAQ',
          value: kosdaqData.value,
          change: kosdaqData.change,
          changeRate: kosdaqData.changeRate,
          volume: kosdaqData.volume,
        },
      },
      sectors: sectorsData,
      news: newsData,
      summary: {
        totalAdvance: Math.round((upCount / totalCount) * 1000), // 추정치
        totalDecline: Math.round(((totalCount - upCount) / totalCount) * 1000),
        marketSentiment,
      },
    }
  } catch (error) {
    console.error('❌ Failed to collect market data:', error)
    throw new Error(`시장 데이터 수집 실패: ${error}`)
  }
}


/**
 * 시장 데이터를 텍스트로 포맷팅 (AI 프롬프트용)
 */
export function formatMarketDataForAI(data: MarketData): string {
  const { indices, sectors, news, summary } = data

  // 상위 5개 업종 (변동률 기준)
  const topSectors = [...sectors]
    .sort((a, b) => Math.abs(b.changeRate) - Math.abs(a.changeRate))
    .slice(0, 5)

  return `
## 📈 오늘의 시장 현황 (${KSTDate.format(KSTDate.fromDate(data.collectedAt))})

### 주요 지수
- **KOSPI**: ${indices.kospi.value.toFixed(2)} (${indices.kospi.changeRate > 0 ? '+' : ''}${indices.kospi.changeRate.toFixed(2)}%, ${indices.kospi.change > 0 ? '+' : ''}${indices.kospi.change.toFixed(2)}p)
- **KOSDAQ**: ${indices.kosdaq.value.toFixed(2)} (${indices.kosdaq.changeRate > 0 ? '+' : ''}${indices.kosdaq.changeRate.toFixed(2)}%, ${indices.kosdaq.change > 0 ? '+' : ''}${indices.kosdaq.change.toFixed(2)}p)

### 업종별 동향 (상위 5개)
${topSectors
  .map(
    (s) =>
      `- ${s.name}: ${s.changeRate > 0 ? '📈' : '📉'} ${s.changeRate > 0 ? '+' : ''}${s.changeRate.toFixed(2)}%`
  )
  .join('\n')}

### 시장 전체
- 상승 종목: 약 ${summary.totalAdvance}개
- 하락 종목: 약 ${summary.totalDecline}개
- 시장 심리: ${summary.marketSentiment === 'bullish' ? '🐂 강세' : summary.marketSentiment === 'bearish' ? '🐻 약세' : '😐 중립'}

### 주요 뉴스
${news.length > 0 ? news.map((n, i) => `${i + 1}. ${n.title}`).join('\n') : '- 최근 뉴스 없음'}
`.trim()
}
