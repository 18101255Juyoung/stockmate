import { getStockPrice, searchStocks, getStockInfo } from '@/lib/services/stockService'
import { getKISApiClient } from '@/lib/utils/kisApi'
import { StockPrice, StockSearchResult } from '@/lib/types/stock'
import cache from '@/lib/utils/cache'

// Mock KIS API client
jest.mock('@/lib/utils/kisApi')

describe('StockService', () => {
  let mockKISClient: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Clear cache before each test
    cache.clear()

    // Create mock KIS client
    mockKISClient = {
      callApi: jest.fn(),
      getTrId: jest.fn(),
    }

    ;(getKISApiClient as jest.Mock).mockReturnValue(mockKISClient)
  })

  afterAll(() => {
    // Clean up to prevent Jest from hanging
    cache.clear()
  })

  describe('getStockPrice', () => {
    it('should fetch and return current stock price', async () => {
      // Mock KIS API response for Samsung Electronics (005930)
      const mockKISResponse = {
        stck_prpr: '70000', // 현재가
        prdy_vrss: '1000', // 전일 대비
        prdy_vrss_sign: '2', // 상승
        prdy_ctrt: '1.45', // 전일 대비율
        stck_oprc: '69500', // 시가
        stck_hgpr: '70500', // 고가
        stck_lwpr: '69000', // 저가
        acml_vol: '12345678', // 거래량
        hts_kor_isnm: '삼성전자', // 종목명
      }

      mockKISClient.getTrId.mockReturnValue('FHKST01010100')
      mockKISClient.callApi.mockResolvedValue(mockKISResponse)

      const result: StockPrice = await getStockPrice('005930')

      // Verify KIS API was called with correct params
      expect(mockKISClient.getTrId).toHaveBeenCalledWith('STOCK_PRICE')
      expect(mockKISClient.callApi).toHaveBeenCalledWith(
        expect.stringContaining('/quotations/inquire-price'),
        expect.objectContaining({
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: '005930',
        }),
        'FHKST01010100'
      )

      // Verify response format
      expect(result).toMatchObject({
        stockCode: '005930',
        stockName: '삼성전자',
        currentPrice: 70000,
        changePrice: 1000,
        changeRate: 1.45,
        openPrice: 69500,
        highPrice: 70500,
        lowPrice: 69000,
        volume: 12345678,
      })
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should cache stock price for 5 minutes', async () => {
      const mockKISResponse = {
        stck_prpr: '70000',
        prdy_vrss: '1000',
        prdy_vrss_sign: '2',
        prdy_ctrt: '1.45',
        stck_oprc: '69500',
        stck_hgpr: '70500',
        stck_lwpr: '69000',
        acml_vol: '12345678',
        hts_kor_isnm: '삼성전자',
      }

      mockKISClient.getTrId.mockReturnValue('FHKST01010100')
      mockKISClient.callApi.mockResolvedValue(mockKISResponse)

      // First call
      await getStockPrice('005930')

      // Second call (should use cache)
      await getStockPrice('005930')

      // API should only be called once due to caching
      expect(mockKISClient.callApi).toHaveBeenCalledTimes(1)
    })

    it('should throw error for invalid stock code', async () => {
      mockKISClient.getTrId.mockReturnValue('FHKST01010100')
      mockKISClient.callApi.mockRejectedValue(new Error('KIS API error: [ERROR] Invalid stock code'))

      await expect(getStockPrice('INVALID')).rejects.toThrow('Invalid stock code')
    })

    it('should handle KIS API error', async () => {
      mockKISClient.getTrId.mockReturnValue('FHKST01010100')
      mockKISClient.callApi.mockRejectedValue(new Error('KIS API error'))

      await expect(getStockPrice('005930')).rejects.toThrow()
    })
  })

  describe('searchStocks', () => {
    // Note: searchStocks is now DB-based, not KIS API-based
    // These tests need to be rewritten to use Prisma mocks
    it.skip('should search stocks by name', async () => {
      // Mock KIS API response for "삼성" search
      const mockKISResponse = [
        {
          pdno: '005930',
          prdt_name: '삼성전자',
          prdt_type_cd: '300',
          mket_id_cd: 'J', // KOSPI
        },
        {
          pdno: '005935',
          prdt_name: '삼성전자우',
          prdt_type_cd: '300',
          mket_id_cd: 'J',
        },
      ]

      mockKISClient.getTrId.mockReturnValue('CTPF1002R')
      mockKISClient.callApi.mockResolvedValue(mockKISResponse)

      const results: StockSearchResult[] = await searchStocks('삼성')

      // Verify API call
      expect(mockKISClient.getTrId).toHaveBeenCalledWith('STOCK_SEARCH')
      expect(mockKISClient.callApi).toHaveBeenCalledWith(
        expect.stringContaining('/search-stock-info'),
        expect.objectContaining({
          PRDT_TYPE_CD: '300',
          PDNO: '삼성',
        }),
        'CTPF1002R'
      )

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
      mockKISClient.getTrId.mockReturnValue('CTPF1002R')
      mockKISClient.callApi.mockResolvedValue([])

      const results = await searchStocks('NONEXISTENT')

      expect(results).toEqual([])
    })

    it('should throw error for empty search query', async () => {
      await expect(searchStocks('')).rejects.toThrow('Search query cannot be empty')
    })

    it.skip('should cache search results for 5 minutes', async () => {
      const mockKISResponse = [
        {
          pdno: '005930',
          prdt_name: '삼성전자',
          prdt_type_cd: '300',
          mket_id_cd: 'J',
        },
      ]

      mockKISClient.getTrId.mockReturnValue('CTPF1002R')
      mockKISClient.callApi.mockResolvedValue(mockKISResponse)

      // First call
      await searchStocks('삼성')

      // Second call (should use cache)
      await searchStocks('삼성')

      // API should only be called once
      expect(mockKISClient.callApi).toHaveBeenCalledTimes(1)
    })
  })

  describe('getStockInfo', () => {
    it('should return stock info (alias for getStockPrice)', async () => {
      const mockKISResponse = {
        stck_prpr: '70000',
        prdy_vrss: '1000',
        prdy_vrss_sign: '2',
        prdy_ctrt: '1.45',
        stck_oprc: '69500',
        stck_hgpr: '70500',
        stck_lwpr: '69000',
        acml_vol: '12345678',
        hts_kor_isnm: '삼성전자',
      }

      mockKISClient.getTrId.mockReturnValue('FHKST01010100')
      mockKISClient.callApi.mockResolvedValue(mockKISResponse)

      const result = await getStockInfo('005930')

      expect(result.stockCode).toBe('005930')
      expect(result.stockName).toBe('삼성전자')
    })
  })

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockKISClient.getTrId.mockReturnValue('FHKST01010100')
      mockKISClient.callApi.mockRejectedValue(new Error('Network error'))

      await expect(getStockPrice('005930')).rejects.toThrow('Network error')
    })

    it('should handle malformed KIS API response', async () => {
      mockKISClient.getTrId.mockReturnValue('FHKST01010100')
      mockKISClient.callApi.mockResolvedValue({
        // Missing required fields
        stck_prpr: '70000',
      })

      // Should still work but with some fields undefined/0
      const result = await getStockPrice('005930')
      expect(result.currentPrice).toBe(70000)
    })
  })
})
