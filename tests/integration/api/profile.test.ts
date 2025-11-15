/**
 * Integration tests for Profile API
 * Tests profile retrieval and updates
 */

import { prisma } from '@/lib/prisma'
import {
  getPublicProfile,
  updateProfile,
} from '@/lib/services/userProfileService'
import { verifyTestDatabase } from '../../helpers/database'

describe('Profile API Integration Tests', () => {
  let testUser1Id: string
  let testUser2Id: string

  // ⚠️ SAFETY CHECK: Verify we're using test database
  beforeAll(verifyTestDatabase)

  beforeEach(async () => {
    // Clean up test database (safe - verified above)
    await prisma.ranking.deleteMany({})
    await prisma.follow.deleteMany({})
    await prisma.like.deleteMany({})
    await prisma.comment.deleteMany({})
    await prisma.post.deleteMany({})
    await prisma.transaction.deleteMany({})
    await prisma.holding.deleteMany({})
    await prisma.portfolio.deleteMany({})
    await prisma.user.deleteMany({})

    // Create test users
    const user1 = await prisma.user.create({
      data: {
        email: 'user1@test.com',
        password: 'hashedpassword1',
        username: 'profileuser1',
        displayName: 'Profile User 1',
        bio: 'This is my bio',
        profileImage: 'https://example.com/avatar1.jpg',
        portfolio: {
          create: {
            initialCapital: 10000000,
            currentCash: 9000000,
            totalAssets: 11000000,
            totalReturn: 10.0,
            realizedPL: 500000,
            unrealizedPL: 500000,
          },
        },
      },
    })

    const user2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        password: 'hashedpassword2',
        username: 'profileuser2',
        displayName: 'Profile User 2',
      },
    })

    testUser1Id = user1.id
    testUser2Id = user2.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('getPublicProfile', () => {
    it('should retrieve user profile by username', async () => {
      const result = await getPublicProfile('profileuser1')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.username).toBe('profileuser1')
      expect(result.data.user.displayName).toBe('Profile User 1')
      expect(result.data.user.bio).toBe('This is my bio')
      expect(result.data.user.profileImage).toBe(
        'https://example.com/avatar1.jpg'
      )
    })

    it('should include portfolio data', async () => {
      const result = await getPublicProfile('profileuser1')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.portfolio).toBeDefined()
      expect(result.data.portfolio.initialCapital).toBe(10000000)
      expect(result.data.portfolio.currentCash).toBe(9000000)
      expect(result.data.portfolio.totalAssets).toBe(11000000)
      expect(result.data.portfolio.totalReturn).toBe(10.0)
      expect(result.data.portfolio.realizedPL).toBe(500000)
      expect(result.data.portfolio.unrealizedPL).toBe(500000)
    })

    it('should include follower and following counts', async () => {
      // User2 follows User1
      await prisma.follow.create({
        data: {
          followerId: testUser2Id,
          followingId: testUser1Id,
        },
      })

      // User1 follows User2
      await prisma.follow.create({
        data: {
          followerId: testUser1Id,
          followingId: testUser2Id,
        },
      })

      const result = await getPublicProfile('profileuser1')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.followerCount).toBe(1) // User2 follows User1
      expect(result.data.user.followingCount).toBe(1) // User1 follows User2
    })

    it('should include post count', async () => {
      // Create posts for User1
      await prisma.post.createMany({
        data: [
          {
            userId: testUser1Id,
            title: 'Post 1',
            content: 'Content 1',
          },
          {
            userId: testUser1Id,
            title: 'Post 2',
            content: 'Content 2',
          },
        ],
      })

      const result = await getPublicProfile('profileuser1')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.postCount).toBe(2)
    })

    it('should include transaction count', async () => {
      // Create transactions for User1
      await prisma.transaction.createMany({
        data: [
          {
            userId: testUser1Id,
            type: 'BUY',
            stockCode: '005930',
            stockName: '삼성전자',
            quantity: 10,
            price: 70000,
            totalAmount: 700000,
          },
          {
            userId: testUser1Id,
            type: 'SELL',
            stockCode: '005930',
            stockName: '삼성전자',
            quantity: 5,
            price: 75000,
            totalAmount: 375000,
          },
        ],
      })

      const result = await getPublicProfile('profileuser1')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.transactionCount).toBe(2)
    })

    it('should return null portfolio for users without portfolio', async () => {
      const result = await getPublicProfile('profileuser2')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.portfolio).toBeNull()
    })

    it('should return error for non-existent username', async () => {
      const result = await getPublicProfile('nonexistentuser')

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toContain('User not found')
    })

    it('should include user ID and createdAt', async () => {
      const result = await getPublicProfile('profileuser1')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.id).toBe(testUser1Id)
      expect(result.data.user.createdAt).toBeDefined()
    })

    it('should not expose sensitive data', async () => {
      const result = await getPublicProfile('profileuser1')

      expect(result.success).toBe(true)
      if (!result.success) return

      // Should not have password or email in public profile
      expect(result.data.user).not.toHaveProperty('password')
      expect(result.data.user).not.toHaveProperty('email')
    })

    it('should handle user with zero counts', async () => {
      const result = await getPublicProfile('profileuser2')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.followerCount).toBe(0)
      expect(result.data.user.followingCount).toBe(0)
      expect(result.data.user.postCount).toBe(0)
      expect(result.data.user.transactionCount).toBe(0)
    })
  })

  describe('updateProfile', () => {
    it('should update displayName', async () => {
      const result = await updateProfile(testUser1Id, {
        displayName: 'New Display Name',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.displayName).toBe('New Display Name')

      // Verify in database
      const user = await prisma.user.findUnique({
        where: { id: testUser1Id },
      })
      expect(user?.displayName).toBe('New Display Name')
    })

    it('should update bio', async () => {
      const result = await updateProfile(testUser1Id, {
        bio: 'My new bio',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.bio).toBe('My new bio')

      // Verify in database
      const user = await prisma.user.findUnique({
        where: { id: testUser1Id },
      })
      expect(user?.bio).toBe('My new bio')
    })

    it('should update profileImage', async () => {
      const newImageUrl = 'https://example.com/new-avatar.jpg'
      const result = await updateProfile(testUser1Id, {
        profileImage: newImageUrl,
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.profileImage).toBe(newImageUrl)

      // Verify in database
      const user = await prisma.user.findUnique({
        where: { id: testUser1Id },
      })
      expect(user?.profileImage).toBe(newImageUrl)
    })

    it('should update multiple fields at once', async () => {
      const result = await updateProfile(testUser1Id, {
        displayName: 'Updated Name',
        bio: 'Updated bio',
        profileImage: 'https://example.com/updated.jpg',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.displayName).toBe('Updated Name')
      expect(result.data.user.bio).toBe('Updated bio')
      expect(result.data.user.profileImage).toBe(
        'https://example.com/updated.jpg'
      )
    })

    it('should trim whitespace from displayName', async () => {
      const result = await updateProfile(testUser1Id, {
        displayName: '  Trimmed Name  ',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.displayName).toBe('Trimmed Name')
    })

    it('should trim whitespace from bio', async () => {
      const result = await updateProfile(testUser1Id, {
        bio: '  Trimmed bio  ',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.bio).toBe('Trimmed bio')
    })

    it('should set bio to null when empty string provided', async () => {
      const result = await updateProfile(testUser1Id, {
        bio: '',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.bio).toBeNull()

      // Verify in database
      const user = await prisma.user.findUnique({
        where: { id: testUser1Id },
      })
      expect(user?.bio).toBeNull()
    })

    it('should set profileImage to null when empty string provided', async () => {
      const result = await updateProfile(testUser1Id, {
        profileImage: '',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.profileImage).toBeNull()
    })

    it('should return error when displayName is empty', async () => {
      const result = await updateProfile(testUser1Id, {
        displayName: '',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('VALIDATION_MISSING_FIELDS')
      expect(result.error.message).toContain('Display name cannot be empty')
    })

    it('should return error when displayName is only whitespace', async () => {
      const result = await updateProfile(testUser1Id, {
        displayName: '   ',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('VALIDATION_MISSING_FIELDS')
    })

    it('should return error for non-existent user', async () => {
      const fakeUserId = 'fake-user-id-123'
      const result = await updateProfile(fakeUserId, {
        displayName: 'New Name',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toContain('User not found')
    })

    it('should return updated user with all fields', async () => {
      const result = await updateProfile(testUser1Id, {
        displayName: 'Updated Name',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      // Should include all user fields (not just updated ones)
      expect(result.data.user).toHaveProperty('id')
      expect(result.data.user).toHaveProperty('username')
      expect(result.data.user).toHaveProperty('displayName')
      expect(result.data.user).toHaveProperty('bio')
      expect(result.data.user).toHaveProperty('profileImage')
    })

    it('should not modify username', async () => {
      const originalUsername = 'profileuser1'

      const result = await updateProfile(testUser1Id, {
        displayName: 'New Name',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      // Username should remain unchanged
      expect(result.data.user.username).toBe(originalUsername)
    })

    it('should allow updating only one field', async () => {
      // Get original values
      const original = await prisma.user.findUnique({
        where: { id: testUser1Id },
      })

      // Update only bio
      const result = await updateProfile(testUser1Id, {
        bio: 'New bio only',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      // Bio should be updated
      expect(result.data.user.bio).toBe('New bio only')

      // Other fields should remain unchanged
      expect(result.data.user.displayName).toBe(original?.displayName)
      expect(result.data.user.profileImage).toBe(original?.profileImage)
    })

    it('should handle long bio text', async () => {
      const longBio = 'a'.repeat(1000) // 1000 character bio

      const result = await updateProfile(testUser1Id, {
        bio: longBio,
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.bio).toBe(longBio)
    })

    it('should handle special characters in bio', async () => {
      const specialBio = '안녕하세요! 👋 Special chars: <>&"\''

      const result = await updateProfile(testUser1Id, {
        bio: specialBio,
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.user.bio).toBe(specialBio)
    })
  })

  describe('Integration between getPublicProfile and updateProfile', () => {
    it('should reflect updates in public profile', async () => {
      // Get original profile
      const before = await getPublicProfile('profileuser1')
      expect(before.success).toBe(true)

      // Update profile
      await updateProfile(testUser1Id, {
        displayName: 'Updated for Integration',
        bio: 'Updated bio for integration',
      })

      // Get updated profile
      const after = await getPublicProfile('profileuser1')
      expect(after.success).toBe(true)

      if (!before.success || !after.success) return

      // Verify changes are reflected
      expect(after.data.user.displayName).toBe('Updated for Integration')
      expect(after.data.user.bio).toBe('Updated bio for integration')
      expect(after.data.user.displayName).not.toBe(
        before.data.user.displayName
      )
    })
  })
})
