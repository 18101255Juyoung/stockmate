import { getPortfolioHistory } from '@/lib/services/portfolioHistoryService'
import { prisma } from '@/lib/prisma'
import { ErrorCodes } from '@/lib/types/api'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    holding: {
      findMany: jest.fn(),
    },
    stockPriceHistory: {
      findMany: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('PortfolioHistoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set default mock for stockPriceHistory - returns empty array by default
    ;(mockPrisma.stockPriceHistory.findMany as jest.Mock).mockResolvedValue([])
  })

  describe('getPortfolioHistory', () => {
    const mockUserId = 'user-123'
    const mockPortfolioId = 'portfolio-123'

    it('should return daily history when user has no transactions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        email: 'test@example.com',
        password: 'hashed',
        username: 'testuser',
        displayName: 'Test User',
        bio: null,
        profileImage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        portfolio: {
          id: mockPortfolioId,
          userId: mockUserId,
          initialCapital: 10000000,
          currentCash: 10000000,
          totalAssets: 10000000,
          totalReturn: 0,
          realizedPL: 0,
          unrealizedPL: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          holdings: [],
        },
      } as any)

      mockPrisma.transaction.findMany.mockResolvedValue([])

      const result = await getPortfolioHistory(mockUserId)

      expect(result.success).toBe(true)
      // When no transactions, should return daily history from creation to today with initial capital
      expect(result.data?.history.length).toBeGreaterThan(0)
      expect(result.data?.history[0].cash).toBe(10000000)
      expect(result.data?.history[0].totalAssets).toBe(10000000)
      expect(result.data?.history[0].return).toBe(0)
    })

    it('should calculate portfolio value after a BUY transaction', async () => {
      const txDate = new Date('2024-01-15T10:00:00Z')

      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        portfolio: {
          id: mockPortfolioId,
          initialCapital: 10000000,
        },
      } as any)

      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          userId: mockUserId,
          type: 'BUY',
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          price: 70000,
          totalAmount: 700000,
          fee: 0,
          note: null,
          createdAt: txDate,
        },
      ] as any)

      mockPrisma.holding.findMany.mockResolvedValue([
        {
          id: 'holding-1',
          portfolioId: mockPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 70000,
          currentPrice: 72000,
          createdAt: txDate,
          updatedAt: new Date(),
        },
      ] as any)

      const result = await getPortfolioHistory(mockUserId, { period: 'all' })

      expect(result.success).toBe(true)
      expect(result.data?.history.length).toBeGreaterThan(0)

      const firstPoint = result.data!.history[0]
      expect(firstPoint.cash).toBe(9300000) // 10,000,000 - 700,000
      expect(firstPoint.totalAssets).toBe(10020000) // 9,300,000 + (10 * 72,000)
      expect(firstPoint.return).toBeCloseTo(0.2, 1) // 0.2% return
    })

    it('should calculate portfolio value after BUY and SELL transactions', async () => {
      const buyDate = new Date('2024-01-10T10:00:00Z')
      const sellDate = new Date('2024-01-15T14:00:00Z')

      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        portfolio: {
          id: mockPortfolioId,
          initialCapital: 10000000,
        },
      } as any)

      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          userId: mockUserId,
          type: 'BUY',
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          price: 70000,
          totalAmount: 700000,
          fee: 0,
          note: null,
          createdAt: buyDate,
        },
        {
          id: 'tx-2',
          userId: mockUserId,
          type: 'SELL',
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 5,
          price: 75000,
          totalAmount: 375000,
          fee: 0,
          note: null,
          createdAt: sellDate,
        },
      ] as any)

      mockPrisma.holding.findMany.mockResolvedValue([
        {
          id: 'holding-1',
          portfolioId: mockPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 5,
          avgPrice: 70000,
          currentPrice: 75000,
          createdAt: buyDate,
          updatedAt: sellDate,
        },
      ] as any)

      const result = await getPortfolioHistory(mockUserId, { period: 'all' })

      expect(result.success).toBe(true)
      expect(result.data?.history.length).toBeGreaterThanOrEqual(2)

      // After SELL, cash should increase
      const lastPoint = result.data!.history[result.data!.history.length - 1]
      expect(lastPoint.cash).toBeGreaterThan(9300000) // Initial cash after buy + sell proceeds
    })

    it('should filter history by period (7 days)', async () => {
      const now = new Date()
      const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)

      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        portfolio: {
          id: mockPortfolioId,
          initialCapital: 10000000,
        },
      } as any)

      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-old',
          userId: mockUserId,
          type: 'BUY',
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          price: 70000,
          totalAmount: 700000,
          fee: 0,
          note: null,
          createdAt: tenDaysAgo,
        },
        {
          id: 'tx-recent',
          userId: mockUserId,
          type: 'BUY',
          stockCode: '000660',
          stockName: 'SK하이닉스',
          quantity: 5,
          price: 150000,
          totalAmount: 750000,
          fee: 0,
          note: null,
          createdAt: sixDaysAgo,
        },
      ] as any)

      mockPrisma.holding.findMany.mockResolvedValue([
        {
          id: 'holding-1',
          portfolioId: mockPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 70000,
          currentPrice: 71000,
          createdAt: tenDaysAgo,
          updatedAt: tenDaysAgo,
        },
        {
          id: 'holding-2',
          portfolioId: mockPortfolioId,
          stockCode: '000660',
          stockName: 'SK하이닉스',
          quantity: 5,
          avgPrice: 150000,
          currentPrice: 155000,
          createdAt: sixDaysAgo,
          updatedAt: sixDaysAgo,
        },
      ] as any)

      const result = await getPortfolioHistory(mockUserId, { period: '7d' })

      expect(result.success).toBe(true)
      // Should only include transactions from last 7 days
      const allDates = result.data!.history.map((h) => h.date)
      const oldTransactionIncluded = allDates.some(
        (date) => new Date(date).getTime() < sixDaysAgo.getTime()
      )
      expect(oldTransactionIncluded).toBe(false)
    })

    it('should handle multiple transactions on the same day', async () => {
      const sameDate = new Date('2024-01-15T10:00:00Z')

      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        portfolio: {
          id: mockPortfolioId,
          initialCapital: 10000000,
          createdAt: sameDate, // Set portfolio creation date
        },
      } as any)

      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          userId: mockUserId,
          type: 'BUY',
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          price: 70000,
          totalAmount: 700000,
          fee: 0,
          note: null,
          createdAt: sameDate,
        },
        {
          id: 'tx-2',
          userId: mockUserId,
          type: 'BUY',
          stockCode: '000660',
          stockName: 'SK하이닉스',
          quantity: 5,
          price: 150000,
          totalAmount: 750000,
          fee: 0,
          note: null,
          createdAt: sameDate,
        },
      ] as any)

      mockPrisma.holding.findMany.mockResolvedValue([
        {
          id: 'holding-1',
          portfolioId: mockPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 70000,
          currentPrice: 71000,
          createdAt: sameDate,
          updatedAt: sameDate,
        },
        {
          id: 'holding-2',
          portfolioId: mockPortfolioId,
          stockCode: '000660',
          stockName: 'SK하이닉스',
          quantity: 5,
          avgPrice: 150000,
          currentPrice: 151000,
          createdAt: sameDate,
          updatedAt: sameDate,
        },
      ] as any)

      const result = await getPortfolioHistory(mockUserId, { period: 'all' })

      expect(result.success).toBe(true)
      // Implementation creates daily history points, not transaction-based points
      expect(result.data?.history.length).toBeGreaterThan(0)

      // Check that transactions are reflected in the history
      const lastPoint = result.data!.history[result.data!.history.length - 1]
      expect(lastPoint.cash).toBe(8550000) // 10,000,000 - 700,000 - 750,000
      expect(lastPoint.totalAssets).toBeGreaterThan(8550000) // Cash + stock values
    })

    it('should return error when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await getPortfolioHistory('non-existent-user')

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND)
    })

    it('should return error when user has no portfolio', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: mockUserId,
        portfolio: null,
      } as any)

      const result = await getPortfolioHistory(mockUserId)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND)
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))

      const result = await getPortfolioHistory(mockUserId)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(ErrorCodes.INTERNAL_ERROR)
    })

    it('should use historical stock prices for accurate past portfolio values', async () => {
      // 시나리오: 10월 31일에 포트폴리오 생성
      // 11월 1일에 삼성전자를 68,000원에 10주 매수
      // 현재(11월 11일) 삼성전자는 70,000원
      // 11월 5일의 실제 가격은 69,000원이었음

      const oct31 = new Date('2024-10-31T09:00:00Z')
      const nov1 = new Date('2024-11-01T10:00:00Z')
      const nov5 = new Date('2024-11-05T00:00:00Z')
      const nov11 = new Date('2024-11-11T00:00:00Z')

      ;(mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        portfolio: {
          id: mockPortfolioId,
          initialCapital: 10000000,
          createdAt: oct31,
        },
      } as any)

      // 매수 거래
      ;(mockPrisma.transaction.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'tx-1',
          userId: mockUserId,
          type: 'BUY',
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          price: 68000,
          totalAmount: 680000,
          fee: 0,
          note: null,
          createdAt: nov1,
        },
      ] as any)

      // 현재 보유 (currentPrice = 70000, 오늘 가격)
      ;(mockPrisma.holding.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'holding-1',
          portfolioId: mockPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 68000,
          currentPrice: 70000, // 오늘(11/11) 가격
          createdAt: nov1,
          updatedAt: nov11,
        },
      ] as any)

      // 과거 주가 이력 (StockPriceHistory) - 현재는 사용되지 않지만, 구현 후 사용될 예정
      ;(mockPrisma.stockPriceHistory.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'price-1',
          stockCode: '005930',
          date: nov1,
          openPrice: 67500,
          closePrice: 68000,
          highPrice: 68500,
          lowPrice: 67000,
          volume: 1000000,
          createdAt: nov1,
        },
        {
          id: 'price-2',
          stockCode: '005930',
          date: nov5,
          openPrice: 68500,
          closePrice: 69000,
          highPrice: 69500,
          lowPrice: 68000,
          volume: 1100000,
          createdAt: nov5,
        },
        {
          id: 'price-3',
          stockCode: '005930',
          date: nov11,
          openPrice: 69500,
          closePrice: 70000,
          highPrice: 70500,
          lowPrice: 69000,
          volume: 1200000,
          createdAt: nov11,
        },
      ] as any)

      const result = await getPortfolioHistory(mockUserId, { period: '30d' })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.history.length).toBeGreaterThan(0)

      // 11월 1일: 10주 × 68,000원 = 680,000원 (당일 종가)
      const nov1Data = result.data.history.find((h: any) =>
        new Date(h.date).toISOString().split('T')[0] === '2024-11-01'
      )
      expect(nov1Data).toBeDefined()
      expect(nov1Data!.cash).toBe(9320000) // 10,000,000 - 680,000
      expect(nov1Data!.totalAssets).toBe(10000000) // 9,320,000 + (10 × 68,000)
      expect(nov1Data!.return).toBeCloseTo(0, 1) // 손익 없음

      // 11월 5일: 10주 × 69,000원 = 690,000원 (11/5 종가)
      const nov5Data = result.data.history.find((h: any) =>
        new Date(h.date).toISOString().split('T')[0] === '2024-11-05'
      )
      expect(nov5Data).toBeDefined()
      expect(nov5Data!.cash).toBe(9320000) // 현금 변동 없음
      expect(nov5Data!.totalAssets).toBe(10010000) // 9,320,000 + (10 × 69,000)
      expect(nov5Data!.return).toBeCloseTo(0.1, 1) // +0.1% 수익

      // 11월 11일: 10주 × 70,000원 = 700,000원 (오늘 종가)
      const nov11Data = result.data.history.find((h: any) =>
        new Date(h.date).toISOString().split('T')[0] === '2024-11-11'
      )
      expect(nov11Data).toBeDefined()
      expect(nov11Data!.cash).toBe(9320000) // 현금 변동 없음
      expect(nov11Data!.totalAssets).toBe(10020000) // 9,320,000 + (10 × 70,000)
      expect(nov11Data!.return).toBeCloseTo(0.2, 1) // +0.2% 수익

      // 중요: 각 날짜마다 다른 값이어야 함 (평평한 선이 아님!)
      expect(nov1Data!.totalAssets).not.toBe(nov5Data!.totalAssets)
      expect(nov5Data!.totalAssets).not.toBe(nov11Data!.totalAssets)
    })
  })
})
