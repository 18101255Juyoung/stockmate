/**
 * AI Advisor Service
 * GPT-5-nano를 사용한 투자 조언 및 포트폴리오 분석 서비스
 *
 * 2단계 AI 파이프라인:
 * - Stage 1: 시장 전체 분석 (하루 1회, 모든 사용자 공유)
 * - Stage 2: 개인 맞춤형 포트폴리오 분석 (사용자당 1회)
 */

import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'
import { KSTDate, type KSTDate as KSTDateType } from '@/lib/utils/kst-date'
import { DateQuery } from '@/lib/db/queries'
import { collectMarketData, formatMarketDataForAI, type MarketData } from './marketDataService'

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * 특정 날짜의 일일 포트폴리오 분석 생성
 * @param userId 사용자 ID
 * @param date 분석 대상 날짜 (KST)
 * @returns AI 분석 결과
 */
export async function generateDailyAnalysis(userId: string, date: Date) {
  try {
    // 1. 해당 날짜에 거래가 있는지 확인
    const hasTransactions = await checkDayTransactions(userId, date)
    if (!hasTransactions) {
      throw new Error('No transactions found for the specified date')
    }

    // 2. 이미 분석이 존재하는지 확인 (중복 방지)
    const analysisDate = KSTDate.fromDate(date)
    const existing = await prisma.aIAnalysis.findUnique({
      where: {
        userId_analysisDate: {
          userId,
          analysisDate,
        },
      },
    })

    if (existing) {
      return existing
    }

    // 3. 사용자 데이터 조회 (포트폴리오 + 거래 내역)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        portfolio: {
          include: {
            holdings: true,
          },
        },
        transactions: {
          where: {
            createdAt: DateQuery.onDate(analysisDate),
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user || !user.portfolio) {
      throw new Error('User or portfolio not found')
    }

    // 4. 분석 컨텍스트 생성
    const context = buildDailyContext(user, date)

    // 5. GPT-5-nano 호출 (전체 분석)
    const fullAnalysisCompletion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `당신은 전문 투자 자문가입니다. 사용자의 모의 투자 포트폴리오를 분석하고 건설적인 조언을 제공하세요.

분석 시 다음 항목을 포함하세요:
1. **오늘의 거래 분석**: 매수/매도 결정의 적절성, 타이밍, 가격
2. **포트폴리오 구성 평가**: 다각화, 업종 집중도, 리스크 분산
3. **수익률 분석**: 전체 수익률, 종목별 성과
4. **위험 요소**: 현재 포트폴리오의 잠재적 리스크
5. **구체적 제안**: 다음 거래를 위한 실행 가능한 조언

응답은 친절하고 이해하기 쉽게, 한국어로 작성하세요. 마크다운 형식을 사용하세요.`,
        },
        {
          role: 'user',
          content: context,
        },
      ],
      max_completion_tokens: 1000,
    })

    const fullAnalysis = fullAnalysisCompletion.choices[0].message.content || ''
    const tokensUsed = fullAnalysisCompletion.usage?.total_tokens || 0

    // 6. 3줄 요약 생성
    const summary = await generateAnalysisSummary(fullAnalysis)

    // 7. 비용 계산
    const cost = calculateCost(fullAnalysisCompletion.usage)

    // 8. 분석 결과 저장
    const analysis = await prisma.aIAnalysis.create({
      data: {
        userId,
        analysisType: 'daily_journal',
        response: fullAnalysis,
        summary,
        tokensUsed,
        cost,
        model: 'gpt-5-nano',
        analysisDate,
      },
    })

    return analysis
  } catch (error) {
    console.error('Daily analysis generation error:', error)
    throw error
  }
}

/**
 * 특정 날짜에 거래가 있는지 확인
 * @param userId 사용자 ID
 * @param date 확인할 날짜
 * @returns 거래 존재 여부
 */
export async function checkDayTransactions(
  userId: string,
  date: Date
): Promise<boolean> {
  const kstDate = KSTDate.fromDate(date)
  const count = await prisma.transaction.count({
    where: {
      userId,
      createdAt: DateQuery.onDate(kstDate),
    },
  })

  return count > 0
}

/**
 * AI에게 전달할 일일 분석 컨텍스트 생성
 * @param user 사용자 데이터 (포트폴리오 + 거래 내역 포함)
 * @param date 분석 날짜
 * @returns 프롬프트 컨텍스트
 */
function buildDailyContext(user: any, date: Date): string {
  const { portfolio, transactions } = user
  const dateStr = date.toLocaleDateString('ko-KR')

  let context = `# ${dateStr} 투자 일지 분석

## 오늘의 거래 내역\n\n`

  if (transactions.length > 0) {
    transactions.forEach((tx: any, index: number) => {
      const time = new Date(tx.createdAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const type = tx.type === 'BUY' ? '매수' : '매도'

      context += `${index + 1}. [${time}] ${type} - ${tx.stockName} (${tx.stockCode})
   - 수량: ${tx.quantity}주
   - 가격: ${tx.price.toLocaleString()}원
   - 총액: ${tx.totalAmount.toLocaleString()}원
   - 수수료: ${tx.fee.toLocaleString()}원
`
      if (tx.note) {
        context += `   - 투자 메모: ${tx.note}\n`
      }
      context += '\n'
    })
  } else {
    context += '오늘 거래 내역이 없습니다.\n\n'
  }

  // 현재 포트폴리오 상태
  context += `## 현재 포트폴리오 현황

- **총 자산**: ${portfolio.totalAssets.toLocaleString()}원
- **현금**: ${portfolio.currentCash.toLocaleString()}원
- **총 수익률**: ${portfolio.totalReturn.toFixed(2)}%
- **실현 손익**: ${portfolio.realizedPL.toLocaleString()}원
- **미실현 손익**: ${portfolio.unrealizedPL.toLocaleString()}원

`

  // 보유 종목
  if (portfolio.holdings.length > 0) {
    context += `## 보유 종목 (${portfolio.holdings.length}개)\n\n`

    portfolio.holdings.forEach((holding: any, index: number) => {
      const totalValue = holding.quantity * holding.currentPrice
      const profitLoss = (holding.currentPrice - holding.avgPrice) * holding.quantity
      const profitRate = (((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100).toFixed(2)

      context += `${index + 1}. **${holding.stockName}** (${holding.stockCode})
   - 보유: ${holding.quantity}주 × ${holding.currentPrice.toLocaleString()}원 = ${totalValue.toLocaleString()}원
   - 평균단가: ${holding.avgPrice.toLocaleString()}원
   - 손익: ${profitLoss.toLocaleString()}원 (${profitRate}%)

`
    })
  } else {
    context += `## 보유 종목\n현재 보유 종목 없음 (100% 현금)\n\n`
  }

  context += `\n위 정보를 바탕으로 오늘의 투자 활동을 분석하고 조언을 제공해주세요.`

  return context
}

/**
 * 전체 분석에서 3줄 요약 생성
 * @param fullAnalysis 전체 분석 내용
 * @returns 3줄 요약
 */
async function generateAnalysisSummary(fullAnalysis: string): Promise<string> {
  try {
    const summaryCompletion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content:
            '다음 투자 분석 내용을 3줄로 요약하세요. 각 줄은 한 문장으로, 핵심만 간결하게 전달하세요.',
        },
        {
          role: 'user',
          content: fullAnalysis,
        },
      ],
      max_completion_tokens: 500, // gpt-5-nano는 reasoning 모델이라 추론 + 요약 생성에 더 많은 토큰 필요
    })

    const summary = summaryCompletion.choices[0].message.content
    if (!summary || summary.trim().length === 0) {
      const lines = fullAnalysis.split('\n').filter((line) => line.trim().length > 0)
      return lines.slice(0, 3).join('\n')
    }

    return summary
  } catch (error) {
    console.error('Summary generation error:', error)
    // 요약 생성 실패 시 전체 분석의 첫 3줄 사용
    const lines = fullAnalysis.split('\n').filter((line) => line.trim().length > 0)
    return lines.slice(0, 3).join('\n')
  }
}

/**
 * API 사용 비용 계산
 * GPT-5-nano: $0.05 per 1M input tokens, $0.40 per 1M output tokens
 * @param usage OpenAI usage 객체
 * @returns 비용 (USD)
 */
export function calculateCost(usage: any): number {
  if (!usage) return 0

  const inputCost = (usage.prompt_tokens / 1_000_000) * 0.05
  const outputCost = (usage.completion_tokens / 1_000_000) * 0.4

  return parseFloat((inputCost + outputCost).toFixed(6))
}

/**
 * ========================================
 * 2단계 AI 파이프라인
 * ========================================
 */

/**
 * Stage 1: 시장 전체 분석 생성 (하루 1회)
 * KIS API로 시장 데이터를 수집하고 AI가 시장 상황을 분석
 * 결과는 MarketAnalysis 테이블에 저장되어 모든 사용자가 공유
 *
 * @param date 분석 날짜 (KST)
 * @returns 시장 분석 결과
 */
export async function generateMarketAnalysis(date: Date) {
  try {
    const analysisDate = KSTDate.fromDate(date)

    // 1. 이미 분석이 존재하는지 확인
    const existing = await prisma.marketAnalysis.findUnique({
      where: { date: analysisDate },
    })

    if (existing) {
      console.log(`[Market Analysis] Already exists for ${analysisDate.toISOString()}`)
      return existing
    }

    // 2. 시장 데이터 수집
    console.log('[Market Analysis] Collecting market data...')
    const marketData = await collectMarketData()

    // 3. AI에게 시장 분석 요청
    const marketDataText = formatMarketDataForAI(marketData)

    const fullAnalysisCompletion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `당신은 증권 시장 분석 전문가입니다. 오늘의 시장 상황을 종합적으로 분석하고 투자 인사이트를 제공하세요.

분석 시 다음 항목을 포함하세요:
1. **시장 전체 동향**: KOSPI, KOSDAQ 움직임 해석
2. **업종별 분석**: 어떤 업종이 강세/약세인지, 그 이유는?
3. **투자 시사점**: 오늘 시장 상황이 투자자들에게 의미하는 것
4. **내일의 전망**: 단기 시장 방향성 (주의: 확정적 예측 지양)
5. **주목할 포인트**: 투자자들이 관심 가져야 할 섹터나 이슈

응답은 명확하고 이해하기 쉽게, 한국어로 작성하세요. 마크다운 형식을 사용하세요.`,
        },
        {
          role: 'user',
          content: `다음은 오늘의 한국 주식 시장 데이터입니다. 이를 분석해주세요.\n\n${marketDataText}`,
        },
      ],
      max_completion_tokens: 5000, // gpt-5-nano는 reasoning 모델이라 추론 + 답변 생성에 더 많은 토큰 필요
    })

    const fullAnalysis = fullAnalysisCompletion.choices[0].message.content || ''
    const tokensUsed = fullAnalysisCompletion.usage?.total_tokens || 0

    // 4. 3줄 요약 생성
    const summary = await generateAnalysisSummary(fullAnalysis)

    // 5. 비용 계산
    const cost = calculateCost(fullAnalysisCompletion.usage)

    const analysis = await prisma.marketAnalysis.create({
      data: {
        date: analysisDate,
        marketData: marketData as any, // JSON 형태로 저장
        analysis: fullAnalysis,
        summary,
        tokensUsed,
        cost,
        model: 'gpt-5-nano',
      },
    })

    console.log('[Market Analysis] 💾 Saved to database - ID:', analysis.id)

    console.log(`[Market Analysis] ✅ Created for ${analysisDate.toISOString()} (${tokensUsed} tokens, $${cost})`)

    return analysis
  } catch (error) {
    console.error('[Market Analysis] ❌ Generation failed:', error)
    throw error
  }
}

/**
 * Stage 2: 개인 맞춤형 포트폴리오 분석 생성
 * Stage 1의 시장 분석을 참고하여 사용자 포트폴리오에 맞춤형 조언 제공
 *
 * @param userId 사용자 ID
 * @param date 분석 날짜
 * @param marketAnalysis 시장 분석 결과 (Stage 1)
 * @returns 개인 분석 결과
 */
export async function generatePersonalizedAnalysis(
  userId: string,
  date: Date,
  marketAnalysis: any
) {
  try {
    const analysisDate = KSTDate.fromDate(date)

    // 1. 이미 분석이 존재하는지 확인
    const existing = await prisma.aIAnalysis.findUnique({
      where: {
        userId_analysisDate: { userId, analysisDate },
      },
    })

    if (existing) {
      return existing
    }

    // 2. 사용자 포트폴리오 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        portfolio: {
          include: {
            holdings: true,
          },
        },
        transactions: {
          where: {
            createdAt: DateQuery.onDate(analysisDate),
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user || !user.portfolio) {
      throw new Error('User or portfolio not found')
    }

    // 3. 개인화 컨텍스트 생성 (시장 분석 + 포트폴리오)
    const context = buildPersonalizedContext(user, date, marketAnalysis)

    // 4. AI 호출 (개인 맞춤형 분석)
    const fullAnalysisCompletion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        {
          role: 'system',
          content: `당신은 개인 투자 자문가입니다. 오늘의 시장 상황과 사용자의 포트폴리오를 종합하여 맞춤형 조언을 제공하세요.

분석 시 다음 항목을 포함하세요:
1. **시장 상황과의 연계**: 오늘 시장 흐름이 내 포트폴리오에 미치는 영향
2. **포트폴리오 평가**: 현재 보유 종목들의 업종 분포와 시장 대응력
3. **거래 분석** (있을 경우): 오늘 매수/매도 결정의 적절성
4. **리스크 점검**: 현재 포트폴리오의 위험 요소
5. **실행 가능한 제안**: 구체적인 다음 액션 (종목 추가/감소, 리밸런싱 등)

응답은 친절하고 이해하기 쉽게, 한국어로 작성하세요. 마크다운 형식을 사용하세요.`,
        },
        {
          role: 'user',
          content: context,
        },
      ],
      max_completion_tokens: 1200,
    })

    const fullAnalysis = fullAnalysisCompletion.choices[0].message.content || ''
    const tokensUsed = fullAnalysisCompletion.usage?.total_tokens || 0

    // 5. 3줄 요약 생성
    const summary = await generateAnalysisSummary(fullAnalysis)

    // 6. 비용 계산
    const cost = calculateCost(fullAnalysisCompletion.usage)

    // 7. 결과 저장
    const analysis = await prisma.aIAnalysis.create({
      data: {
        userId,
        analysisType: 'daily_journal',
        response: fullAnalysis,
        summary,
        tokensUsed,
        cost,
        model: 'gpt-5-nano',
        analysisDate,
      },
    })

    return analysis
  } catch (error) {
    console.error(`[Personalized Analysis] Failed for user ${userId}:`, error)
    throw error
  }
}

/**
 * 개인화 분석을 위한 컨텍스트 생성
 * 시장 분석 + 포트폴리오 정보 결합
 */
function buildPersonalizedContext(user: any, date: Date, marketAnalysis: any): string {
  const { portfolio, transactions } = user
  const dateStr = date.toLocaleDateString('ko-KR')

  let context = `# ${dateStr} 개인 포트폴리오 분석\n\n`

  // 1. 시장 상황 요약 (Stage 1 결과)
  context += `## 오늘의 시장 상황\n\n${marketAnalysis.summary}\n\n`

  // 2. 오늘의 거래 내역 (있을 경우)
  if (transactions.length > 0) {
    context += `## 오늘의 거래 내역\n\n`
    transactions.forEach((tx: any, index: number) => {
      const time = new Date(tx.createdAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const type = tx.type === 'BUY' ? '매수' : '매도'

      context += `${index + 1}. [${time}] ${type} - ${tx.stockName} (${tx.stockCode})
   - 수량: ${tx.quantity}주
   - 가격: ${tx.price.toLocaleString()}원
   - 총액: ${tx.totalAmount.toLocaleString()}원\n`

      if (tx.note) {
        context += `   - 투자 메모: ${tx.note}\n`
      }
      context += '\n'
    })
  }

  // 3. 현재 포트폴리오 상태
  context += `## 현재 포트폴리오 현황\n
- **총 자산**: ${portfolio.totalAssets.toLocaleString()}원
- **현금**: ${portfolio.currentCash.toLocaleString()}원 (${((portfolio.currentCash / portfolio.totalAssets) * 100).toFixed(1)}%)
- **총 수익률**: ${portfolio.totalReturn.toFixed(2)}%
- **미실현 손익**: ${portfolio.unrealizedPL.toLocaleString()}원\n\n`

  // 4. 보유 종목
  if (portfolio.holdings.length > 0) {
    context += `## 보유 종목 (${portfolio.holdings.length}개)\n\n`

    portfolio.holdings.forEach((holding: any, index: number) => {
      const totalValue = holding.quantity * holding.currentPrice
      const profitLoss = (holding.currentPrice - holding.avgPrice) * holding.quantity
      const profitRate = (((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100).toFixed(2)
      const weight = ((totalValue / portfolio.totalAssets) * 100).toFixed(1)

      context += `${index + 1}. **${holding.stockName}** (${holding.stockCode})
   - 보유: ${holding.quantity}주 × ${holding.currentPrice.toLocaleString()}원 = ${totalValue.toLocaleString()}원
   - 포트폴리오 비중: ${weight}%
   - 평균단가: ${holding.avgPrice.toLocaleString()}원
   - 손익: ${profitLoss.toLocaleString()}원 (${profitRate}%)\n\n`
    })
  } else {
    context += `## 보유 종목\n현재 보유 종목 없음 (100% 현금)\n\n`
  }

  context += `\n위 시장 상황과 포트폴리오 정보를 바탕으로 맞춤형 투자 분석과 조언을 제공해주세요.`

  return context
}

/**
 * 모든 포트폴리오 보유자에 대해 일일 분석 생성 (Cron job용)
 * 2단계 파이프라인 실행:
 * 1. Stage 1: 시장 분석 생성 (1회)
 * 2. Stage 2: 각 사용자별 개인 분석 생성 (N회)
 */
export async function generateDailyAnalysisForAllUsers() {
  try {
    const today = KSTDate.today()

    console.log(`\n🤖 [AI Pipeline] Starting 2-stage analysis for ${today.toISOString()}...`)

    // Stage 1: 시장 분석 생성 (하루 1회)
    console.log('\n📊 [Stage 1] Generating market analysis...')
    const marketAnalysis = await generateMarketAnalysis(today)
    console.log(`✅ [Stage 1] Market analysis completed`)

    // Stage 2: 포트폴리오 보유자 조회
    // 총 자산이 초기 자본보다 크거나 보유 종목이 있는 사용자
    const usersWithPortfolio = await prisma.portfolio.findMany({
      where: {
        OR: [
          { totalAssets: { gt: 10000000 } }, // 초기 자본보다 많음
          { holdings: { some: {} } }, // 보유 종목 있음
        ],
      },
      select: {
        userId: true,
      },
    })

    const userIds = usersWithPortfolio.map((p) => p.userId)

    console.log(`\n👥 [Stage 2] Found ${userIds.length} portfolio holders`)
    console.log('[Stage 2] Generating personalized analysis...')

    // 각 사용자별 개인 분석 생성
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        generatePersonalizedAnalysis(userId, today, marketAnalysis)
      )
    )

    const successful = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    console.log(
      `✅ [Stage 2] Personalized analysis completed: ${successful} success, ${failed} failed`
    )
    console.log(
      `\n🎉 [AI Pipeline] Total completed: ${successful}/${userIds.length} users\n`
    )

    return { successful, failed, total: userIds.length }
  } catch (error) {
    console.error('❌ [AI Pipeline] Batch generation error:', error)
    throw error
  }
}
