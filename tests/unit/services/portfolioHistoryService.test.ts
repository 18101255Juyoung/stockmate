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
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('PortfolioHistoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPortfolioHistory', () => {
    const mockUserId = 'user-123'
    const mockPortfolioId = 'portfolio-123'

    it('should return empty history when user has no transactions', async () => {
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
      expect(result.data?.history).toEqual([])
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
      expect(result.data?.history.length).toBe(2) // Two transactions = two history points

      // First transaction
      const firstPoint = result.data!.history[0]
      expect(firstPoint.cash).toBe(9300000) // 10,000,000 - 700,000

      // Second transaction (both transactions reflected)
      const secondPoint = result.data!.history[1]
      expect(secondPoint.cash).toBe(8550000) // 10,000,000 - 700,000 - 750,000
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
  })
})
