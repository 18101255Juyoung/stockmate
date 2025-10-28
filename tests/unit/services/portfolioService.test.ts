/**
 * Unit tests for Portfolio Service
 * Tests portfolio management and metrics calculation
 */

import {
  getPortfolio,
  updatePortfolioMetrics,
  refreshHoldingPrices,
} from '@/lib/services/portfolioService'
import { prisma } from '@/lib/prisma'
import * as stockService from '@/lib/services/stockService'

// Mock Prisma and stock service
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    portfolio: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    holding: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/services/stockService')

describe('PortfolioService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPortfolio', () => {
    it('should get portfolio with holdings', async () => {
      const mockUser = {
        id: 'user123',
        portfolio: {
          id: 'portfolio123',
          userId: 'user123',
          initialCapital: 10000000,
          currentCash: 5000000,
          totalAssets: 10000000,
          totalReturn: 0,
          realizedPL: 0,
          unrealizedPL: 0,
          holdings: [
            {
              id: 'holding1',
              stockCode: '005930',
              stockName: '삼성전자',
              quantity: 10,
              avgPrice: 70000,
              currentPrice: 75000,
            },
            {
              id: 'holding2',
              stockCode: '000660',
              stockName: 'SK하이닉스',
              quantity: 5,
              avgPrice: 130000,
              currentPrice: 135000,
            },
          ],
        },
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await getPortfolio('user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.portfolio.id).toBe('portfolio123')
        expect(result.data.portfolio.holdings).toHaveLength(2)
        expect(result.data.portfolio.holdings[0].stockCode).toBe('005930')
      }

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        include: {
          portfolio: {
            include: {
              holdings: true,
            },
          },
        },
      })
    })

    it('should return error if user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getPortfolio('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }
    })

    it('should return error if portfolio not found', async () => {
      const mockUser = {
        id: 'user123',
        portfolio: null,
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await getPortfolio('user123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }
    })

    it('should handle empty holdings', async () => {
      const mockUser = {
        id: 'user123',
        portfolio: {
          id: 'portfolio123',
          userId: 'user123',
          initialCapital: 10000000,
          currentCash: 10000000,
          totalAssets: 10000000,
          totalReturn: 0,
          realizedPL: 0,
          unrealizedPL: 0,
          holdings: [],
        },
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await getPortfolio('user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.portfolio.holdings).toHaveLength(0)
      }
    })
  })

  describe('updatePortfolioMetrics', () => {
    it('should update portfolio metrics based on holdings', async () => {
      const mockPortfolio = {
        id: 'portfolio123',
        initialCapital: 10000000,
        currentCash: 5000000,
        holdings: [
          {
            quantity: 10,
            avgPrice: 70000,
            currentPrice: 75000,
          },
          {
            quantity: 5,
            avgPrice: 130000,
            currentPrice: 135000,
          },
        ],
      }

      ;(prisma.portfolio.findUnique as jest.Mock).mockResolvedValue(mockPortfolio)
      ;(prisma.portfolio.update as jest.Mock).mockResolvedValue({
        ...mockPortfolio,
        totalAssets: 6425000,
        totalReturn: -35.75,
        unrealizedPL: 75000,
      })

      const result = await updatePortfolioMetrics('portfolio123')

      expect(result.success).toBe(true)

      // Verify calculations
      expect(prisma.portfolio.update).toHaveBeenCalledWith({
        where: { id: 'portfolio123' },
        data: expect.objectContaining({
          totalAssets: 6425000, // 5,000,000 + 750,000 + 675,000
          totalReturn: expect.any(Number),
          unrealizedPL: 75000, // (75000-70000)*10 + (135000-130000)*5
        }),
      })
    })

    it('should handle portfolio with no holdings', async () => {
      const mockPortfolio = {
        id: 'portfolio123',
        initialCapital: 10000000,
        currentCash: 10000000,
        holdings: [],
      }

      ;(prisma.portfolio.findUnique as jest.Mock).mockResolvedValue(mockPortfolio)
      ;(prisma.portfolio.update as jest.Mock).mockResolvedValue({
        ...mockPortfolio,
        totalAssets: 10000000,
        totalReturn: 0,
        unrealizedPL: 0,
      })

      const result = await updatePortfolioMetrics('portfolio123')

      expect(result.success).toBe(true)
      expect(prisma.portfolio.update).toHaveBeenCalledWith({
        where: { id: 'portfolio123' },
        data: {
          totalAssets: 10000000,
          totalReturn: 0,
          unrealizedPL: 0,
        },
      })
    })

    it('should return error if portfolio not found', async () => {
      ;(prisma.portfolio.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await updatePortfolioMetrics('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }
    })
  })

  describe('refreshHoldingPrices', () => {
    it('should update all holding prices from stock service', async () => {
      const mockHoldings = [
        {
          id: 'holding1',
          stockCode: '005930',
          currentPrice: 70000,
        },
        {
          id: 'holding2',
          stockCode: '000660',
          currentPrice: 130000,
        },
      ]

      ;(prisma.holding.findMany as jest.Mock).mockResolvedValue(mockHoldings)

      // Mock stock prices
      ;(stockService.getStockPrice as jest.Mock)
        .mockResolvedValueOnce({ currentPrice: 75000 }) // Samsung
        .mockResolvedValueOnce({ currentPrice: 135000 }) // SK Hynix

      const result = await refreshHoldingPrices('portfolio123')

      expect(result.success).toBe(true)

      // Verify stock service was called for each holding
      expect(stockService.getStockPrice).toHaveBeenCalledTimes(2)
      expect(stockService.getStockPrice).toHaveBeenCalledWith('005930')
      expect(stockService.getStockPrice).toHaveBeenCalledWith('000660')

      // Verify holdings were updated
      expect(prisma.holding.update).toHaveBeenCalledTimes(2)
      expect(prisma.holding.update).toHaveBeenCalledWith({
        where: { id: 'holding1' },
        data: { currentPrice: 75000 },
      })
      expect(prisma.holding.update).toHaveBeenCalledWith({
        where: { id: 'holding2' },
        data: { currentPrice: 135000 },
      })
    })

    it('should handle empty holdings', async () => {
      ;(prisma.holding.findMany as jest.Mock).mockResolvedValue([])

      const result = await refreshHoldingPrices('portfolio123')

      expect(result.success).toBe(true)
      expect(stockService.getStockPrice).not.toHaveBeenCalled()
    })

    it('should handle stock service errors gracefully', async () => {
      const mockHoldings = [
        { id: 'holding1', stockCode: '005930', currentPrice: 70000 },
      ]

      ;(prisma.holding.findMany as jest.Mock).mockResolvedValue(mockHoldings)
      ;(stockService.getStockPrice as jest.Mock).mockRejectedValue(
        new Error('KIS API error')
      )

      const result = await refreshHoldingPrices('portfolio123')

      // Should still succeed but skip failed updates
      expect(result.success).toBe(true)
    })

    it('should continue updating other holdings if one fails', async () => {
      const mockHoldings = [
        { id: 'holding1', stockCode: '005930', currentPrice: 70000 },
        { id: 'holding2', stockCode: '000660', currentPrice: 130000 },
      ]

      ;(prisma.holding.findMany as jest.Mock).mockResolvedValue(mockHoldings)

      // First call fails, second succeeds
      ;(stockService.getStockPrice as jest.Mock)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ currentPrice: 135000 })

      const result = await refreshHoldingPrices('portfolio123')

      expect(result.success).toBe(true)
      // Only one holding should be updated
      expect(prisma.holding.update).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection error')
      )

      const result = await getPortfolio('user123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('INTERNAL_ERROR')
      }
    })
  })
})
