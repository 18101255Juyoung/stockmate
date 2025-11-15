import { NextRequest } from 'next/server'
import { GET } from '@/app/api/portfolio/history/route'
import * as portfolioHistoryService from '@/lib/services/portfolioHistoryService'
import { getServerSession } from 'next-auth'
import { ErrorCodes } from '@/lib/types/api'
import { verifyTestDatabase } from '../../helpers/database'

// ⚠️ SAFETY CHECK: Verify we're using test database
beforeAll(verifyTestDatabase)

// Mock NextAuth
jest.mock('next-auth')

// Mock the portfolio history service
jest.mock('@/lib/services/portfolioHistoryService')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockGetPortfolioHistory =
  portfolioHistoryService.getPortfolioHistory as jest.MockedFunction<
    typeof portfolioHistoryService.getPortfolioHistory
  >

describe('GET /api/portfolio/history', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return portfolio history for authenticated user', async () => {
    // Mock session
    mockGetServerSession.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: '2024-12-31',
    } as any)

    const mockHistory = [
      {
        date: new Date('2024-01-15'),
        cash: 9300000,
        totalAssets: 10020000,
        return: 0.2,
      },
    ]

    mockGetPortfolioHistory.mockResolvedValue({
      success: true,
      data: { history: mockHistory },
    })

    const request = new NextRequest('http://localhost:3000/api/portfolio/history')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.history).toHaveLength(1)
    expect(data.data.history[0]).toMatchObject({
      cash: 9300000,
      totalAssets: 10020000,
      return: 0.2,
    })

    // Verify service was called with user ID from session
    expect(mockGetPortfolioHistory).toHaveBeenCalledWith('user-123', { period: null })
  })

  it('should return portfolio history with period parameter', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: '2024-12-31',
    } as any)

    mockGetPortfolioHistory.mockResolvedValue({
      success: true,
      data: { history: [] },
    })

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio/history?period=7d'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockGetPortfolioHistory).toHaveBeenCalledWith('user-123', { period: '7d' })
  })

  it('should return 401 when user is not authenticated', async () => {
    // Mock no session
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/portfolio/history')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe(ErrorCodes.AUTH_UNAUTHORIZED)
    expect(data.error.message).toContain('logged in')

    // Verify service was never called
    expect(mockGetPortfolioHistory).not.toHaveBeenCalled()
  })

  it('should return 400 for invalid period', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: '2024-12-31',
    } as any)

    const request = new NextRequest(
      'http://localhost:3000/api/portfolio/history?period=invalid'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe(ErrorCodes.VALIDATION_INVALID_INPUT)
    expect(data.error.message).toContain('Invalid period')
  })

  it('should return 404 when user not found', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'non-existent', email: 'test@example.com' },
      expires: '2024-12-31',
    } as any)

    mockGetPortfolioHistory.mockResolvedValue({
      success: false,
      error: {
        code: ErrorCodes.NOT_FOUND,
        message: 'User not found',
      },
    })

    const request = new NextRequest('http://localhost:3000/api/portfolio/history')
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

    mockGetPortfolioHistory.mockResolvedValue({
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Database error',
      },
    })

    const request = new NextRequest('http://localhost:3000/api/portfolio/history')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe(ErrorCodes.INTERNAL_ERROR)
  })

  it('should handle all valid period values', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: '2024-12-31',
    } as any)

    const validPeriods = ['7d', '30d', '90d', '1y', 'all']

    for (const period of validPeriods) {
      mockGetPortfolioHistory.mockResolvedValue({
        success: true,
        data: { history: [] },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/portfolio/history?period=${period}`
      )
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockGetPortfolioHistory).toHaveBeenCalledWith('user-123', { period })
    }
  })
})
