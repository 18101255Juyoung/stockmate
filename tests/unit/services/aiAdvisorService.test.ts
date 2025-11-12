/**
 * AI Advisor Service Unit Tests
 * TDD: 테스트 먼저 작성, 구현 후 통과 확인
 */

import {
  generateDailyAnalysis,
  checkDayTransactions,
  calculateCost,
  generateDailyAnalysisForAllUsers,
} from '@/lib/services/aiAdvisorService'
import { prisma } from '@/lib/prisma'
import { toKSTDateOnly } from '@/lib/utils/timezone'

// OpenAI API 모킹
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content:
                    '## 오늘의 거래 분석\n\n삼성전자를 매수하신 결정은 좋습니다. IT 업종의 대표 종목으로 안정적인 수익을 기대할 수 있습니다.\n\n## 포트폴리오 평가\n\n현재 포트폴리오는 비교적 안정적입니다. 다각화를 위해 다른 업종도 고려해보세요.\n\n## 제안\n\n장기 투자 관점에서 꾸준히 분산 투자하시는 것을 추천합니다.',
                },
              },
            ],
            usage: {
              prompt_tokens: 500,
              completion_tokens: 300,
              total_tokens: 800,
            },
          }),
        },
      },
    })),
  }
})

describe('AI Advisor Service', () => {
  let testUser: any
  let testPortfolio: any
  let testTransaction: any

  beforeEach(async () => {
    // 테스트 사용자 생성
    testUser = await prisma.user.create({
      data: {
        email: 'aitest@example.com',
        username: 'aitest',
        password: 'hashedpassword',
        displayName: 'AI Test User',
        portfolio: {
          create: {
            initialCapital: 10000000,
            currentCash: 3000000,
            totalAssets: 8000000,
            totalReturn: -20.0,
            realizedPL: 0,
            unrealizedPL: -2000000,
          },
        },
      },
      include: {
        portfolio: true,
      },
    })

    testPortfolio = testUser.portfolio

    // 테스트 거래 생성 (오늘)
    testTransaction = await prisma.transaction.create({
      data: {
        userId: testUser.id,
        type: 'BUY',
        stockCode: '005930',
        stockName: '삼성전자',
        quantity: 10,
        price: 70000,
        totalAmount: 700000,
        fee: 350,
        note: '테스트 매수',
      },
    })

    // 보유 종목 생성
    await prisma.holding.create({
      data: {
        portfolioId: testPortfolio.id,
        stockCode: '005930',
        stockName: '삼성전자',
        quantity: 10,
        avgPrice: 70000,
        currentPrice: 68000,
      },
    })
  })

  afterEach(async () => {
    // 테스트 데이터 정리
    await prisma.aIAnalysis.deleteMany({ where: { userId: testUser.id } })
    await prisma.holding.deleteMany({ where: { portfolioId: testPortfolio.id } })
    await prisma.transaction.deleteMany({ where: { userId: testUser.id } })
    await prisma.portfolio.deleteMany({ where: { userId: testUser.id } })
    await prisma.user.deleteMany({ where: { id: testUser.id } })
  })

  describe('checkDayTransactions', () => {
    it('should return true when transactions exist for the date', async () => {
      const today = new Date()
      const hasTransactions = await checkDayTransactions(testUser.id, today)

      expect(hasTransactions).toBe(true)
    })

    it('should return false when no transactions exist for the date', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const hasTransactions = await checkDayTransactions(testUser.id, yesterday)

      expect(hasTransactions).toBe(false)
    })
  })

  describe('calculateCost', () => {
    it('should calculate cost correctly for GPT-5-nano', () => {
      const usage = {
        prompt_tokens: 500,
        completion_tokens: 300,
        total_tokens: 800,
      }

      const cost = calculateCost(usage)

      // Input: 500 tokens * $0.05 / 1M = $0.000025
      // Output: 300 tokens * $0.40 / 1M = $0.00012
      // Total: $0.000145
      expect(cost).toBeCloseTo(0.000145, 6)
    })

    it('should return 0 when usage is null', () => {
      const cost = calculateCost(null)
      expect(cost).toBe(0)
    })

    it('should return 0 when usage is undefined', () => {
      const cost = calculateCost(undefined)
      expect(cost).toBe(0)
    })
  })

  describe('generateDailyAnalysis', () => {
    it('should generate analysis for a day with transactions', async () => {
      const today = new Date()
      const analysis = await generateDailyAnalysis(testUser.id, today)

      expect(analysis).toBeDefined()
      expect(analysis.userId).toBe(testUser.id)
      expect(analysis.analysisType).toBe('daily_journal')
      expect(analysis.response).toContain('거래')
      expect(analysis.summary).toBeDefined()
      expect(analysis.tokensUsed).toBeGreaterThan(0)
      expect(analysis.cost).toBeGreaterThan(0)
      expect(analysis.model).toBe('gpt-5-nano')
    })

    it('should throw error when no transactions exist', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      await expect(generateDailyAnalysis(testUser.id, yesterday)).rejects.toThrow(
        'No transactions found for the specified date'
      )
    })

    it('should return existing analysis if already generated', async () => {
      const today = new Date()

      // 첫 번째 분석 생성
      const firstAnalysis = await generateDailyAnalysis(testUser.id, today)

      // 두 번째 호출 - 기존 분석 반환해야 함
      const secondAnalysis = await generateDailyAnalysis(testUser.id, today)

      expect(secondAnalysis.id).toBe(firstAnalysis.id)
      expect(secondAnalysis.createdAt).toEqual(firstAnalysis.createdAt)
    })

    it('should throw error for non-existent user', async () => {
      const today = new Date()

      await expect(
        generateDailyAnalysis('invalid-user-id', today)
      ).rejects.toThrow()
    })

    it('should save analysis with correct analysisDate', async () => {
      const today = new Date()
      const analysis = await generateDailyAnalysis(testUser.id, today)

      const expectedDate = toKSTDateOnly(today)
      expect(analysis.analysisDate.getTime()).toBe(expectedDate.getTime())
    })
  })

  describe('generateDailyAnalysisForAllUsers', () => {
    let secondUser: any

    beforeEach(async () => {
      // 두 번째 테스트 사용자 생성 (거래 있음)
      secondUser = await prisma.user.create({
        data: {
          email: 'aitest2@example.com',
          username: 'aitest2',
          password: 'hashedpassword',
          displayName: 'AI Test User 2',
          portfolio: {
            create: {
              initialCapital: 10000000,
              currentCash: 5000000,
              totalAssets: 9000000,
              totalReturn: -10.0,
            },
          },
        },
        include: {
          portfolio: true,
        },
      })

      // 오늘 거래 생성
      await prisma.transaction.create({
        data: {
          userId: secondUser.id,
          type: 'SELL',
          stockCode: '000660',
          stockName: 'SK하이닉스',
          quantity: 5,
          price: 120000,
          totalAmount: 600000,
          fee: 300,
        },
      })
    })

    afterEach(async () => {
      await prisma.aIAnalysis.deleteMany({ where: { userId: secondUser.id } })
      await prisma.transaction.deleteMany({ where: { userId: secondUser.id } })
      await prisma.portfolio.deleteMany({ where: { userId: secondUser.id } })
      await prisma.user.deleteMany({ where: { id: secondUser.id } })
    })

    it('should generate analysis for all users with transactions', async () => {
      const result = await generateDailyAnalysisForAllUsers()

      expect(result.total).toBe(2) // testUser + secondUser
      expect(result.successful).toBe(2)
      expect(result.failed).toBe(0)

      // 분석이 저장되었는지 확인
      const analyses = await prisma.aIAnalysis.findMany({
        where: {
          userId: {
            in: [testUser.id, secondUser.id],
          },
        },
      })

      expect(analyses).toHaveLength(2)
    })

    it('should handle errors gracefully', async () => {
      // 잘못된 사용자 ID로 거래 생성 (에러 발생 시뮬레이션)
      await prisma.transaction.create({
        data: {
          userId: 'invalid-user',
          type: 'BUY',
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 1,
          price: 70000,
          totalAmount: 70000,
          fee: 35,
        },
      })

      const result = await generateDailyAnalysisForAllUsers()

      // 유효한 사용자 2명은 성공, invalid-user는 실패
      expect(result.total).toBe(3)
      expect(result.successful).toBe(2)
      expect(result.failed).toBe(1)

      // 정리
      await prisma.transaction.deleteMany({ where: { userId: 'invalid-user' } })
    })
  })
})
