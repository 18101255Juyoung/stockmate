/**
 * Integration tests for Stock API endpoints
 * Tests the full request-response cycle
 */

import { GET as getStockPrice } from '@/app/api/stocks/[code]/route'
import { GET as searchStocks } from '@/app/api/stocks/search/route'
import { NextRequest } from 'next/server'
import * as stockService from '@/lib/services/stockService'
import { verifyTestDatabase } from '../../helpers/database'

// Mock stock service
jest.mock('@/lib/services/stockService')

describe('Stock API Integration Tests', () => {
  // ⚠️ SAFETY CHECK: Verify we're using test database
  beforeAll(verifyTestDatabase)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/stocks/[code]', () => {
    it('should return stock price data for valid code', async () => {
      // Mock stock service response
      const mockStockPrice = {
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 70000,
        changePrice: 1000,
        changeRate: 1.45,
        openPrice: 69500,
        highPrice: 70500,
        lowPrice: 69000,
        volume: 12345678,
        updatedAt: new Date('2025-10-23T10:00:00Z'),
      }

      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue(mockStockPrice)

      // Create mock request
      const request = new NextRequest('http://localhost:3000/api/stocks/005930')
      const params = { params: { code: '005930' } }

      // Call API route
      const response = await getStockPrice(request, params)
      const data = await response.json()

      // Verify response
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 70000,
        changePrice: 1000,
        changeRate: 1.45,
      })

      // Verify service was called
      expect(stockService.getStockPrice).toHaveBeenCalledWith('005930')
    })

    it('should return 404 for invalid stock code', async () => {
      // Mock service to throw error
      ;(stockService.getStockPrice as jest.Mock).mockRejectedValue(
        new Error('Invalid stock code: INVALID')
      )

      const request = new NextRequest('http://localhost:3000/api/stocks/INVALID')
      const params = { params: { code: 'INVALID' } }

      const response = await getStockPrice(request, params)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('STOCK_NOT_FOUND')
      expect(data.error.message).toContain('Stock not found')
    })

    it('should return 400 for missing stock code', async () => {
      const request = new NextRequest('http://localhost:3000/api/stocks/')
      const params = { params: { code: '' } }

      const response = await getStockPrice(request, params)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_INVALID_INPUT')
    })

    it('should handle KIS API errors gracefully', async () => {
      ;(stockService.getStockPrice as jest.Mock).mockRejectedValue(
        new Error('KIS API error: Connection timeout')
      )

      const request = new NextRequest('http://localhost:3000/api/stocks/005930')
      const params = { params: { code: '005930' } }

      const response = await getStockPrice(request, params)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('EXTERNAL_KIS_API_ERROR')
    })

    it('should include updatedAt timestamp', async () => {
      const mockStockPrice = {
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 70000,
        changePrice: 1000,
        changeRate: 1.45,
        openPrice: 69500,
        highPrice: 70500,
        lowPrice: 69000,
        volume: 12345678,
        updatedAt: new Date(),
      }

      ;(stockService.getStockPrice as jest.Mock).mockResolvedValue(mockStockPrice)

      const request = new NextRequest('http://localhost:3000/api/stocks/005930')
      const params = { params: { code: '005930' } }

      const response = await getStockPrice(request, params)
      const data = await response.json()

      expect(data.data.updatedAt).toBeDefined()
      expect(typeof data.data.updatedAt).toBe('string')
    })
  })

  describe('GET /api/stocks/search', () => {
    it('should search stocks by name', async () => {
      // Mock search results
      const mockResults = [
        {
          stockCode: '005930',
          stockName: '삼성전자',
          market: 'KOSPI',
        },
        {
          stockCode: '005935',
          stockName: '삼성전자우',
          market: 'KOSPI',
        },
      ]

      ;(stockService.searchStocks as jest.Mock).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/stocks/search?q=삼성')

      const response = await searchStocks(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.data[0]).toMatchObject({
        stockCode: '005930',
        stockName: '삼성전자',
        market: 'KOSPI',
      })

      // Verify service was called with query
      expect(stockService.searchStocks).toHaveBeenCalledWith('삼성')
    })

    it('should return empty array for no results', async () => {
      ;(stockService.searchStocks as jest.Mock).mockResolvedValue([])

      const request = new NextRequest(
        'http://localhost:3000/api/stocks/search?q=NONEXISTENT'
      )

      const response = await searchStocks(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it('should return 400 for missing query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/stocks/search')

      const response = await searchStocks(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_MISSING_FIELDS')
      expect(data.error.message).toContain('Search query is required')
    })

    it('should return 400 for empty query parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/stocks/search?q=')

      const response = await searchStocks(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_MISSING_FIELDS')
    })

    it('should handle search service errors', async () => {
      ;(stockService.searchStocks as jest.Mock).mockRejectedValue(
        new Error('KIS API search error')
      )

      const request = new NextRequest('http://localhost:3000/api/stocks/search?q=test')

      const response = await searchStocks(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('EXTERNAL_KIS_API_ERROR')
    })

    it('should trim whitespace from query', async () => {
      const mockResults = [
        {
          stockCode: '005930',
          stockName: '삼성전자',
          market: 'KOSPI',
        },
      ]

      ;(stockService.searchStocks as jest.Mock).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/stocks/search?q=  삼성  ')

      const response = await searchStocks(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should call service with trimmed query
      expect(stockService.searchStocks).toHaveBeenCalledWith('삼성')
    })

    it('should support both Korean and English queries', async () => {
      const mockResults = [
        {
          stockCode: '005930',
          stockName: 'Samsung Electronics',
          market: 'KOSPI',
        },
      ]

      ;(stockService.searchStocks as jest.Mock).mockResolvedValue(mockResults)

      const request = new NextRequest('http://localhost:3000/api/stocks/search?q=Samsung')

      const response = await searchStocks(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Error Code Consistency', () => {
    it('should use consistent error codes across endpoints', async () => {
      // Test that both endpoints use the same error code format
      ;(stockService.getStockPrice as jest.Mock).mockRejectedValue(
        new Error('KIS API error')
      )

      const request1 = new NextRequest('http://localhost:3000/api/stocks/005930')
      const params1 = { params: { code: '005930' } }
      const response1 = await getStockPrice(request1, params1)
      const data1 = await response1.json()

      ;(stockService.searchStocks as jest.Mock).mockRejectedValue(new Error('KIS API error'))

      const request2 = new NextRequest('http://localhost:3000/api/stocks/search?q=test')
      const response2 = await searchStocks(request2)
      const data2 = await response2.json()

      // Both should use the same error code
      expect(data1.error.code).toBe('EXTERNAL_KIS_API_ERROR')
      expect(data2.error.code).toBe('EXTERNAL_KIS_API_ERROR')
    })
  })
})
