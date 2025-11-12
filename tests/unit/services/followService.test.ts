/**
 * Unit tests for Follow Service
 * Tests follow/unfollow functionality and follow relationships
 */

import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  isFollowing,
  getFollowCounts,
} from '@/lib/services/followService'
import { prisma } from '@/lib/prisma'
import { ErrorCodes } from '@/lib/types/api'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    follow: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

describe('FollowService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('followUser', () => {
    it('should create follow relationship successfully', async () => {
      const mockFollower = {
        id: 'user1',
        username: 'follower',
        displayName: 'Follower User',
      }

      const mockFollowing = {
        id: 'user2',
        username: 'following',
        displayName: 'Following User',
      }

      const mockFollow = {
        id: 'follow123',
        followerId: 'user1',
        followingId: 'user2',
        createdAt: new Date(),
      }

      // Both users exist
      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFollower)
        .mockResolvedValueOnce(mockFollowing)

      // No existing follow relationship
      ;(prisma.follow.findUnique as jest.Mock).mockResolvedValue(null)

      // Create follow
      ;(prisma.follow.create as jest.Mock).mockResolvedValue(mockFollow)

      const result = await followUser('user1', 'user2')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.followerId).toBe('user1')
        expect(result.data.followingId).toBe('user2')
      }

      // Verify follow was created
      expect(prisma.follow.create).toHaveBeenCalledWith({
        data: {
          followerId: 'user1',
          followingId: 'user2',
        },
      })
    })

    it('should prevent following yourself', async () => {
      const result = await followUser('user1', 'user1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.VALIDATION_INVALID_INPUT)
        expect(result.error.message).toContain('follow yourself')
      }

      // Should not check database
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
      expect(prisma.follow.create).not.toHaveBeenCalled()
    })

    it('should prevent duplicate follow', async () => {
      const mockFollower = {
        id: 'user1',
        username: 'follower',
      }

      const mockFollowing = {
        id: 'user2',
        username: 'following',
      }

      const mockExistingFollow = {
        id: 'follow123',
        followerId: 'user1',
        followingId: 'user2',
      }

      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFollower)
        .mockResolvedValueOnce(mockFollowing)

      // Existing follow found
      ;(prisma.follow.findUnique as jest.Mock).mockResolvedValue(
        mockExistingFollow
      )

      const result = await followUser('user1', 'user2')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.VALIDATION_DUPLICATE)
        expect(result.error.message).toContain('Already following')
      }

      // Should not create duplicate
      expect(prisma.follow.create).not.toHaveBeenCalled()
    })

    it('should fail when follower not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null)

      const result = await followUser('nonexistent', 'user2')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.NOT_FOUND)
        expect(result.error.message).toContain('Follower not found')
      }

      expect(prisma.follow.create).not.toHaveBeenCalled()
    })

    it('should fail when following user not found', async () => {
      const mockFollower = {
        id: 'user1',
        username: 'follower',
      }

      ;(prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFollower)
        .mockResolvedValueOnce(null)

      const result = await followUser('user1', 'nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.NOT_FOUND)
        expect(result.error.message).toContain('User to follow not found')
      }

      expect(prisma.follow.create).not.toHaveBeenCalled()
    })
  })

  describe('unfollowUser', () => {
    it('should remove follow relationship successfully', async () => {
      const mockExistingFollow = {
        id: 'follow123',
        followerId: 'user1',
        followingId: 'user2',
        createdAt: new Date(),
      }

      ;(prisma.follow.findUnique as jest.Mock).mockResolvedValue(
        mockExistingFollow
      )
      ;(prisma.follow.delete as jest.Mock).mockResolvedValue(
        mockExistingFollow
      )

      const result = await unfollowUser('user1', 'user2')

      expect(result.success).toBe(true)

      // Verify follow was deleted
      expect(prisma.follow.delete).toHaveBeenCalledWith({
        where: {
          followerId_followingId: {
            followerId: 'user1',
            followingId: 'user2',
          },
        },
      })
    })

    it('should fail when follow relationship does not exist', async () => {
      ;(prisma.follow.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await unfollowUser('user1', 'user2')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.NOT_FOUND)
        expect(result.error.message).toContain('Not following')
      }

      expect(prisma.follow.delete).not.toHaveBeenCalled()
    })

    it('should prevent unfollowing yourself', async () => {
      const result = await unfollowUser('user1', 'user1')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.VALIDATION_INVALID_INPUT)
      }

      expect(prisma.follow.findUnique).not.toHaveBeenCalled()
      expect(prisma.follow.delete).not.toHaveBeenCalled()
    })
  })

  describe('getFollowers', () => {
    it('should return list of followers', async () => {
      const mockFollowers = [
        {
          id: 'follow1',
          followerId: 'user2',
          followingId: 'user1',
          createdAt: new Date('2024-01-01'),
          follower: {
            id: 'user2',
            username: 'follower1',
            displayName: 'Follower One',
            profileImage: null,
          },
        },
        {
          id: 'follow2',
          followerId: 'user3',
          followingId: 'user1',
          createdAt: new Date('2024-01-02'),
          follower: {
            id: 'user3',
            username: 'follower2',
            displayName: 'Follower Two',
            profileImage: null,
          },
        },
      ]

      const mockUser = {
        id: 'user1',
        username: 'targetuser',
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.follow.findMany as jest.Mock).mockResolvedValue(mockFollowers)

      const result = await getFollowers('user1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.followers).toHaveLength(2)
        expect(result.data.followers[0].username).toBe('follower1')
        expect(result.data.followers[1].username).toBe('follower2')
      }

      // Verify query was correct
      expect(prisma.follow.findMany).toHaveBeenCalledWith({
        where: { followingId: 'user1' },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              displayName: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty array when no followers', async () => {
      const mockUser = {
        id: 'user1',
        username: 'lonelyuser',
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.follow.findMany as jest.Mock).mockResolvedValue([])

      const result = await getFollowers('user1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.followers).toHaveLength(0)
      }
    })

    it('should fail when user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getFollowers('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.NOT_FOUND)
      }

      expect(prisma.follow.findMany).not.toHaveBeenCalled()
    })
  })

  describe('getFollowing', () => {
    it('should return list of following', async () => {
      const mockFollowing = [
        {
          id: 'follow1',
          followerId: 'user1',
          followingId: 'user2',
          createdAt: new Date('2024-01-01'),
          following: {
            id: 'user2',
            username: 'following1',
            displayName: 'Following One',
            profileImage: null,
          },
        },
        {
          id: 'follow2',
          followerId: 'user1',
          followingId: 'user3',
          createdAt: new Date('2024-01-02'),
          following: {
            id: 'user3',
            username: 'following2',
            displayName: 'Following Two',
            profileImage: null,
          },
        },
      ]

      const mockUser = {
        id: 'user1',
        username: 'targetuser',
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.follow.findMany as jest.Mock).mockResolvedValue(mockFollowing)

      const result = await getFollowing('user1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.following).toHaveLength(2)
        expect(result.data.following[0].username).toBe('following1')
        expect(result.data.following[1].username).toBe('following2')
      }

      // Verify query was correct
      expect(prisma.follow.findMany).toHaveBeenCalledWith({
        where: { followerId: 'user1' },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              displayName: true,
              profileImage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty array when not following anyone', async () => {
      const mockUser = {
        id: 'user1',
        username: 'newuser',
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.follow.findMany as jest.Mock).mockResolvedValue([])

      const result = await getFollowing('user1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.following).toHaveLength(0)
      }
    })

    it('should fail when user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getFollowing('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.NOT_FOUND)
      }

      expect(prisma.follow.findMany).not.toHaveBeenCalled()
    })
  })

  describe('isFollowing', () => {
    it('should return true when following', async () => {
      const mockFollow = {
        id: 'follow123',
        followerId: 'user1',
        followingId: 'user2',
      }

      ;(prisma.follow.findUnique as jest.Mock).mockResolvedValue(mockFollow)

      const result = await isFollowing('user1', 'user2')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isFollowing).toBe(true)
      }

      expect(prisma.follow.findUnique).toHaveBeenCalledWith({
        where: {
          followerId_followingId: {
            followerId: 'user1',
            followingId: 'user2',
          },
        },
      })
    })

    it('should return false when not following', async () => {
      ;(prisma.follow.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await isFollowing('user1', 'user2')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isFollowing).toBe(false)
      }
    })

    it('should work for different users', async () => {
      // User1 follows User2
      ;(prisma.follow.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'follow123',
        followerId: 'user1',
        followingId: 'user2',
      })

      const result1 = await isFollowing('user1', 'user2')
      expect(result1.success && result1.data.isFollowing).toBe(true)

      // User2 does not follow User1
      ;(prisma.follow.findUnique as jest.Mock).mockResolvedValueOnce(null)

      const result2 = await isFollowing('user2', 'user1')
      expect(result2.success && result2.data.isFollowing).toBe(false)
    })
  })

  describe('getFollowCounts', () => {
    it('should return follower and following counts', async () => {
      const mockUser = {
        id: 'user1',
        username: 'testuser',
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      // Mock follower count (people following this user)
      ;(prisma.follow.count as jest.Mock)
        .mockResolvedValueOnce(10) // followers
        .mockResolvedValueOnce(5) // following

      const result = await getFollowCounts('user1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.followerCount).toBe(10)
        expect(result.data.followingCount).toBe(5)
      }

      // Verify counts were queried correctly
      expect(prisma.follow.count).toHaveBeenCalledWith({
        where: { followingId: 'user1' },
      })
      expect(prisma.follow.count).toHaveBeenCalledWith({
        where: { followerId: 'user1' },
      })
    })

    it('should return zero counts for new user', async () => {
      const mockUser = {
        id: 'user1',
        username: 'newuser',
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.follow.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)

      const result = await getFollowCounts('user1')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.followerCount).toBe(0)
        expect(result.data.followingCount).toBe(0)
      }
    })

    it('should fail when user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getFollowCounts('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.NOT_FOUND)
      }

      expect(prisma.follow.count).not.toHaveBeenCalled()
    })
  })
})
