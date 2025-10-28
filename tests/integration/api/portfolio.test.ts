/**
 * Integration tests for /api/portfolio
 * Tests portfolio retrieval with NextAuth session authentication
 */

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/portfolio/route'
import * as portfolioService from '@/lib/services/portfolioService'
import { getServerSession } from 'next-auth'
import { ErrorCodes } from '@/lib/types/api'

// Mock NextAuth
jest.mock('next-auth')

// Mock the portfolio service
jest.mock('@/lib/services/portfolioService')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockGetPortfolioSummary = portfolioService.getPortfolioSummary as jest.MockedFunction<
  typeof portfolioService.getPortfolioSummary
>

describe('GET /api/portfolio', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return portfolio for authenticated user', async () => {
    // Mock session
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: '2024-12-31',
    } as any)

    // Mock portfolio data
    const mockPortfolio = {
      id: 'portfolio-1',
      userId: 'user-123',
      initialCapital: 10000000,
      currentCash: 8500000,
      totalAssets: 10500000,
      totalReturn: 5.0,
      realizedPL: 200000,
      unrealizedPL: 300000,
      holdings: [
        {
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 70000,
          currentPrice: 75000,
          totalValue: 750000,
          profitLoss: 50000,
          profitLossRate: 7.14,
        },
      ],
    }

    mockGetPortfolioSummary.mockResolvedValue({
      success: true,
      data: mockPortfolio,
    })

    const request = new NextRequest('http://localhost:3000/api/portfolio')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toMatchObject({
      userId: 'user-123',
      currentCash: 8500000,
      totalAssets: 10500000,
    })

    // Verify service was called with user ID from session
    expect(mockGetPortfolioSummary).toHaveBeenCalledWith('user-123')
  })

  it('should return 401 when user is not authenticated', async () => {
    // Mock no session
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/portfolio')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED)
    expect(data.error.message).toContain('logged in')

    // Verify service was never called
    expect(mockGetPortfolioSummary).not.toHaveBeenCalled()
  })

  it('should return 401 when session has no user ID', async () => {
    // Mock session without user ID
    mockGetServerSession.mockResolvedValue({
      user: {
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: '2024-12-31',
    } as any)

    const request = new NextRequest('http://localhost:3000/api/portfolio')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED)

    expect(mockGetPortfolioSummary).not.toHaveBeenCalled()
  })

  it('should return 404 when portfolio not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: '2024-12-31',
    } as any)

    mockGetPortfolioSummary.mockResolvedValue({
      success: false,
      error: {
        code: ErrorCodes.NOT_FOUND,
        message: 'Portfolio not found',
      },
    })

    const request = new NextRequest('http://localhost:3000/api/portfolio')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe(ErrorCodes.NOT_FOUND)
  })

  it('should return 500 on internal error', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: '2024-12-31',
    } as any)

    mockGetPortfolioSummary.mockResolvedValue({
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Database error',
      },
    })

    const request = new NextRequest('http://localhost:3000/api/portfolio')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe(ErrorCodes.INTERNAL_ERROR)
  })

  it('should handle unexpected errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: '2024-12-31',
    } as any)

    // Mock service throwing an error
    mockGetPortfolioSummary.mockRejectedValue(new Error('Unexpected error'))

    const request = new NextRequest('http://localhost:3000/api/portfolio')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe(ErrorCodes.INTERNAL_ERROR)
  })
})
