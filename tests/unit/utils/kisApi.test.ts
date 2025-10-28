import { KISApiClient } from '@/lib/utils/kisApi'

// Mock fetch globally
global.fetch = jest.fn()

describe('KISApiClient', () => {
  let client: KISApiClient

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
    client = new KISApiClient()
  })

  describe('constructor', () => {
    it('should throw error if KIS API credentials are missing', () => {
      // Save original env vars
      const originalAppKey = process.env.KIS_APP_KEY
      const originalAppSecret = process.env.KIS_APP_SECRET
      const originalApiUrl = process.env.KIS_API_URL

      // Remove credentials
      delete process.env.KIS_APP_KEY
      delete process.env.KIS_APP_SECRET
      delete process.env.KIS_API_URL

      expect(() => new KISApiClient()).toThrow('KIS API credentials missing')

      // Restore env vars
      process.env.KIS_APP_KEY = originalAppKey
      process.env.KIS_APP_SECRET = originalAppSecret
      process.env.KIS_API_URL = originalApiUrl
    })

    it('should detect virtual API from URL', () => {
      const apiType = client.getApiType()
      // .env has openapivts (virtual trading)
      expect(apiType).toBe('virtual')
    })
  })

  describe('getAccessToken', () => {
    it('should fetch and return access token', async () => {
      // Mock successful token response
      const mockToken = 'mock_access_token_12345'
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: 86400, // 24 hours
        }),
      })

      const token = await client.getAccessToken()

      expect(token).toBe(mockToken)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should cache token and not refetch if still valid', async () => {
      // Mock successful token response
      const mockToken = 'cached_token'
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      })

      const token1 = await client.getAccessToken()
      const token2 = await client.getAccessToken()

      expect(token1).toBe(token2)
      // Fetch should only be called once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should throw error if token request fails', async () => {
      // Mock failed request
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      await expect(client.getAccessToken()).rejects.toThrow('Failed to authenticate with KIS API')
    })

    it('should throw error if response missing access_token', async () => {
      // Mock response without token
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing access_token
          token_type: 'Bearer',
        }),
      })

      await expect(client.getAccessToken()).rejects.toThrow('missing access_token')
    })
  })

  describe('callApi', () => {
    beforeEach(async () => {
      // Mock token fetch for all callApi tests
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test_token',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      })

      // Get token first
      await client.getAccessToken()
      jest.clearAllMocks()
    })

    it('should call KIS API with proper headers', async () => {
      // Mock successful API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rt_cd: '0',
          msg_cd: 'SUCCESS',
          msg1: 'Success',
          output: { test: 'data' },
        }),
      })

      await client.callApi('/test/endpoint', { param1: 'value1' }, 'TEST_TR_ID')

      expect(global.fetch).toHaveBeenCalledTimes(1)
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0]

      // Check URL includes endpoint and query params
      expect(url).toContain('/test/endpoint')
      expect(url).toContain('param1=value1')

      // Check headers
      expect(options.headers).toMatchObject({
        'content-type': 'application/json',
        authorization: 'Bearer test_token',
        appkey: process.env.KIS_APP_KEY,
        appsecret: process.env.KIS_APP_SECRET,
        tr_id: 'TEST_TR_ID',
        custtype: 'P',
      })
    })

    it('should throw error if API returns rt_cd !== "0"', async () => {
      // Mock KIS API error response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rt_cd: '1',
          msg_cd: 'ERROR',
          msg1: 'Invalid parameter',
        }),
      })

      await expect(client.callApi('/test/endpoint')).rejects.toThrow('KIS API error')
    })

    it('should return output data on success', async () => {
      const mockData = { price: 50000, stockName: 'Samsung' }
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          rt_cd: '0',
          msg_cd: 'SUCCESS',
          msg1: 'Success',
          output: mockData,
        }),
      })

      const result = await client.callApi('/test/endpoint')

      expect(result).toEqual(mockData)
    })
  })

  describe('rate limiting', () => {
    it('should respect rate limit of 1 request per second', async () => {
      // Mock token
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'test_token',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      })

      await client.getAccessToken()
      jest.clearAllMocks()

      // Mock API responses
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          rt_cd: '0',
          msg_cd: 'SUCCESS',
          msg1: 'Success',
          output: {},
        }),
      })

      const startTime = Date.now()

      // Make 3 rapid API calls
      await client.callApi('/test/endpoint1')
      await client.callApi('/test/endpoint2')
      await client.callApi('/test/endpoint3')

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should take at least 2 seconds (1 sec between each of 3 calls)
      expect(duration).toBeGreaterThanOrEqual(2000)
    }, 10000)
  })

  describe('getTrId', () => {
    it('should return COMMON TR_ID for query operations (regardless of API type)', () => {
      // COMMON operations like STOCK_PRICE are same for both real and virtual
      const trId = client.getTrId('STOCK_PRICE')
      expect(trId).toBe('FHKST01010100') // COMMON stock price inquiry TR_ID
    })

    it('should return virtual TR_ID for virtual order operations', () => {
      // For order operations, it should use VIRTUAL TR_IDs
      const trId = client.getTrId('BUY_ORDER')
      expect(trId).toBe('VTTC0802U') // Virtual buy order TR_ID
    })

    it('should return real TR_ID for real order operations when using real API', () => {
      // Save and modify env to use real API
      const originalUrl = process.env.KIS_API_URL
      process.env.KIS_API_URL = 'https://openapi.koreainvestment.com:9443'

      // Create new client with real API
      const realClient = new KISApiClient()

      // COMMON operations should still return same TR_ID
      expect(realClient.getTrId('STOCK_PRICE')).toBe('FHKST01010100')

      // Order operations should use REAL TR_IDs
      expect(realClient.getTrId('BUY_ORDER')).toBe('TTTC0802U')

      // Restore
      process.env.KIS_API_URL = originalUrl
    })
  })
})
