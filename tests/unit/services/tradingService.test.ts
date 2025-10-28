/**
 * Unit tests for Trading Service
 * Tests buy/sell functionality and transaction management
 */

import { executeBuy, executeSell } from '@/lib/services/tradingService'
import { prisma } from '@/lib/prisma'
import * as stockService from '@/lib/services/stockService'

// Mock Prisma and stock service
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    portfolio: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    holding: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/services/stockService')

describe('TradingService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('executeBuy', () => {
    it('should successfully buy stock (new position)', async () => {
      const mockPortfolio = {
        id: 'portfolio123',
        userId: 'user123',
        currentCash: 10000000,
        initialCapital: 10000000,
        totalAssets: 10000000,
        totalReturn: 0,
        realizedPL: 0,
        unrealizedPL: 0,
        holdings: [],
      }

      const mockStockPrice = {
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 70000,
        changePrice: 1000,
        changeRate: 1.45,
        openPrice: 69000,
        highPrice: 71000,
        lowPrice: 68500,
        volume: 10000000,
      }

      // Mock responses
      ;(prisma.portfolio.findUnique as jest.Mock).mockResolvedValue(mockPortfolio)
      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue(mockStockPrice)
      ;(prisma.holding.findUnique as jest.Mock).mockResolvedValue(null) // No existing position

      // Mock transaction
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(prisma)
      })

      ;(prisma.transaction.create as jest.Mock).mockResolvedValue({
        id: 'tx123',
        type: 'BUY',
        stockCode: '005930',
        stockName: '삼성전자',
        quantity: 10,
        price: 70000,
        totalAmount: 700000,
        fee: 105,
      })

      ;(prisma.holding.create as jest.Mock).mockResolvedValue({
        id: 'holding123',
        stockCode: '005930',
        stockName: '삼성전자',
        quantity: 10,
        avgPrice: 70000,
        currentPrice: 70000,
      })

      const result = await executeBuy('user123', '005930', 10)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.transaction.type).toBe('BUY')
        expect(result.data.transaction.quantity).toBe(10)
        expect(result.data.transaction.price).toBe(70000)
        expect(result.data.transaction.totalAmount).toBe(700000)
      }
    })

    it('should successfully buy stock (add to existing position)', async () => {
      const mockPortfolio = {
        id: 'portfolio123',
        userId: 'user123',
        currentCash: 10000000,
        initialCapital: 10000000,
        holdings: [],
      }

      const mockStockPrice = {
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 75000,
      }

      const mockExistingHolding = {
        id: 'holding123',
        portfolioId: 'portfolio123',
        stockCode: '005930',
        stockName: '삼성전자',
        quantity: 10,
        avgPrice: 70000,
        currentPrice: 70000,
      }

      ;(prisma.portfolio.findUnique as jest.Mock).mockResolvedValue(mockPortfolio)
      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue(mockStockPrice)
      ;(prisma.holding.findUnique as jest.Mock).mockResolvedValue(mockExistingHolding)

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(prisma)
      })

      ;(prisma.transaction.create as jest.Mock).mockResolvedValue({
        id: 'tx123',
        type: 'BUY',
        stockCode: '005930',
        quantity: 5,
        price: 75000,
        totalAmount: 375000,
      })

      ;(prisma.holding.update as jest.Mock).mockResolvedValue({
        ...mockExistingHolding,
        quantity: 15,
        avgPrice: 71666.67, // (10*70000 + 5*75000) / 15
      })

      const result = await executeBuy('user123', '005930', 5)

      expect(result.success).toBe(true)
      expect(prisma.holding.update).toHaveBeenCalled()
    })

    it('should fail when insufficient funds', async () => {
      const mockPortfolio = {
        id: 'portfolio123',
        userId: 'user123',
        currentCash: 100000, // Only 100k KRW
        holdings: [],
      }

      const mockStockPrice = {
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 70000,
      }

      ;(prisma.portfolio.findUnique as jest.Mock).mockResolvedValue(mockPortfolio)
      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue(mockStockPrice)

      const result = await executeBuy('user123', '005930', 10) // Need 700k KRW

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('TRADING_INSUFFICIENT_FUNDS')
      }
    })

    it('should fail when portfolio not found', async () => {
      ;(prisma.portfolio.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await executeBuy('nonexistent', '005930', 10)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }
    })
  })

  describe('executeSell', () => {
    it('should successfully sell stock (partial sell)', async () => {
      const mockPortfolio = {
        id: 'portfolio123',
        userId: 'user123',
        currentCash: 5000000,
        realizedPL: 0,
        holdings: [],
      }

      const mockStockPrice = {
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 75000,
      }

      const mockHolding = {
        id: 'holding123',
        portfolioId: 'portfolio123',
        stockCode: '005930',
        stockName: '삼성전자',
        quantity: 10,
        avgPrice: 70000,
        currentPrice: 70000,
      }

      ;(prisma.portfolio.findUnique as jest.Mock).mockResolvedValue(mockPortfolio)
      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue(mockStockPrice)
      ;(prisma.holding.findUnique as jest.Mock).mockResolvedValue(mockHolding)

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(prisma)
      })

      ;(prisma.transaction.create as jest.Mock).mockResolvedValue({
        id: 'tx123',
        type: 'SELL',
        stockCode: '005930',
        quantity: 5,
        price: 75000,
        totalAmount: 375000,
      })

      ;(prisma.holding.update as jest.Mock).mockResolvedValue({
        ...mockHolding,
        quantity: 5,
      })

      const result = await executeSell('user123', '005930', 5)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.transaction.type).toBe('SELL')
        expect(result.data.transaction.quantity).toBe(5)
      }
      expect(prisma.holding.update).toHaveBeenCalled()
      expect(prisma.holding.delete).not.toHaveBeenCalled()
    })

    it('should successfully sell stock (full sell)', async () => {
      const mockPortfolio = {
        id: 'portfolio123',
        userId: 'user123',
        currentCash: 5000000,
        realizedPL: 0,
        holdings: [],
      }

      const mockStockPrice = {
        stockCode: '005930',
        currentPrice: 75000,
      }

      const mockHolding = {
        id: 'holding123',
        portfolioId: 'portfolio123',
        stockCode: '005930',
        stockName: '삼성전자',
        quantity: 10,
        avgPrice: 70000,
      }

      ;(prisma.portfolio.findUnique as jest.Mock).mockResolvedValue(mockPortfolio)
      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue(mockStockPrice)
      ;(prisma.holding.findUnique as jest.Mock).mockResolvedValue(mockHolding)

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(prisma)
      })

      ;(prisma.transaction.create as jest.Mock).mockResolvedValue({
        id: 'tx123',
        type: 'SELL',
        stockCode: '005930',
        quantity: 10,
        price: 75000,
      })

      ;(prisma.holding.delete as jest.Mock).mockResolvedValue(mockHolding)

      const result = await executeSell('user123', '005930', 10)

      expect(result.success).toBe(true)
      expect(prisma.holding.delete).toHaveBeenCalled()
      expect(prisma.holding.update).not.toHaveBeenCalled()
    })

    it('should fail when insufficient quantity', async () => {
      const mockPortfolio = {
        id: 'portfolio123',
        userId: 'user123',
        holdings: [],
      }

      const mockHolding = {
        id: 'holding123',
        portfolioId: 'portfolio123',
        stockCode: '005930',
        quantity: 5, // Only 5 shares
        avgPrice: 70000,
      }

      ;(prisma.portfolio.findUnique as jest.Mock).mockResolvedValue(mockPortfolio)
      ;(prisma.holding.findUnique as jest.Mock).mockResolvedValue(mockHolding)

      const result = await executeSell('user123', '005930', 10) // Try to sell 10

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('TRADING_INSUFFICIENT_QUANTITY')
      }
    })

    it('should fail when stock not owned', async () => {
      const mockPortfolio = {
        id: 'portfolio123',
        userId: 'user123',
        holdings: [],
      }

      ;(prisma.portfolio.findUnique as jest.Mock).mockResolvedValue(mockPortfolio)
      ;(prisma.holding.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await executeSell('user123', '005930', 10)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('TRADING_STOCK_NOT_OWNED')
      }
    })

    it('should calculate realized P/L correctly', async () => {
      const mockPortfolio = {
        id: 'portfolio123',
        userId: 'user123',
        currentCash: 5000000,
        realizedPL: 0,
        holdings: [],
      }

      const mockStockPrice = {
        stockCode: '005930',
        currentPrice: 80000, // Bought at 70000, selling at 80000
      }

      const mockHolding = {
        id: 'holding123',
        portfolioId: 'portfolio123',
        stockCode: '005930',
        stockName: '삼성전자',
        quantity: 10,
        avgPrice: 70000,
      }

      ;(prisma.portfolio.findUnique as jest.Mock).mockResolvedValue(mockPortfolio)
      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue(mockStockPrice)
      ;(prisma.holding.findUnique as jest.Mock).mockResolvedValue(mockHolding)

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return await callback(prisma)
      })

      ;(prisma.transaction.create as jest.Mock).mockResolvedValue({
        id: 'tx123',
        type: 'SELL',
        stockCode: '005930',
        quantity: 10,
        price: 80000,
      })

      ;(prisma.holding.delete as jest.Mock).mockResolvedValue(mockHolding)
      ;(prisma.portfolio.update as jest.Mock).mockResolvedValue(mockPortfolio)

      const result = await executeSell('user123', '005930', 10)

      expect(result.success).toBe(true)
      if (result.success) {
        // Realized P/L = (80000 - 70000) * 10 = 100000
        expect(result.data.transaction.realizedPL).toBe(100000)
      }
    })
  })
})
