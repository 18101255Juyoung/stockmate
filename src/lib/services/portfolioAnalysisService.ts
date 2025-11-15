/**
 * 통합 포트폴리오 분석 서비스
 * 거래 여부와 무관하게 16:00에 실행
 * - 거래가 있으면: 거래 평가 + 포트폴리오 진단
 * - 거래가 없으면: 포트폴리오 진단만
 */

import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import {
  collectMarketData,
  formatMarketDataForAI,
  type MarketData,
} from './marketDataService'
import { KSTDate, type KSTDate as KSTDateType } from '@/lib/utils/kst-date'
import { DateQuery } from '@/lib/db/queries'

const prisma = new PrismaClient()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface PortfolioMetrics {
  totalAssets: number
  totalReturn: number
  dayChange: number
  dayChangeRate: number
  previousDayAssets: number
  holdings: {
    stockCode: string
    stockName: string
    quantity: number
    avgPrice: number
    currentPrice: number
    weight: number // 비중 (%)
    returnRate: number // 수익률 (%)
    unrealizedPL: number // 평가손익
  }[]
  sectorWeights: Record<string, number> // 섹터별 비중
  topGainer?: {
    stockName: string
    returnRate: number
  }
  topLoser?: {
    stockName: string
    returnRate: number
  }
}

interface TransactionSummary {
  id: string
  type: 'BUY' | 'SELL'
  stockCode: string
  stockName: string
  quantity: number
  price: number
  totalAmount: number
}

/**
 * 개별 사용자의 포트폴리오 분석 생성
 */
export async function generatePortfolioAnalysis(
  userId: string,
  date?: KSTDateType
): Promise<any> {
  console.log(`\n📊 Generating portfolio analysis for user ${userId}...`)

  try {
    // 1. 오늘의 스냅샷 조회 (15:40에 생성된 것)
    const dateOnly = date || KSTDate.today()

    const snapshot = await prisma.portfolioSnapshot.findFirst({
      where: {
        portfolio: {
          userId,
        },
        date: dateOnly,
      },
      include: {
        portfolio: {
          include: {
            user: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    })

    if (!snapshot) {
      throw new Error(
        `Snapshot not found for user ${userId} on ${dateOnly.toISOString()}`
      )
    }

    // 2. 현재 포트폴리오 데이터 (보유 종목)
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId },
      include: {
        holdings: true,
      },
    })

    if (!portfolio) {
      throw new Error(`Portfolio not found for user ${userId}`)
    }

    // 3. 오늘 거래 내역
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        createdAt: DateQuery.onDate(dateOnly),
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // 4. 시장 데이터
    const marketData = await collectMarketData()

    // 5. 이전 날 스냅샷 (전일 대비 계산용)
    const previousDate = KSTDate.addDays(dateOnly, -1)

    const previousSnapshot = await prisma.portfolioSnapshot.findFirst({
      where: {
        portfolio: {
          userId,
        },
        date: {
          lt: dateOnly,
        },
      },
      orderBy: {
        date: 'desc',
      },
    })

    // 6. 통계 계산
    const metrics = calculatePortfolioMetrics(
      portfolio,
      snapshot.totalAssets,
      previousSnapshot?.totalAssets || snapshot.totalAssets
    )

    // 7. AI 프롬프트 생성
    const prompt = buildAnalysisPrompt({
      metrics,
      marketData,
      transactions: todayTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        stockCode: t.stockCode,
        stockName: t.stockName,
        quantity: t.quantity,
        price: t.price,
        totalAmount: t.totalAmount,
      })),
      hasTransactions: todayTransactions.length > 0,
      username: snapshot.portfolio.user.displayName,
    })

    // 8. AI 분석 생성 (gpt-4o-mini)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            '당신은 전문 포트폴리오 분석가입니다. 사용자의 포트폴리오를 분석하고 실용적인 조언을 제공하세요. 친절하고 이해하기 쉬운 한국어로 작성하세요.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 1500,
      temperature: 0.7,
    })

    const fullAnalysis = completion.choices[0].message.content || ''
    const tokensUsed = completion.usage?.total_tokens || 0

    // 9. 3줄 요약 생성
    const summary = await generateAnalysisSummary(fullAnalysis)

    // 10. 비용 계산 (gpt-4o-mini: $0.150/1M input, $0.600/1M output)
    const inputTokens = completion.usage?.prompt_tokens || 0
    const outputTokens = completion.usage?.completion_tokens || 0
    const cost =
      (inputTokens / 1000000) * 0.15 + (outputTokens / 1000000) * 0.6

    // 11. DB 저장
    const analysis = await prisma.portfolioAnalysis.create({
      data: {
        userId,
        date: dateOnly,
        snapshotId: snapshot.id,
        metrics: metrics as any,
        summary,
        analysis: fullAnalysis,
        hasTransactions: todayTransactions.length > 0,
        transactionIds: todayTransactions.map((t) => t.id),
        tokensUsed,
        cost,
        model: 'gpt-4o-mini',
      },
    })

    console.log(
      `✅ Analysis created for user ${userId} (${tokensUsed} tokens, $${cost.toFixed(4)})`
    )

    return analysis
  } catch (error) {
    console.error(`❌ Failed to generate analysis for user ${userId}:`, error)
    throw error
  }
}

/**
 * 포트폴리오 통계 계산
 */
function calculatePortfolioMetrics(
  portfolio: any,
  currentTotalAssets: number,
  previousDayAssets: number
): PortfolioMetrics {
  const holdings = portfolio.holdings.map((h: any) => {
    const value = h.quantity * h.currentPrice
    const avgValue = h.quantity * h.avgPrice
    const unrealizedPL = value - avgValue
    const returnRate = ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100

    return {
      stockCode: h.stockCode,
      stockName: h.stockName,
      quantity: h.quantity,
      avgPrice: h.avgPrice,
      currentPrice: h.currentPrice,
      weight: (value / currentTotalAssets) * 100,
      returnRate,
      unrealizedPL,
    }
  })

  // 섹터별 비중 (간단한 매핑 - 실제로는 Stock 테이블에서 가져와야 함)
  const sectorWeights: Record<string, number> = {}
  holdings.forEach((h: any) => {
    // 임시: 종목코드로 섹터 추정 (실제로는 DB에서 가져와야 함)
    const sector = estimateSector(h.stockCode)
    sectorWeights[sector] = (sectorWeights[sector] || 0) + h.weight
  })

  // 최고 수익/손실 종목
  const sortedByReturn = [...holdings].sort(
    (a, b) => b.returnRate - a.returnRate
  )
  const topGainer =
    sortedByReturn.length > 0
      ? {
          stockName: sortedByReturn[0].stockName,
          returnRate: sortedByReturn[0].returnRate,
        }
      : undefined
  const topLoser =
    sortedByReturn.length > 0
      ? {
          stockName: sortedByReturn[sortedByReturn.length - 1].stockName,
          returnRate: sortedByReturn[sortedByReturn.length - 1].returnRate,
        }
      : undefined

  const dayChange = currentTotalAssets - previousDayAssets
  const dayChangeRate = (dayChange / previousDayAssets) * 100

  return {
    totalAssets: currentTotalAssets,
    totalReturn: portfolio.totalReturn,
    dayChange,
    dayChangeRate,
    previousDayAssets,
    holdings,
    sectorWeights,
    topGainer,
    topLoser,
  }
}

/**
 * 종목코드로 섹터 추정 (임시)
 * 실제로는 Stock 테이블에 sector 컬럼을 추가하거나 별도 테이블로 관리해야 함
 */
function estimateSector(stockCode: string): string {
  // 삼성 계열
  if (stockCode.startsWith('005')) return 'IT/전자'
  // SK 계열
  if (stockCode.startsWith('01')) return 'IT/통신'
  // 현대차 계열
  if (stockCode.startsWith('005380')) return '자동차'
  // 금융
  if (
    ['055550', '105560', '086790'].includes(stockCode)
  )
    return '금융'
  // 바이오
  if (stockCode.startsWith('02') || stockCode.startsWith('06'))
    return '바이오/헬스케어'

  return '기타'
}

/**
 * AI 프롬프트 생성
 */
function buildAnalysisPrompt({
  metrics,
  marketData,
  transactions,
  hasTransactions,
  username,
}: {
  metrics: PortfolioMetrics
  marketData: MarketData
  transactions: TransactionSummary[]
  hasTransactions: boolean
  username: string
}): string {
  const marketDataText = formatMarketDataForAI(marketData)

  return `
# ${username}님의 포트폴리오 분석 요청

${marketDataText}

## 포트폴리오 현황
- **총 자산**: ${metrics.totalAssets.toLocaleString()}원
- **총 수익률**: ${metrics.totalReturn >= 0 ? '+' : ''}${metrics.totalReturn.toFixed(2)}%
- **오늘 변동**: ${metrics.dayChange >= 0 ? '+' : ''}${metrics.dayChange.toLocaleString()}원 (${metrics.dayChangeRate >= 0 ? '+' : ''}${metrics.dayChangeRate.toFixed(2)}%)
- **종목 수**: ${metrics.holdings.length}개

### 보유 종목 (상위 5개)
${metrics.holdings
  .sort((a, b) => b.weight - a.weight)
  .slice(0, 5)
  .map(
    (h) =>
      `- **${h.stockName}**: ${h.weight.toFixed(1)}% | 수익률 ${h.returnRate >= 0 ? '+' : ''}${h.returnRate.toFixed(2)}% | 평가손익 ${h.unrealizedPL >= 0 ? '+' : ''}${h.unrealizedPL.toLocaleString()}원`
  )
  .join('\n')}

### 섹터 비중
${Object.entries(metrics.sectorWeights)
  .sort(([, a], [, b]) => b - a)
  .map(([sector, weight]) => `- ${sector}: ${weight.toFixed(1)}%`)
  .join('\n')}

${
  metrics.topGainer
    ? `\n### 최고 수익 종목\n- ${metrics.topGainer.stockName}: ${metrics.topGainer.returnRate >= 0 ? '+' : ''}${metrics.topGainer.returnRate.toFixed(2)}%`
    : ''
}

${
  metrics.topLoser
    ? `\n### 최대 손실 종목\n- ${metrics.topLoser.stockName}: ${metrics.topLoser.returnRate >= 0 ? '+' : ''}${metrics.topLoser.returnRate.toFixed(2)}%`
    : ''
}

${
  hasTransactions
    ? `
## 오늘의 거래
${transactions
  .map(
    (t) =>
      `- **${t.type === 'BUY' ? '✅ 매수' : '❌ 매도'}**: ${t.stockName} ${t.quantity}주 @ ${t.price.toLocaleString()}원 (총 ${t.totalAmount.toLocaleString()}원)`
  )
  .join('\n')}
`
    : '\n## 오늘의 거래\n오늘은 거래가 없었습니다.'
}

---

## 분석 요청

다음 내용을 포함하여 **친절하고 이해하기 쉬운 한국어**로 분석해주세요:

### 1. 포트폴리오 평가 (전체)
- 구성의 적절성 (다각화, 섹터 분산)
- 리스크 수준 평가
- 시장 대비 성과

${
  hasTransactions
    ? `
### 2. 오늘의 거래 평가
- 매수/매도 타이밍의 적절성
- 시장 상황과의 연계
- 거래 후 포트폴리오 변화
- 거래의 전략적 의미
`
    : ''
}

### ${hasTransactions ? '3' : '2'}. 시장 상황 분석
- 오늘 시장 흐름과 포트폴리오의 관계
- 보유 종목의 업종이 시장에서 어떻게 움직였는지
- 포트폴리오가 시장 변동에 어떻게 반응했는지

### ${hasTransactions ? '4' : '3'}. 개선 제안
- 2-3가지 **구체적이고 실행 가능한** 조언
- 리밸런싱 필요성 (있다면)
- 주의해야 할 리스크
- 다음 투자 전략 방향

---

**응답 형식**:
- Markdown 형식으로 작성
- 섹션을 명확히 구분 (##, ###)
- 중요한 내용은 **볼드체** 사용
- 수치는 정확히 표기
- 전문용어는 쉽게 풀어서 설명
`.trim()
}

/**
 * 3줄 요약 생성
 */
async function generateAnalysisSummary(fullAnalysis: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            '다음 포트폴리오 분석을 3줄로 요약하세요. 각 줄은 하나의 핵심 메시지를 담아야 합니다. 이모지를 적절히 사용하세요.',
        },
        {
          role: 'user',
          content: fullAnalysis,
        },
      ],
      max_completion_tokens: 200,
      temperature: 0.5,
    })

    return completion.choices[0].message.content || '요약을 생성할 수 없습니다.'
  } catch (error) {
    console.error('Failed to generate summary:', error)
    return '포트폴리오 분석이 완료되었습니다. 자세한 내용은 아래를 확인하세요.'
  }
}

/**
 * 전체 사용자에 대해 포트폴리오 분석 생성 (16:00 스케줄러에서 호출)
 */
export async function generateDailyPortfolioAnalysisForAllUsers(
  date?: KSTDateType
): Promise<{ successful: number; failed: number; total: number }> {
  console.log(
    `\n📊 [Scheduled] Generating daily portfolio analysis for all users...`
  )

  try {
    // KST 날짜 정규화
    const targetDate = date || KSTDate.today()

    // 포트폴리오를 보유한 모든 사용자 조회
    const users = await prisma.user.findMany({
      where: {
        portfolio: {
          isNot: null,
        },
      },
      select: {
        id: true,
        username: true,
      },
    })

    console.log(`Found ${users.length} users with portfolios`)

    let successful = 0
    let failed = 0

    // 각 사용자에 대해 분석 생성
    for (const user of users) {
      try {
        await generatePortfolioAnalysis(user.id, targetDate)
        successful++
      } catch (error) {
        console.error(
          `❌ Failed to generate analysis for user ${user.username}:`,
          error
        )
        failed++
      }
    }

    console.log(
      `✅ Portfolio analysis completed: ${successful} successful, ${failed} failed (total: ${users.length})`
    )

    return {
      successful,
      failed,
      total: users.length,
    }
  } catch (error) {
    console.error('❌ Failed to generate daily portfolio analysis:', error)
    throw error
  }
}
