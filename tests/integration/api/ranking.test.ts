/**
 * Integration tests for Ranking API
 * Tests ranking calculations, retrieval, and user rank queries
 */

import { prisma } from '@/lib/prisma'
import {
  updateRankings,
  getRankings,
  getUserRank,
  RankingPeriod,
} from '@/lib/services/rankingService'
import { verifyTestDatabase } from '../../helpers/database'

describe('Ranking API Integration Tests', () => {
  let testUser1Id: string
  let testUser2Id: string
  let testUser3Id: string
  let testUser4Id: string

  // ⚠️ SAFETY CHECK: Verify we're using test database
  beforeAll(verifyTestDatabase)

  beforeEach(async () => {
    // Clean up database
    await prisma.ranking.deleteMany({})
    await prisma.follow.deleteMany({})
    await prisma.like.deleteMany({})
    await prisma.comment.deleteMany({})
    await prisma.post.deleteMany({})
    await prisma.transaction.deleteMany({})
    await prisma.holding.deleteMany({})
    await prisma.portfolio.deleteMany({})
    await prisma.user.deleteMany({})

    // Create test users with portfolios
    const user1 = await prisma.user.create({
      data: {
        email: 'user1@test.com',
        password: 'hash1',
        username: 'rankuser1',
        displayName: 'Rank User 1',
        portfolio: {
          create: {
            initialCapital: 10000000,
            currentCash: 10000000,
            totalAssets: 12000000, // +20% return
            totalReturn: 20.0,
          },
        },
      },
    })

    const user2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        password: 'hash2',
        username: 'rankuser2',
        displayName: 'Rank User 2',
        portfolio: {
          create: {
            initialCapital: 10000000,
            currentCash: 10000000,
            totalAssets: 11500000, // +15% return
            totalReturn: 15.0,
          },
        },
      },
    })

    const user3 = await prisma.user.create({
      data: {
        email: 'user3@test.com',
        password: 'hash3',
        username: 'rankuser3',
        displayName: 'Rank User 3',
        portfolio: {
          create: {
            initialCapital: 10000000,
            currentCash: 10000000,
            totalAssets: 9500000, // -5% return
            totalReturn: -5.0,
          },
        },
      },
    })

    const user4 = await prisma.user.create({
      data: {
        email: 'user4@test.com',
        password: 'hash4',
        username: 'rankuser4',
        displayName: 'Rank User 4',
        portfolio: {
          create: {
            initialCapital: 10000000,
            currentCash: 10000000,
            totalAssets: 10000000, // 0% return
            totalReturn: 0,
          },
        },
      },
    })

    testUser1Id = user1.id
    testUser2Id = user2.id
    testUser3Id = user3.id
    testUser4Id = user4.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('updateRankings', () => {
    it('should create rankings for ALL_TIME period', async () => {
      const result = await updateRankings('ALL_TIME')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.updated).toBe(4)

      // Verify rankings were saved in database
      const rankings = await prisma.ranking.findMany({
        where: { period: 'ALL_TIME' },
        orderBy: { rank: 'asc' },
      })

      expect(rankings).toHaveLength(4)
      expect(rankings[0].userId).toBe(testUser1Id) // 20% return
      expect(rankings[1].userId).toBe(testUser2Id) // 15% return
      expect(rankings[2].userId).toBe(testUser4Id) // 0% return
      expect(rankings[3].userId).toBe(testUser3Id) // -5% return
    })

    it('should create rankings for WEEKLY period', async () => {
      const result = await updateRankings('WEEKLY')

      expect(result.success).toBe(true)
      if (!result.success) return

      const rankings = await prisma.ranking.findMany({
        where: { period: 'WEEKLY' },
      })

      expect(rankings).toHaveLength(4)
    })

    it('should create rankings for MONTHLY period', async () => {
      const result = await updateRankings('MONTHLY')

      expect(result.success).toBe(true)
      if (!result.success) return

      const rankings = await prisma.ranking.findMany({
        where: { period: 'MONTHLY' },
      })

      expect(rankings).toHaveLength(4)
    })

    it('should assign correct rank numbers', async () => {
      const result = await updateRankings('ALL_TIME')

      expect(result.success).toBe(true)

      const rankings = await prisma.ranking.findMany({
        where: { period: 'ALL_TIME' },
        orderBy: { rank: 'asc' },
      })

      expect(rankings[0].rank).toBe(1)
      expect(rankings[1].rank).toBe(2)
      expect(rankings[2].rank).toBe(3)
      expect(rankings[3].rank).toBe(4)
    })

    it('should store totalReturn values correctly', async () => {
      const result = await updateRankings('ALL_TIME')

      expect(result.success).toBe(true)

      const rankings = await prisma.ranking.findMany({
        where: { period: 'ALL_TIME' },
        orderBy: { rank: 'asc' },
      })

      expect(rankings[0].totalReturn).toBe(20.0)
      expect(rankings[1].totalReturn).toBe(15.0)
      expect(rankings[2].totalReturn).toBe(0)
      expect(rankings[3].totalReturn).toBe(-5.0)
    })

    it('should delete existing rankings before creating new ones', async () => {
      // First update
      await updateRankings('ALL_TIME')

      // Update portfolio returns
      await prisma.portfolio.update({
        where: { userId: testUser3Id },
        data: { totalReturn: 30.0 }, // Now the best performer
      })

      // Second update
      await updateRankings('ALL_TIME')

      const rankings = await prisma.ranking.findMany({
        where: { period: 'ALL_TIME' },
        orderBy: { rank: 'asc' },
      })

      // User3 should now be rank 1
      expect(rankings[0].userId).toBe(testUser3Id)
      expect(rankings[0].totalReturn).toBe(30.0)

      // Should still have only 4 rankings (not 8)
      expect(rankings).toHaveLength(4)
    })

    it('should handle empty portfolios', async () => {
      // Delete all portfolios
      await prisma.portfolio.deleteMany({})

      const result = await updateRankings('ALL_TIME')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.updated).toBe(0)

      const rankings = await prisma.ranking.findMany({
        where: { period: 'ALL_TIME' },
      })

      expect(rankings).toHaveLength(0)
    })

    it('should limit to top 100 rankings', async () => {
      // Create 150 users with portfolios
      const users = []
      for (let i = 0; i < 150; i++) {
        const user = await prisma.user.create({
          data: {
            email: `bulkuser${i}@test.com`,
            password: `hash${i}`,
            username: `bulkuser${i}`,
            displayName: `Bulk User ${i}`,
            portfolio: {
              create: {
                initialCapital: 10000000,
                currentCash: 10000000,
                totalAssets: 10000000 + i * 1000,
                totalReturn: i * 0.01,
              },
            },
          },
        })
        users.push(user)
      }

      const result = await updateRankings('ALL_TIME')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.updated).toBe(100)

      const rankings = await prisma.ranking.findMany({
        where: { period: 'ALL_TIME' },
      })

      expect(rankings).toHaveLength(100)
    })

    it('should allow same user in multiple periods', async () => {
      // Update all 3 periods and verify each succeeds
      const weeklyResult = await updateRankings('WEEKLY')
      expect(weeklyResult.success).toBe(true)

      const monthlyResult = await updateRankings('MONTHLY')
      expect(monthlyResult.success).toBe(true)

      const allTimeResult = await updateRankings('ALL_TIME')
      expect(allTimeResult.success).toBe(true)

      // Check User1 exists in all periods
      const user1Rankings = await prisma.ranking.findMany({
        where: { userId: testUser1Id },
      })

      expect(user1Rankings).toHaveLength(3)

      const periods = user1Rankings.map((r) => r.period)
      expect(periods).toContain('WEEKLY')
      expect(periods).toContain('MONTHLY')
      expect(periods).toContain('ALL_TIME')
    })
  })

  describe('getRankings', () => {
    beforeEach(async () => {
      // Create rankings for testing
      await updateRankings('ALL_TIME')
    })

    it('should retrieve rankings for specified period', async () => {
      const result = await getRankings('ALL_TIME', 100)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.rankings).toHaveLength(4)
    })

    it('should return rankings in rank ascending order', async () => {
      const result = await getRankings('ALL_TIME', 100)

      expect(result.success).toBe(true)
      if (!result.success) return

      const ranks = result.data.rankings.map((r) => r.rank)
      expect(ranks).toEqual([1, 2, 3, 4])
    })

    it('should include user details', async () => {
      const result = await getRankings('ALL_TIME', 100)

      expect(result.success).toBe(true)
      if (!result.success) return

      const firstRank = result.data.rankings[0]
      expect(firstRank.user).toHaveProperty('id')
      expect(firstRank.user).toHaveProperty('username')
      expect(firstRank.user).toHaveProperty('displayName')
      expect(firstRank.user).toHaveProperty('profileImage')
    })

    it('should respect limit parameter', async () => {
      const result = await getRankings('ALL_TIME', 2)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.rankings).toHaveLength(2)
      expect(result.data.rankings[0].rank).toBe(1)
      expect(result.data.rankings[1].rank).toBe(2)
    })

    it('should return empty array when no rankings', async () => {
      // Clear rankings
      await prisma.ranking.deleteMany({})

      const result = await getRankings('ALL_TIME', 100)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.rankings).toHaveLength(0)
    })

    it('should retrieve correct period rankings', async () => {
      // Create WEEKLY rankings
      await updateRankings('WEEKLY')

      const weeklyResult = await getRankings('WEEKLY', 100)
      const allTimeResult = await getRankings('ALL_TIME', 100)

      expect(weeklyResult.success).toBe(true)
      expect(allTimeResult.success).toBe(true)

      if (!weeklyResult.success || !allTimeResult.success) return

      // Both should have rankings
      expect(weeklyResult.data.rankings.length).toBeGreaterThan(0)
      expect(allTimeResult.data.rankings.length).toBeGreaterThan(0)

      // Check period is correct
      expect(weeklyResult.data.rankings[0].period).toBe('WEEKLY')
      expect(allTimeResult.data.rankings[0].period).toBe('ALL_TIME')
    })
  })

  describe('getUserRank', () => {
    beforeEach(async () => {
      // Create rankings for testing
      await updateRankings('ALL_TIME')
    })

    it('should return user rank when in rankings', async () => {
      const result = await getUserRank(testUser1Id, 'ALL_TIME')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.rank).toBe(1) // Best performer
      expect(result.data.totalReturn).toBe(20.0)
      expect(result.data.period).toBe('ALL_TIME')
    })

    it('should return null rank when user not in rankings', async () => {
      // Create a new user without ranking
      const newUser = await prisma.user.create({
        data: {
          email: 'newuser@test.com',
          password: 'hash',
          username: 'newuser',
          displayName: 'New User',
        },
      })

      const result = await getUserRank(newUser.id, 'ALL_TIME')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.rank).toBeNull()
    })

    it('should include user details', async () => {
      const result = await getUserRank(testUser1Id, 'ALL_TIME')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user).toHaveProperty('id')
      expect(result.data.user?.username).toBe('rankuser1')
      expect(result.data.user?.displayName).toBe('Rank User 1')
    })

    it('should return correct rank for different users', async () => {
      const result1 = await getUserRank(testUser1Id, 'ALL_TIME')
      const result2 = await getUserRank(testUser2Id, 'ALL_TIME')
      const result3 = await getUserRank(testUser3Id, 'ALL_TIME')

      expect(result1.success && result1.data.rank).toBe(1) // 20% return
      expect(result2.success && result2.data.rank).toBe(2) // 15% return
      expect(result3.success && result3.data.rank).toBe(4) // -5% return
    })

    it('should return correct rank for different periods', async () => {
      // Create WEEKLY rankings
      await updateRankings('WEEKLY')

      const allTimeResult = await getUserRank(testUser1Id, 'ALL_TIME')
      const weeklyResult = await getUserRank(testUser1Id, 'WEEKLY')

      expect(allTimeResult.success).toBe(true)
      expect(weeklyResult.success).toBe(true)

      if (!allTimeResult.success || !weeklyResult.success) return

      expect(allTimeResult.data.period).toBe('ALL_TIME')
      expect(weeklyResult.data.period).toBe('WEEKLY')
    })

    it('should return null for invalid user ID', async () => {
      const fakeUserId = 'fake-user-id-123'
      const result = await getUserRank(fakeUserId, 'ALL_TIME')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.rank).toBeNull()
    })
  })

  describe('Edge Cases and Data Consistency', () => {
    it('should handle users with same totalReturn', async () => {
      // Update two users to have same return
      await prisma.portfolio.update({
        where: { userId: testUser1Id },
        data: { totalReturn: 10.0 },
      })
      await prisma.portfolio.update({
        where: { userId: testUser2Id },
        data: { totalReturn: 10.0 },
      })

      const result = await updateRankings('ALL_TIME')

      expect(result.success).toBe(true)

      const rankings = await prisma.ranking.findMany({
        where: { period: 'ALL_TIME' },
        orderBy: { rank: 'asc' },
      })

      // Both users should have rankings (order may vary)
      const top2Users = [rankings[0].userId, rankings[1].userId]
      expect(top2Users).toContain(testUser1Id)
      expect(top2Users).toContain(testUser2Id)
    })

    it('should handle negative returns correctly', async () => {
      // All users with negative returns
      await prisma.portfolio.updateMany({
        data: { totalReturn: -10.0 },
      })

      const result = await updateRankings('ALL_TIME')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.updated).toBe(4)

      const rankings = await prisma.ranking.findMany({
        where: { period: 'ALL_TIME' },
      })

      rankings.forEach((ranking) => {
        expect(ranking.totalReturn).toBe(-10.0)
      })
    })

    it('should maintain unique constraint per user per period', async () => {
      // First update
      await updateRankings('ALL_TIME')

      // Second update (should replace, not duplicate)
      await updateRankings('ALL_TIME')

      const rankings = await prisma.ranking.findMany({
        where: {
          userId: testUser1Id,
          period: 'ALL_TIME',
        },
      })

      // Should only have one ranking per user per period
      expect(rankings).toHaveLength(1)
    })
  })
})
