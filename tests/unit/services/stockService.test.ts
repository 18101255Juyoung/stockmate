import { getStockPrice, searchStocks, getStockInfo } from '@/lib/services/stockService'
import { prisma } from '@/lib/prisma'
import { StockPrice, StockSearchResult } from '@/lib/types/stock'
import cache from '@/lib/utils/cache'

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    stock: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

// Mock KIS API client
jest.mock('@/lib/utils/kisApi')

import { getKISApiClient } from '@/lib/utils/kisApi'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockKISClient = {
  callApi: jest.fn(),
}
const mockGetKISApiClient = getKISApiClient as jest.MockedFunction<typeof getKISApiClient>

describe('StockService', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Setup KIS API client mock
    mockGetKISApiClient.mockReturnValue(mockKISClient as any)

    // Clear cache before each test
    cache.clear()
  })

  afterAll(() => {
    // Clean up to prevent Jest from hanging
    cache.clear()
  })

  describe('getStockPrice', () => {
    it('should fetch and return current stock price', async () => {
      // Mock database stock record
      const mockStock = {
        stockCode: '005930',
        stockName: '삼성전자',
        market: 'KOSPI',
        currentPrice: 70000,
        openPrice: 69500,
        highPrice: 70500,
        lowPrice: 69000,
        volume: BigInt(12345678),
        priceUpdatedAt: new Date('2024-01-15T10:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
      }

      mockPrisma.stock.findUnique.mockResolvedValue(mockStock as any)

      const result: StockPrice = await getStockPrice('005930')

      // Verify Prisma was called with correct params
      expect(mockPrisma.stock.findUnique).toHaveBeenCalledWith({
        where: { stockCode: '005930' },
      })

      // Verify response format
      expect(result).toMatchObject({
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 70000,
        changePrice: 0, // TODO: will be implemented with price history
        changeRate: 0, // TODO: will be implemented with price history
        openPrice: 69500,
        highPrice: 70500,
        lowPrice: 69000,
        volume: 12345678,
      })
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should cache stock price for 5 minutes', async () => {
      const mockStock = {
        stockCode: '005930',
        stockName: '삼성전자',
        market: 'KOSPI',
        currentPrice: 70000,
        openPrice: 69500,
        highPrice: 70500,
        lowPrice: 69000,
        volume: BigInt(12345678),
        priceUpdatedAt: new Date('2024-01-15T10:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
      }

      mockPrisma.stock.findUnique.mockResolvedValue(mockStock as any)

      // First call
      await getStockPrice('005930')

      // Second call (should use cache)
      await getStockPrice('005930')

      // Database should only be queried once due to caching
      expect(mockPrisma.stock.findUnique).toHaveBeenCalledTimes(1)
    })

    it('should throw error for invalid stock code', async () => {
      // Mock stock not found in database
      mockPrisma.stock.findUnique.mockResolvedValue(null)

      // Mock KIS API also fails
      mockKISClient.callApi.mockRejectedValue(new Error('Stock not available'))

      await expect(getStockPrice('INVALID')).rejects.toThrow('Stock not available')
    })

    it('should handle database error', async () => {
      mockPrisma.stock.findUnique.mockRejectedValue(new Error('Database error'))

      await expect(getStockPrice('005930')).rejects.toThrow('Database error')
    })
  })

  describe('searchStocks', () => {
    it('should search stocks by name', async () => {
      // Mock database search results
      const mockStocks = [
        {
          stockCode: '005930',
          stockName: '삼성전자',
          market: 'KOSPI',
          currentPrice: 70000,
          openPrice: 69500,
          highPrice: 70500,
          lowPrice: 69000,
          volume: BigInt(12345678),
          priceUpdatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          stockCode: '005935',
          stockName: '삼성전자우',
          market: 'KOSPI',
          currentPrice: 60000,
          openPrice: 59500,
          highPrice: 60500,
          lowPrice: 59000,
          volume: BigInt(1234567),
          priceUpdatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.stock.findMany.mockResolvedValue(mockStocks as any)

      const results: StockSearchResult[] = await searchStocks('삼성')

      // Verify Prisma query
      expect(mockPrisma.stock.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ stockName: { contains: '삼성' } }, { stockCode: { contains: '삼성' } }],
        },
        take: 20,
        orderBy: {
          stockName: 'asc',
        },
      })

      // Verify results
      expect(results).toHaveLength(2)
      expect(results[0]).toMatchObject({
        stockCode: '005930',
        stockName: '삼성전자',
        market: 'KOSPI',
      })
      expect(results[1]).toMatchObject({
        stockCode: '005935',
        stockName: '삼성전자우',
        market: 'KOSPI',
      })
    })

    it('should return empty array if no results found', async () => {
      mockPrisma.stock.findMany.mockResolvedValue([])

      // Mock KIS API also returns empty array
      mockKISClient.callApi.mockResolvedValue([])

      const results = await searchStocks('NONEXISTENT')

      expect(results).toEqual([])
    })

    it('should throw error for empty search query', async () => {
      await expect(searchStocks('')).rejects.toThrow('Search query cannot be empty')
    })

    it('should cache search results for 5 minutes', async () => {
      const mockStocks = [
        {
          stockCode: '005930',
          stockName: '삼성전자',
          market: 'KOSPI',
          currentPrice: 70000,
          openPrice: 69500,
          highPrice: 70500,
          lowPrice: 69000,
          volume: BigInt(12345678),
          priceUpdatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockPrisma.stock.findMany.mockResolvedValue(mockStocks as any)

      // First call
      await searchStocks('삼성')

      // Second call (should use cache)
      await searchStocks('삼성')

      // Database should only be queried once
      expect(mockPrisma.stock.findMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('getStockInfo', () => {
    it('should return stock info (alias for getStockPrice)', async () => {
      const mockStock = {
        stockCode: '005930',
        stockName: '삼성전자',
        market: 'KOSPI',
        currentPrice: 70000,
        openPrice: 69500,
        highPrice: 70500,
        lowPrice: 69000,
        volume: BigInt(12345678),
        priceUpdatedAt: new Date('2024-01-15T10:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
      }

      mockPrisma.stock.findUnique.mockResolvedValue(mockStock as any)

      const result = await getStockInfo('005930')

      expect(result.stockCode).toBe('005930')
      expect(result.stockName).toBe('삼성전자')
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.stock.findUnique.mockRejectedValue(new Error('Database connection error'))

      await expect(getStockPrice('005930')).rejects.toThrow('Database connection error')
    })

    it('should handle stock with missing price data', async () => {
      // Mock stock with currentPrice = 0 (not yet updated)
      const mockStock = {
        stockCode: '005930',
        stockName: '삼성전자',
        market: 'KOSPI',
        currentPrice: 0,
        openPrice: 0,
        highPrice: 0,
        lowPrice: 0,
        volume: BigInt(0),
        priceUpdatedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockPrisma.stock.findUnique.mockResolvedValue(mockStock as any)

      // Mock KIS API also fails to provide price data
      mockKISClient.callApi.mockRejectedValue(new Error('Price data not available'))

      await expect(getStockPrice('005930')).rejects.toThrow('Price data not available')
    })
  })
})
