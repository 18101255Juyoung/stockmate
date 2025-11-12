/**
 * Unit tests for Ranking Service
 * Tests ranking calculation and retrieval functionality
 */

import {
  updateRankings,
  getRankings,
  getUserRank,
} from '@/lib/services/rankingService'
import { prisma } from '@/lib/prisma'
import { ErrorCodes } from '@/lib/types/api'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    portfolio: {
      findMany: jest.fn(),
    },
    ranking: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}))

describe('RankingService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('updateRankings', () => {
    it('should calculate and update rankings based on totalReturn', async () => {
      // Mock portfolios already sorted by totalReturn DESC (as Prisma would return)
      const mockPortfolios = [
        {
          userId: 'user2',
          totalReturn: 25.0,
          user: { id: 'user2', username: 'trader2', displayName: 'Trader 2' },
        },
        {
          userId: 'user1',
          totalReturn: 15.5,
          user: { id: 'user1', username: 'trader1', displayName: 'Trader 1' },
        },
        {
          userId: 'user3',
          totalReturn: 10.0,
          user: { id: 'user3', username: 'trader3', displayName: 'Trader 3' },
        },
      ]

      ;(prisma.portfolio.findMany as jest.Mock).mockResolvedValue(
        mockPortfolios
      )
      ;(prisma.ranking.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.ranking.createMany as jest.Mock).mockResolvedValue({ count: 3 })

      const result = await updateRankings('ALL_TIME')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.updated).toBe(3)
      }

      // Verify rankings were deleted for the period
      expect(prisma.ranking.deleteMany).toHaveBeenCalledWith({
        where: { period: 'ALL_TIME' },
      })

      // Verify rankings were created in correct order (sorted by totalReturn DESC)
      expect(prisma.ranking.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'user2',
            rank: 1,
            totalReturn: 25.0,
            period: 'ALL_TIME',
          },
          {
            userId: 'user1',
            rank: 2,
            totalReturn: 15.5,
            period: 'ALL_TIME',
          },
          {
            userId: 'user3',
            rank: 3,
            totalReturn: 10.0,
            period: 'ALL_TIME',
          },
        ],
      })
    })

    it('should handle tie in totalReturn with stable sort', async () => {
      const mockPortfolios = [
        {
          userId: 'user1',
          totalReturn: 10.0,
          user: { id: 'user1', username: 'trader1' },
        },
        {
          userId: 'user2',
          totalReturn: 10.0,
          user: { id: 'user2', username: 'trader2' },
        },
      ]

      ;(prisma.portfolio.findMany as jest.Mock).mockResolvedValue(
        mockPortfolios
      )
      ;(prisma.ranking.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.ranking.createMany as jest.Mock).mockResolvedValue({ count: 2 })

      const result = await updateRankings('ALL_TIME')

      expect(result.success).toBe(true)

      // Both should get sequential ranks even with same totalReturn
      const rankings = (prisma.ranking.createMany as jest.Mock).mock.calls[0][0]
        .data
      expect(rankings[0].rank).toBe(1)
      expect(rankings[1].rank).toBe(2)
    })

    it('should limit rankings to top 100', async () => {
      const mockPortfolios = Array.from({ length: 150 }, (_, i) => ({
        userId: `user${i + 1}`,
        totalReturn: 100 - i,
        user: { id: `user${i + 1}`, username: `trader${i + 1}` },
      }))

      ;(prisma.portfolio.findMany as jest.Mock).mockResolvedValue(
        mockPortfolios
      )
      ;(prisma.ranking.deleteMany as jest.Mock).mockResolvedValue({
        count: 100,
      })
      ;(prisma.ranking.createMany as jest.Mock).mockResolvedValue({
        count: 100,
      })

      const result = await updateRankings('ALL_TIME')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.updated).toBe(100)
      }

      // Verify only top 100 were created
      const rankings = (prisma.ranking.createMany as jest.Mock).mock.calls[0][0]
        .data
      expect(rankings).toHaveLength(100)
      expect(rankings[0].totalReturn).toBe(100)
      expect(rankings[99].totalReturn).toBe(1)
    })

    it('should handle empty portfolios', async () => {
      ;(prisma.portfolio.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.ranking.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.ranking.createMany as jest.Mock).mockResolvedValue({ count: 0 })

      const result = await updateRankings('ALL_TIME')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.updated).toBe(0)
      }
    })

    it('should work for different periods', async () => {
      const mockPortfolios = [
        {
          userId: 'user1',
          totalReturn: 5.0,
          user: { id: 'user1', username: 'trader1' },
        },
      ]

      ;(prisma.portfolio.findMany as jest.Mock).mockResolvedValue(
        mockPortfolios
      )
      ;(prisma.ranking.deleteMany as jest.Mock).mockResolvedValue({ count: 0 })
      ;(prisma.ranking.createMany as jest.Mock).mockResolvedValue({ count: 1 })

      const periods = ['WEEKLY', 'MONTHLY', 'ALL_TIME']

      for (const period of periods) {
        await updateRankings(period as any)

        expect(prisma.ranking.deleteMany).toHaveBeenCalledWith({
          where: { period },
        })
      }
    })
  })

  describe('getRankings', () => {
    it('should return rankings for specified period', async () => {
      const mockRankings = [
        {
          id: 'ranking1',
          userId: 'user1',
          rank: 1,
          totalReturn: 25.0,
          period: 'ALL_TIME',
          updatedAt: new Date(),
          user: {
            id: 'user1',
            username: 'trader1',
            displayName: 'Top Trader',
            profileImage: null,
          },
        },
        {
          id: 'ranking2',
          userId: 'user2',
          rank: 2,
          totalReturn: 15.0,
          period: 'ALL_TIME',
          updatedAt: new Date(),
          user: {
            id: 'user2',
            username: 'trader2',
            displayName: 'Second Trader',
            profileImage: null,
          },
        },
      ]

      ;(prisma.ranking.findMany as jest.Mock).mockResolvedValue(mockRankings)

      const result = await getRankings('ALL_TIME', 10)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.rankings).toHaveLength(2)
        expect(result.data.rankings[0].rank).toBe(1)
        expect(result.data.rankings[0].user.username).toBe('trader1')
      }

      expect(prisma.ranking.findMany).toHaveBeenCalledWith({
        where: { period: 'ALL_TIME' },
        take: 10,
        orderBy: { rank: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              profileImage: true,
            },
          },
        },
      })
    })

    it('should limit results to specified limit', async () => {
      const mockRankings = Array.from({ length: 50 }, (_, i) => ({
        id: `ranking${i + 1}`,
        userId: `user${i + 1}`,
        rank: i + 1,
        totalReturn: 100 - i,
        period: 'ALL_TIME',
        updatedAt: new Date(),
        user: {
          id: `user${i + 1}`,
          username: `trader${i + 1}`,
          displayName: `Trader ${i + 1}`,
          profileImage: null,
        },
      }))

      ;(prisma.ranking.findMany as jest.Mock).mockResolvedValue(
        mockRankings.slice(0, 20)
      )

      const result = await getRankings('ALL_TIME', 20)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.rankings.length).toBeLessThanOrEqual(20)
      }

      expect(prisma.ranking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      )
    })

    it('should return empty array when no rankings exist', async () => {
      ;(prisma.ranking.findMany as jest.Mock).mockResolvedValue([])

      const result = await getRankings('WEEKLY', 10)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.rankings).toHaveLength(0)
      }
    })
  })

  describe('getUserRank', () => {
    it('should return user rank for specified period', async () => {
      const mockRanking = {
        id: 'ranking1',
        userId: 'user1',
        rank: 5,
        totalReturn: 12.5,
        period: 'ALL_TIME',
        updatedAt: new Date(),
        user: {
          id: 'user1',
          username: 'trader1',
          displayName: 'Trader 1',
          profileImage: null,
        },
      }

      ;(prisma.ranking.findFirst as jest.Mock).mockResolvedValue(mockRanking)

      const result = await getUserRank('user1', 'ALL_TIME')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.rank).toBe(5)
        expect(result.data.totalReturn).toBe(12.5)
        expect(result.data.period).toBe('ALL_TIME')
      }

      expect(prisma.ranking.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          period: 'ALL_TIME',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              profileImage: true,
            },
          },
        },
      })
    })

    it('should return null when user not in rankings', async () => {
      ;(prisma.ranking.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await getUserRank('unranked_user', 'ALL_TIME')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.rank).toBeNull()
      }
    })

    it('should work for different periods', async () => {
      const periods = ['WEEKLY', 'MONTHLY', 'ALL_TIME']

      for (const period of periods) {
        ;(prisma.ranking.findFirst as jest.Mock).mockResolvedValue({
          id: 'ranking1',
          userId: 'user1',
          rank: 1,
          totalReturn: 10.0,
          period,
        })

        await getUserRank('user1', period as any)

        expect(prisma.ranking.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ period }),
          })
        )
      }
    })
  })
})
