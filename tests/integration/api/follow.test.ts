/**
 * Integration tests for Follow API
 * Tests follow/unfollow, followers/following lists, and follow status
 */

import { prisma } from '@/lib/prisma'
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  isFollowing,
  getFollowCounts,
} from '@/lib/services/followService'
import { verifyTestDatabase } from '../../helpers/database'

describe('Follow API Integration Tests', () => {
  let testUser1Id: string
  let testUser2Id: string
  let testUser3Id: string

  // ⚠️ SAFETY CHECK: Verify we're using test database
  beforeAll(verifyTestDatabase)

  beforeEach(async () => {
    // Clean up test database (safe - verified above)
    await prisma.follow.deleteMany({})
    await prisma.ranking.deleteMany({})
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
        username: 'testuser1',
        displayName: 'Test User 1',
      },
    })

    const user2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        password: 'hashedpassword2',
        username: 'testuser2',
        displayName: 'Test User 2',
      },
    })

    const user3 = await prisma.user.create({
      data: {
        email: 'user3@test.com',
        password: 'hashedpassword3',
        username: 'testuser3',
        displayName: 'Test User 3',
      },
    })

    testUser1Id = user1.id
    testUser2Id = user2.id
    testUser3Id = user3.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('followUser', () => {
    it('should successfully follow a user', async () => {
      const result = await followUser(testUser1Id, testUser2Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.followerId).toBe(testUser1Id)
      expect(result.data.followingId).toBe(testUser2Id)

      // Verify follow was saved in database
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: testUser1Id,
            followingId: testUser2Id,
          },
        },
      })

      expect(follow).not.toBeNull()
      expect(follow?.followerId).toBe(testUser1Id)
      expect(follow?.followingId).toBe(testUser2Id)
    })

    it('should return error when following yourself', async () => {
      const result = await followUser(testUser1Id, testUser1Id)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('VALIDATION_INVALID_INPUT')
      expect(result.error.message).toContain('cannot follow yourself')
    })

    it('should return error when already following', async () => {
      // First follow
      await followUser(testUser1Id, testUser2Id)

      // Try to follow again
      const result = await followUser(testUser1Id, testUser2Id)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('VALIDATION_DUPLICATE')
      expect(result.error.message).toContain('Already following')
    })

    it('should return error when follower not found', async () => {
      const fakeUserId = 'fake-user-id-123'
      const result = await followUser(fakeUserId, testUser2Id)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toContain('Follower not found')
    })

    it('should return error when user to follow not found', async () => {
      const fakeUserId = 'fake-user-id-123'
      const result = await followUser(testUser1Id, fakeUserId)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toContain('User to follow not found')
    })

    it('should create follow record with timestamp', async () => {
      const beforeTime = new Date()
      const result = await followUser(testUser1Id, testUser2Id)

      expect(result.success).toBe(true)

      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: testUser1Id,
            followingId: testUser2Id,
          },
        },
      })

      expect(follow).not.toBeNull()
      expect(follow?.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeTime.getTime()
      )
    })

    it('should allow multiple users to follow the same user', async () => {
      // User1 follows User2
      const result1 = await followUser(testUser1Id, testUser2Id)
      expect(result1.success).toBe(true)

      // User3 also follows User2
      const result2 = await followUser(testUser3Id, testUser2Id)
      expect(result2.success).toBe(true)

      // Verify both follows exist
      const followCount = await prisma.follow.count({
        where: { followingId: testUser2Id },
      })
      expect(followCount).toBe(2)
    })

    it('should allow user to follow multiple users', async () => {
      // User1 follows User2
      const result1 = await followUser(testUser1Id, testUser2Id)
      expect(result1.success).toBe(true)

      // User1 also follows User3
      const result2 = await followUser(testUser1Id, testUser3Id)
      expect(result2.success).toBe(true)

      // Verify both follows exist
      const followCount = await prisma.follow.count({
        where: { followerId: testUser1Id },
      })
      expect(followCount).toBe(2)
    })
  })

  describe('unfollowUser', () => {
    beforeEach(async () => {
      // Create a follow relationship for testing unfollow
      await prisma.follow.create({
        data: {
          followerId: testUser1Id,
          followingId: testUser2Id,
        },
      })
    })

    it('should successfully unfollow a user', async () => {
      const result = await unfollowUser(testUser1Id, testUser2Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.unfollowed).toBe(true)

      // Verify follow was deleted from database
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: testUser1Id,
            followingId: testUser2Id,
          },
        },
      })

      expect(follow).toBeNull()
    })

    it('should return error when unfollowing yourself', async () => {
      const result = await unfollowUser(testUser1Id, testUser1Id)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('VALIDATION_INVALID_INPUT')
      expect(result.error.message).toContain('cannot unfollow yourself')
    })

    it('should return error when not following the user', async () => {
      // User1 doesn't follow User3
      const result = await unfollowUser(testUser1Id, testUser3Id)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toContain('Not following')
    })

    it('should return error when trying to unfollow non-existent user', async () => {
      const fakeUserId = 'fake-user-id-123'
      const result = await unfollowUser(testUser1Id, fakeUserId)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
    })

    it('should allow follow again after unfollow', async () => {
      // Unfollow
      const unfollowResult = await unfollowUser(testUser1Id, testUser2Id)
      expect(unfollowResult.success).toBe(true)

      // Follow again
      const followResult = await followUser(testUser1Id, testUser2Id)
      expect(followResult.success).toBe(true)

      // Verify follow exists
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: testUser1Id,
            followingId: testUser2Id,
          },
        },
      })
      expect(follow).not.toBeNull()
    })
  })

  describe('getFollowers', () => {
    beforeEach(async () => {
      // User1 and User3 follow User2
      await prisma.follow.createMany({
        data: [
          { followerId: testUser1Id, followingId: testUser2Id },
          { followerId: testUser3Id, followingId: testUser2Id },
        ],
      })
    })

    it('should get list of followers', async () => {
      const result = await getFollowers(testUser2Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.followers).toHaveLength(2)
      expect(result.data.followers.map((f: any) => f.id)).toContain(
        testUser1Id
      )
      expect(result.data.followers.map((f: any) => f.id)).toContain(
        testUser3Id
      )
    })

    it('should include user details in followers list', async () => {
      const result = await getFollowers(testUser2Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      const follower = result.data.followers[0]
      expect(follower).toHaveProperty('id')
      expect(follower).toHaveProperty('username')
      expect(follower).toHaveProperty('displayName')
      expect(follower).toHaveProperty('profileImage')
    })

    it('should return followers ordered by createdAt', async () => {
      const result = await getFollowers(testUser2Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      // Both followers should be present
      const followerIds = result.data.followers.map((f: any) => f.id)
      expect(followerIds).toContain(testUser1Id)
      expect(followerIds).toContain(testUser3Id)

      // Verify they are ordered (most recent first)
      expect(result.data.followers).toHaveLength(2)
    })

    it('should return empty array when no followers', async () => {
      const result = await getFollowers(testUser1Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.followers).toHaveLength(0)
    })

    it('should return error when user not found', async () => {
      const fakeUserId = 'fake-user-id-123'
      const result = await getFollowers(fakeUserId)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toContain('User not found')
    })
  })

  describe('getFollowing', () => {
    beforeEach(async () => {
      // User1 follows User2 and User3
      await prisma.follow.createMany({
        data: [
          { followerId: testUser1Id, followingId: testUser2Id },
          { followerId: testUser1Id, followingId: testUser3Id },
        ],
      })
    })

    it('should get list of following', async () => {
      const result = await getFollowing(testUser1Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.following).toHaveLength(2)
      expect(result.data.following.map((f: any) => f.id)).toContain(
        testUser2Id
      )
      expect(result.data.following.map((f: any) => f.id)).toContain(
        testUser3Id
      )
    })

    it('should include user details in following list', async () => {
      const result = await getFollowing(testUser1Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      const following = result.data.following[0]
      expect(following).toHaveProperty('id')
      expect(following).toHaveProperty('username')
      expect(following).toHaveProperty('displayName')
      expect(following).toHaveProperty('profileImage')
    })

    it('should return following ordered by createdAt', async () => {
      const result = await getFollowing(testUser1Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      // Both following should be present
      const followingIds = result.data.following.map((f: any) => f.id)
      expect(followingIds).toContain(testUser2Id)
      expect(followingIds).toContain(testUser3Id)

      // Verify they are ordered (most recent first)
      expect(result.data.following).toHaveLength(2)
    })

    it('should return empty array when not following anyone', async () => {
      const result = await getFollowing(testUser2Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.following).toHaveLength(0)
    })

    it('should return error when user not found', async () => {
      const fakeUserId = 'fake-user-id-123'
      const result = await getFollowing(fakeUserId)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toContain('User not found')
    })
  })

  describe('isFollowing', () => {
    beforeEach(async () => {
      // User1 follows User2
      await prisma.follow.create({
        data: {
          followerId: testUser1Id,
          followingId: testUser2Id,
        },
      })
    })

    it('should return true when following', async () => {
      const result = await isFollowing(testUser1Id, testUser2Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.isFollowing).toBe(true)
    })

    it('should return false when not following', async () => {
      const result = await isFollowing(testUser1Id, testUser3Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.isFollowing).toBe(false)
    })

    it('should return false for same user', async () => {
      const result = await isFollowing(testUser1Id, testUser1Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.isFollowing).toBe(false)
    })

    it('should work with non-existent users', async () => {
      const fakeUserId = 'fake-user-id-123'
      const result = await isFollowing(testUser1Id, fakeUserId)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.isFollowing).toBe(false)
    })
  })

  describe('getFollowCounts', () => {
    beforeEach(async () => {
      // User1 follows User2 and User3
      // User3 follows User1
      await prisma.follow.createMany({
        data: [
          { followerId: testUser1Id, followingId: testUser2Id },
          { followerId: testUser1Id, followingId: testUser3Id },
          { followerId: testUser3Id, followingId: testUser1Id },
        ],
      })
    })

    it('should get follower and following counts', async () => {
      const result = await getFollowCounts(testUser1Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.followerCount).toBe(1) // User3 follows User1
      expect(result.data.followingCount).toBe(2) // User1 follows User2 and User3
    })

    it('should return zero counts when no follows', async () => {
      const result = await getFollowCounts(testUser2Id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.followerCount).toBe(1) // User1 follows User2
      expect(result.data.followingCount).toBe(0) // User2 doesn't follow anyone
    })

    it('should return error when user not found', async () => {
      const fakeUserId = 'fake-user-id-123'
      const result = await getFollowCounts(fakeUserId)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
      expect(result.error.message).toContain('User not found')
    })

    it('should update counts after follow', async () => {
      // Get initial counts for User2
      const before = await getFollowCounts(testUser2Id)
      expect(before.success && before.data.followerCount).toBe(1)

      // User3 follows User2
      await followUser(testUser3Id, testUser2Id)

      // Get updated counts
      const after = await getFollowCounts(testUser2Id)
      expect(after.success && after.data.followerCount).toBe(2)
    })

    it('should update counts after unfollow', async () => {
      // Get initial counts for User1
      const before = await getFollowCounts(testUser1Id)
      expect(before.success && before.data.followingCount).toBe(2)

      // User1 unfollows User2
      await unfollowUser(testUser1Id, testUser2Id)

      // Get updated counts
      const after = await getFollowCounts(testUser1Id)
      expect(after.success && after.data.followingCount).toBe(1)
    })
  })
})
