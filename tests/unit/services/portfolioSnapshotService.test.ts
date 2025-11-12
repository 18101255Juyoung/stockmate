import {
  createDailySnapshot,
  getSnapshotByDate,
  calculatePeriodReturn,
} from '@/lib/services/portfolioSnapshotService'
import { prisma } from '@/lib/prisma'
import { RankingPeriod } from '@prisma/client'

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    portfolio: {
      findUnique: jest.fn(),
    },
    portfolioSnapshot: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('PortfolioSnapshotService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createDailySnapshot', () => {
    it('should create a daily snapshot with correct portfolio data', async () => {
      const portfolioId = 'portfolio-123'
      const mockDate = new Date('2024-01-15')

      // Mock portfolio data
      const mockPortfolio = {
        id: portfolioId,
        userId: 'user-123',
        initialCapital: 10000000,
        currentCash: 5000000,
        totalAssets: 12000000,
        totalReturn: 20.0,
        realizedPL: 1000000,
        unrealizedPL: 1000000,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      }

      const mockSnapshot = {
        id: 'snapshot-123',
        portfolioId,
        date: mockDate,
        totalAssets: 12000000,
        totalReturn: 20.0,
        currentCash: 5000000,
        createdAt: new Date(),
      }

      mockPrisma.portfolio.findUnique.mockResolvedValue(mockPortfolio as any)
      mockPrisma.portfolioSnapshot.upsert.mockResolvedValue(mockSnapshot as any)

      const result = await createDailySnapshot(portfolioId, mockDate)

      // Verify portfolio was queried
      expect(mockPrisma.portfolio.findUnique).toHaveBeenCalledWith({
        where: { id: portfolioId },
      })

      // Verify snapshot was upserted (handles duplicates)
      expect(mockPrisma.portfolioSnapshot.upsert).toHaveBeenCalledWith({
        where: {
          portfolioId_date: {
            portfolioId,
            date: mockDate,
          },
        },
        update: {
          totalAssets: 12000000,
          totalReturn: 20.0,
          currentCash: 5000000,
        },
        create: {
          portfolioId,
          date: mockDate,
          totalAssets: 12000000,
          totalReturn: 20.0,
          currentCash: 5000000,
        },
      })

      // Verify result
      expect(result).toMatchObject({
        id: 'snapshot-123',
        portfolioId,
        totalAssets: 12000000,
        totalReturn: 20.0,
        currentCash: 5000000,
      })
      expect(result.date).toBeInstanceOf(Date)
    })

    it('should use current date if no date provided', async () => {
      const portfolioId = 'portfolio-123'

      const mockPortfolio = {
        id: portfolioId,
        userId: 'user-123',
        initialCapital: 10000000,
        currentCash: 8000000,
        totalAssets: 10500000,
        totalReturn: 5.0,
        realizedPL: 0,
        unrealizedPL: 500000,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      }

      const mockSnapshot = {
        id: 'snapshot-456',
        portfolioId,
        date: new Date(),
        totalAssets: 10500000,
        totalReturn: 5.0,
        currentCash: 8000000,
        createdAt: new Date(),
      }

      mockPrisma.portfolio.findUnique.mockResolvedValue(mockPortfolio as any)
      mockPrisma.portfolioSnapshot.upsert.mockResolvedValue(mockSnapshot as any)

      await createDailySnapshot(portfolioId)

      // Verify upsert was called (date will be "today")
      expect(mockPrisma.portfolioSnapshot.upsert).toHaveBeenCalled()
    })

    it('should throw error if portfolio not found', async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(null)

      await expect(createDailySnapshot('invalid-portfolio')).rejects.toThrow(
        'Portfolio not found'
      )
    })

    it('should handle database errors', async () => {
      mockPrisma.portfolio.findUnique.mockRejectedValue(new Error('Database error'))

      await expect(createDailySnapshot('portfolio-123')).rejects.toThrow('Database error')
    })

    it('should update existing snapshot if duplicate (upsert behavior)', async () => {
      const portfolioId = 'portfolio-123'
      const mockDate = new Date('2024-01-15')

      const mockPortfolio = {
        id: portfolioId,
        userId: 'user-123',
        initialCapital: 10000000,
        currentCash: 6000000,
        totalAssets: 13000000,
        totalReturn: 30.0,
        realizedPL: 1500000,
        unrealizedPL: 1500000,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      }

      const mockSnapshot = {
        id: 'snapshot-existing',
        portfolioId,
        date: mockDate,
        totalAssets: 13000000, // Updated value
        totalReturn: 30.0, // Updated value
        currentCash: 6000000, // Updated value
        createdAt: new Date('2024-01-15T00:00:00Z'),
      }

      mockPrisma.portfolio.findUnique.mockResolvedValue(mockPortfolio as any)
      mockPrisma.portfolioSnapshot.upsert.mockResolvedValue(mockSnapshot as any)

      const result = await createDailySnapshot(portfolioId, mockDate)

      // Verify upsert handles duplicates
      expect(mockPrisma.portfolioSnapshot.upsert).toHaveBeenCalled()
      expect(result.totalAssets).toBe(13000000)
    })
  })

  describe('getSnapshotByDate', () => {
    it('should retrieve snapshot by portfolio ID and date', async () => {
      const portfolioId = 'portfolio-123'
      const mockDate = new Date('2024-01-10')

      const mockSnapshot = {
        id: 'snapshot-123',
        portfolioId,
        date: mockDate,
        totalAssets: 11000000,
        totalReturn: 10.0,
        currentCash: 7000000,
        createdAt: new Date(),
      }

      mockPrisma.portfolioSnapshot.findUnique.mockResolvedValue(mockSnapshot as any)

      const result = await getSnapshotByDate(portfolioId, mockDate)

      expect(mockPrisma.portfolioSnapshot.findUnique).toHaveBeenCalledWith({
        where: {
          portfolioId_date: {
            portfolioId,
            date: mockDate,
          },
        },
      })

      expect(result).toMatchObject({
        portfolioId,
        totalAssets: 11000000,
        totalReturn: 10.0,
      })
    })

    it('should return null if snapshot does not exist', async () => {
      mockPrisma.portfolioSnapshot.findUnique.mockResolvedValue(null)

      const result = await getSnapshotByDate('portfolio-123', new Date('2024-01-01'))

      expect(result).toBeNull()
    })

    it('should handle database errors', async () => {
      mockPrisma.portfolioSnapshot.findUnique.mockRejectedValue(
        new Error('Database connection error')
      )

      await expect(
        getSnapshotByDate('portfolio-123', new Date('2024-01-10'))
      ).rejects.toThrow('Database connection error')
    })
  })

  describe('calculatePeriodReturn', () => {
    it('should calculate WEEKLY return (7 days ago)', async () => {
      const portfolioId = 'portfolio-123'
      const today = new Date('2024-01-15')
      const weekAgo = new Date('2024-01-08')

      const mockSnapshots = [
        {
          id: 'snapshot-week-ago',
          portfolioId,
          date: weekAgo,
          totalAssets: 10000000,
          totalReturn: 0.0,
          currentCash: 10000000,
          createdAt: new Date(),
        },
        {
          id: 'snapshot-today',
          portfolioId,
          date: today,
          totalAssets: 13000000,
          totalReturn: 30.0,
          currentCash: 5000000,
          createdAt: new Date(),
        },
      ]

      mockPrisma.portfolioSnapshot.findMany.mockResolvedValue(mockSnapshots as any)

      const result = await calculatePeriodReturn(portfolioId, RankingPeriod.WEEKLY)

      // Expected: ((13M - 10M) / 10M) * 100 = 30%
      expect(result).toBeCloseTo(30.0, 2)
    })

    it('should calculate MONTHLY return (30 days ago)', async () => {
      const portfolioId = 'portfolio-123'
      const today = new Date('2024-02-15')
      const monthAgo = new Date('2024-01-16')

      const mockSnapshots = [
        {
          id: 'snapshot-month-ago',
          portfolioId,
          date: monthAgo,
          totalAssets: 10000000,
          totalReturn: 0.0,
          currentCash: 10000000,
          createdAt: new Date(),
        },
        {
          id: 'snapshot-today',
          portfolioId,
          date: today,
          totalAssets: 15000000,
          totalReturn: 50.0,
          currentCash: 5000000,
          createdAt: new Date(),
        },
      ]

      mockPrisma.portfolioSnapshot.findMany.mockResolvedValue(mockSnapshots as any)

      const result = await calculatePeriodReturn(portfolioId, RankingPeriod.MONTHLY)

      // Expected: ((15M - 10M) / 10M) * 100 = 50%
      expect(result).toBeCloseTo(50.0, 2)
    })

    it('should return current totalReturn for ALL_TIME period', async () => {
      const portfolioId = 'portfolio-123'

      const mockSnapshots = [
        {
          id: 'snapshot-latest',
          portfolioId,
          date: new Date('2024-01-15'),
          totalAssets: 18000000,
          totalReturn: 80.0,
          currentCash: 5000000,
          createdAt: new Date(),
        },
      ]

      mockPrisma.portfolioSnapshot.findMany.mockResolvedValue(mockSnapshots as any)

      const result = await calculatePeriodReturn(portfolioId, RankingPeriod.ALL_TIME)

      // ALL_TIME should return the latest totalReturn
      expect(result).toBe(80.0)
    })

    it('should return 0 if no snapshots found', async () => {
      mockPrisma.portfolioSnapshot.findMany.mockResolvedValue([])

      const result = await calculatePeriodReturn('portfolio-123', RankingPeriod.WEEKLY)

      expect(result).toBe(0)
    })

    it('should return 0 if only one snapshot exists (no historical data)', async () => {
      const portfolioId = 'portfolio-123'

      const mockSnapshots = [
        {
          id: 'snapshot-only',
          portfolioId,
          date: new Date('2024-01-15'),
          totalAssets: 10000000,
          totalReturn: 0.0,
          currentCash: 10000000,
          createdAt: new Date(),
        },
      ]

      mockPrisma.portfolioSnapshot.findMany.mockResolvedValue(mockSnapshots as any)

      const result = await calculatePeriodReturn(portfolioId, RankingPeriod.WEEKLY)

      // No historical comparison possible
      expect(result).toBe(0)
    })

    it('should handle negative returns correctly', async () => {
      const portfolioId = 'portfolio-123'
      const today = new Date('2024-01-15')
      const weekAgo = new Date('2024-01-08')

      const mockSnapshots = [
        {
          id: 'snapshot-week-ago',
          portfolioId,
          date: weekAgo,
          totalAssets: 10000000,
          totalReturn: 0.0,
          currentCash: 10000000,
          createdAt: new Date(),
        },
        {
          id: 'snapshot-today',
          portfolioId,
          date: today,
          totalAssets: 8000000, // Loss
          totalReturn: -20.0,
          currentCash: 5000000,
          createdAt: new Date(),
        },
      ]

      mockPrisma.portfolioSnapshot.findMany.mockResolvedValue(mockSnapshots as any)

      const result = await calculatePeriodReturn(portfolioId, RankingPeriod.WEEKLY)

      // Expected: ((8M - 10M) / 10M) * 100 = -20%
      expect(result).toBeCloseTo(-20.0, 2)
    })
  })

  describe('error handling', () => {
    it('should handle database errors in calculatePeriodReturn', async () => {
      mockPrisma.portfolioSnapshot.findMany.mockRejectedValue(
        new Error('Database query failed')
      )

      await expect(
        calculatePeriodReturn('portfolio-123', RankingPeriod.WEEKLY)
      ).rejects.toThrow('Database query failed')
    })
  })
})
