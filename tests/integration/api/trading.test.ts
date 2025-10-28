/**
 * Integration tests for trading API endpoints
 * Tests the complete buy/sell flow with real database
 */

import { prisma } from '@/lib/prisma'
import { executeBuy, executeSell } from '@/lib/services/tradingService'
import * as stockService from '@/lib/services/stockService'

// Mock stock service to avoid external API calls
jest.mock('@/lib/services/stockService')

describe('Trading API Integration Tests', () => {
  let testUserId: string
  let testPortfolioId: string

  beforeEach(async () => {
    // Clean up database
    await prisma.transaction.deleteMany({})
    await prisma.holding.deleteMany({})
    await prisma.portfolio.deleteMany({})
    await prisma.user.deleteMany({})

    // Create test user with portfolio
    const user = await prisma.user.create({
      data: {
        email: 'trader@example.com',
        password: 'hashedpassword',
        username: 'trader',
        displayName: 'Test Trader',
      },
    })

    const portfolio = await prisma.portfolio.create({
      data: {
        userId: user.id,
        initialCapital: 10000000,
        currentCash: 10000000,
        totalAssets: 10000000,
      },
    })

    testUserId = user.id
    testPortfolioId = portfolio.id

    // Mock stock price
    ;(stockService.getStockPrice as jest.Mock).mockResolvedValue({
      stockCode: '005930',
      stockName: '삼성전자',
      currentPrice: 70000,
      changePrice: 1000,
      changeRate: 1.45,
      openPrice: 69000,
      highPrice: 71000,
      lowPrice: 68500,
      volume: 10000000,
      updatedAt: new Date(),
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Buy Transaction', () => {
    it('should execute buy transaction successfully', async () => {
      const result = await executeBuy(testUserId, '005930', 10)

      expect(result.success).toBe(true)
      if (!result.success) return

      // Verify transaction was created
      expect(result.data.transaction.type).toBe('BUY')
      expect(result.data.transaction.quantity).toBe(10)
      expect(result.data.transaction.price).toBe(70000)

      // Verify holding was created
      const holding = await prisma.holding.findFirst({
        where: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
        },
      })

      expect(holding).not.toBeNull()
      expect(holding?.quantity).toBe(10)
      expect(holding?.avgPrice).toBe(70000)

      // Verify portfolio was updated
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: testPortfolioId },
      })

      expect(portfolio?.currentCash).toBeLessThan(10000000) // Cash decreased
    })

    it('should add to existing position correctly', async () => {
      // First buy
      await executeBuy(testUserId, '005930', 10)

      // Second buy at different price
      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue({
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 75000,
        changePrice: 5000,
        changeRate: 7.14,
        openPrice: 70000,
        highPrice: 76000,
        lowPrice: 70000,
        volume: 10000000,
        updatedAt: new Date(),
      })

      const result = await executeBuy(testUserId, '005930', 5)

      expect(result.success).toBe(true)

      // Verify holding was updated
      const holding = await prisma.holding.findFirst({
        where: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
        },
      })

      expect(holding?.quantity).toBe(15) // 10 + 5
      // Average price = (10 * 70000 + 5 * 75000) / 15 = 71666.67
      expect(holding?.avgPrice).toBeCloseTo(71666.67, 1)
    })

    it('should fail when insufficient funds', async () => {
      // Try to buy more than available cash
      const result = await executeBuy(testUserId, '005930', 200) // Need 14M, have 10M

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('TRADING_INSUFFICIENT_FUNDS')

      // Verify no transaction was created
      const transactions = await prisma.transaction.findMany({
        where: { userId: testUserId },
      })
      expect(transactions).toHaveLength(0)
    })
  })

  describe('Sell Transaction', () => {
    beforeEach(async () => {
      // Buy some stock first
      await executeBuy(testUserId, '005930', 10)
    })

    it('should execute sell transaction successfully', async () => {
      // Change price for selling
      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue({
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 75000, // Profit: 5000 per share
        changePrice: 5000,
        changeRate: 7.14,
        openPrice: 70000,
        highPrice: 76000,
        lowPrice: 70000,
        volume: 10000000,
        updatedAt: new Date(),
      })

      const result = await executeSell(testUserId, '005930', 5)

      expect(result.success).toBe(true)
      if (!result.success) return

      // Verify transaction was created
      expect(result.data.transaction.type).toBe('SELL')
      expect(result.data.transaction.quantity).toBe(5)
      expect(result.data.transaction.realizedPL).toBeGreaterThan(0) // Made profit

      // Verify holding was updated
      const holding = await prisma.holding.findFirst({
        where: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
        },
      })

      expect(holding?.quantity).toBe(5) // 10 - 5

      // Verify portfolio cash increased
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: testPortfolioId },
      })

      // Original 10M - buy cost + sell proceeds
      expect(portfolio?.currentCash).toBeGreaterThan(10000000 - 10 * 70000)
    })

    it('should delete holding when selling all shares', async () => {
      const result = await executeSell(testUserId, '005930', 10)

      expect(result.success).toBe(true)

      // Verify holding was deleted
      const holding = await prisma.holding.findFirst({
        where: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
        },
      })

      expect(holding).toBeNull()
    })

    it('should fail when insufficient quantity', async () => {
      const result = await executeSell(testUserId, '005930', 20) // Only have 10

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('TRADING_INSUFFICIENT_QUANTITY')
    })

    it('should fail when stock not owned', async () => {
      const result = await executeSell(testUserId, '000660', 10) // Don't own this stock

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('TRADING_STOCK_NOT_OWNED')
    })
  })

  describe('Complete Trading Flow', () => {
    it('should handle buy -> sell -> buy again correctly', async () => {
      // Buy 10 shares at 70000
      const buy1 = await executeBuy(testUserId, '005930', 10)
      expect(buy1.success).toBe(true)

      // Sell 5 shares at 75000
      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue({
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 75000,
        changePrice: 5000,
        changeRate: 7.14,
        openPrice: 70000,
        highPrice: 76000,
        lowPrice: 70000,
        volume: 10000000,
        updatedAt: new Date(),
      })
      const sell1 = await executeSell(testUserId, '005930', 5)
      expect(sell1.success).toBe(true)

      // Buy 3 more shares at 72000
      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue({
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 72000,
        changePrice: 2000,
        changeRate: 2.86,
        openPrice: 70000,
        highPrice: 73000,
        lowPrice: 70000,
        volume: 10000000,
        updatedAt: new Date(),
      })
      const buy2 = await executeBuy(testUserId, '005930', 3)
      expect(buy2.success).toBe(true)

      // Verify final holding
      const holding = await prisma.holding.findFirst({
        where: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
        },
      })

      expect(holding?.quantity).toBe(8) // 10 - 5 + 3
      // Average price should be recalculated: (5*70000 + 3*72000) / 8
      expect(holding?.avgPrice).toBeCloseTo(70750, 1)

      // Verify transaction history
      const transactions = await prisma.transaction.findMany({
        where: { userId: testUserId },
        orderBy: { createdAt: 'asc' },
      })

      expect(transactions).toHaveLength(3)
      expect(transactions[0].type).toBe('BUY')
      expect(transactions[1].type).toBe('SELL')
      expect(transactions[2].type).toBe('BUY')
    })

    it('should calculate portfolio metrics correctly after multiple trades', async () => {
      // Initial cash: 10,000,000

      // Buy stock A
      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue({
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 70000,
        changePrice: 1000,
        changeRate: 1.45,
        openPrice: 69000,
        highPrice: 71000,
        lowPrice: 68500,
        volume: 10000000,
        updatedAt: new Date(),
      })
      await executeBuy(testUserId, '005930', 10) // Cost: 700,000 + fee

      // Buy stock B
      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue({
        stockCode: '000660',
        stockName: 'SK하이닉스',
        currentPrice: 130000,
        changePrice: 2000,
        changeRate: 1.56,
        openPrice: 128000,
        highPrice: 132000,
        lowPrice: 128000,
        volume: 5000000,
        updatedAt: new Date(),
      })
      await executeBuy(testUserId, '000660', 5) // Cost: 650,000 + fee

      // Verify portfolio state
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: testPortfolioId },
        include: { holdings: true },
      })

      expect(portfolio?.holdings).toHaveLength(2)

      // Total value should be approximately 10M (cash decreased by purchases)
      const totalInvested = 700000 + 650000
      expect(portfolio?.currentCash).toBeLessThan(10000000)
      expect(portfolio?.currentCash).toBeGreaterThan(10000000 - totalInvested - 1000) // Account for fees
    })
  })
})
