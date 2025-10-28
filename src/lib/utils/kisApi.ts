/**
 * KIS (Korea Investment & Securities) API Client
 * Handles authentication, token management, and API calls to KIS Open API
 */

import {
  KISTokenResponse,
  KISApiResponse,
  KISApiHeaders,
  KISApiConfig,
  KIS_ENDPOINTS,
  KIS_TR_IDS,
} from '@/lib/types/stock'

export class KISApiClient {
  private config: KISApiConfig
  private token: string | null = null
  private tokenExpiry: Date | null = null
  private lastRequestTime: number = 0
  private readonly RATE_LIMIT_MS = 1000 // 1 request per second

  constructor() {
    const baseUrl = process.env.KIS_API_URL
    const appKey = process.env.KIS_APP_KEY
    const appSecret = process.env.KIS_APP_SECRET

    if (!baseUrl || !appKey || !appSecret) {
      throw new Error(
        'KIS API credentials missing. Please set KIS_API_URL, KIS_APP_KEY, and KIS_APP_SECRET in .env'
      )
    }

    // Determine API type based on URL
    const apiType = baseUrl.includes('openapivts') ? 'virtual' : 'real'

    this.config = {
      baseUrl,
      appKey,
      appSecret,
      apiType,
    }
  }

  /**
   * Get access token (with caching)
   * Token is valid for 24 hours
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token
    }

    // Fetch new token
    const url = `${this.config.baseUrl}${KIS_ENDPOINTS.TOKEN}`

    const body = {
      grant_type: 'client_credentials',
      appkey: this.config.appKey,
      appsecret: this.config.appSecret,
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`KIS API token request failed: ${response.status} ${response.statusText}`)
      }

      const data: KISTokenResponse = await response.json()

      if (!data.access_token) {
        throw new Error('KIS API token response missing access_token')
      }

      // Cache token
      this.token = data.access_token
      // Token expires in 24 hours, but we'll refresh 1 hour early to be safe
      const expiresInMs = (data.expires_in - 3600) * 1000
      this.tokenExpiry = new Date(Date.now() + expiresInMs)

      return this.token
    } catch (error) {
      console.error('Failed to get KIS API token:', error)
      throw new Error(`Failed to authenticate with KIS API: ${error}`)
    }
  }

  /**
   * Call KIS API with proper headers and error handling
   */
  async callApi<T = any>(
    endpoint: string,
    params: Record<string, string> = {},
    trId?: string
  ): Promise<T> {
    // Rate limiting: wait if needed
    await this.checkRateLimit()

    // Get access token
    const token = await this.getAccessToken()

    // Build URL with query params
    const url = new URL(`${this.config.baseUrl}${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    // Build headers
    const headers: KISApiHeaders = {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      appkey: this.config.appKey,
      appsecret: this.config.appSecret,
      custtype: 'P', // 개인
    }

    if (trId) {
      headers.tr_id = trId
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: headers as any,
      })

      if (!response.ok) {
        throw new Error(`KIS API request failed: ${response.status} ${response.statusText}`)
      }

      const data: KISApiResponse<T> = await response.json()

      // Check KIS API error code
      if (data.rt_cd !== '0') {
        throw new Error(`KIS API error: [${data.msg_cd}] ${data.msg1}`)
      }

      return data.output as T
    } catch (error) {
      console.error('KIS API call failed:', error)
      throw error
    }
  }

  /**
   * Check rate limit and wait if necessary
   * KIS API allows 1 request per second
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      const waitTime = this.RATE_LIMIT_MS - timeSinceLastRequest
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }

    this.lastRequestTime = Date.now()
  }

  /**
   * Get TR_ID based on operation type
   * - COMMON operations: 조회 API (실전/모의 구분 없음)
   * - VIRTUAL/REAL operations: 주문 API (실전/모의 구분)
   */
  getTrId(
    operation: keyof typeof KIS_TR_IDS.COMMON | keyof typeof KIS_TR_IDS.VIRTUAL | keyof typeof KIS_TR_IDS.REAL
  ): string {
    // COMMON 조회 API인 경우 (실전/모의 구분 없음)
    if (operation in KIS_TR_IDS.COMMON) {
      return KIS_TR_IDS.COMMON[operation as keyof typeof KIS_TR_IDS.COMMON]
    }

    // 주문 API인 경우 (실전/모의 구분)
    return this.config.apiType === 'real'
      ? KIS_TR_IDS.REAL[operation as keyof typeof KIS_TR_IDS.REAL]
      : KIS_TR_IDS.VIRTUAL[operation as keyof typeof KIS_TR_IDS.VIRTUAL]
  }

  /**
   * Get API type
   */
  getApiType(): 'real' | 'virtual' {
    return this.config.apiType
  }
}

// Export singleton instance
let kisApiClientInstance: KISApiClient | null = null

export function getKISApiClient(): KISApiClient {
  if (!kisApiClientInstance) {
    kisApiClientInstance = new KISApiClient()
  }
  return kisApiClientInstance
}
