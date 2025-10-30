/**
 * Unit tests for Like Service
 * Tests like/unlike toggle functionality
 */

import { toggleLike, getLikeStatus } from '@/lib/services/likeService'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    like: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}))

describe('LikeService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('toggleLike', () => {
    it('should add like when not already liked', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'author123',
        title: 'Test Post',
        likeCount: 5,
      }

      const mockUser = {
        id: 'user123',
        username: 'liker',
      }

      const mockLike = {
        id: 'like123',
        postId: 'post123',
        userId: 'user123',
        createdAt: new Date(),
      }

      // No existing like
      ;(prisma.like.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.like.create as jest.Mock).mockResolvedValue(mockLike)
      ;(prisma.post.update as jest.Mock).mockResolvedValue({
        ...mockPost,
        likeCount: 6,
      })

      const result = await toggleLike('post123', 'user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.liked).toBe(true)
        expect(result.data.likeCount).toBe(6)
      }

      // Verify like was created
      expect(prisma.like.create).toHaveBeenCalledWith({
        data: {
          postId: 'post123',
          userId: 'user123',
        },
      })

      // Verify post likeCount was incremented
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post123' },
        data: { likeCount: { increment: 1 } },
      })
    })

    it('should remove like when already liked', async () => {
      const mockPost = {
        id: 'post123',
        likeCount: 6,
      }

      const mockExistingLike = {
        id: 'like123',
        postId: 'post123',
        userId: 'user123',
        createdAt: new Date(),
      }

      // Existing like found
      ;(prisma.like.findUnique as jest.Mock).mockResolvedValue(
        mockExistingLike
      )
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.like.delete as jest.Mock).mockResolvedValue(mockExistingLike)
      ;(prisma.post.update as jest.Mock).mockResolvedValue({
        ...mockPost,
        likeCount: 5,
      })

      const result = await toggleLike('post123', 'user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.liked).toBe(false)
        expect(result.data.likeCount).toBe(5)
      }

      // Verify like was deleted
      expect(prisma.like.delete).toHaveBeenCalledWith({
        where: {
          postId_userId: {
            postId: 'post123',
            userId: 'user123',
          },
        },
      })

      // Verify post likeCount was decremented
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post123' },
        data: { likeCount: { decrement: 1 } },
      })
    })

    it('should fail when post not found', async () => {
      ;(prisma.like.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await toggleLike('nonexistent', 'user123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }

      // Should not create or delete like
      expect(prisma.like.create).not.toHaveBeenCalled()
      expect(prisma.like.delete).not.toHaveBeenCalled()
    })

    it('should fail when user not found', async () => {
      const mockPost = {
        id: 'post123',
        title: 'Test Post',
      }

      ;(prisma.like.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await toggleLike('post123', 'nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }

      expect(prisma.like.create).not.toHaveBeenCalled()
    })

    it('should return current likeCount from post', async () => {
      const mockPost = {
        id: 'post123',
        likeCount: 42,
      }

      const mockUser = {
        id: 'user123',
      }

      ;(prisma.like.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.like.create as jest.Mock).mockResolvedValue({})
      ;(prisma.post.update as jest.Mock).mockResolvedValue({
        ...mockPost,
        likeCount: 43,
      })

      const result = await toggleLike('post123', 'user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.likeCount).toBe(43)
      }
    })
  })

  describe('getLikeStatus', () => {
    it('should return true when user has liked the post', async () => {
      const mockLike = {
        id: 'like123',
        postId: 'post123',
        userId: 'user123',
      }

      ;(prisma.like.findUnique as jest.Mock).mockResolvedValue(mockLike)

      const result = await getLikeStatus('post123', 'user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.liked).toBe(true)
      }

      expect(prisma.like.findUnique).toHaveBeenCalledWith({
        where: {
          postId_userId: {
            postId: 'post123',
            userId: 'user123',
          },
        },
      })
    })

    it('should return false when user has not liked the post', async () => {
      ;(prisma.like.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getLikeStatus('post123', 'user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.liked).toBe(false)
      }
    })

    it('should work for different users on same post', async () => {
      // User1 has liked
      ;(prisma.like.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'like123',
        postId: 'post123',
        userId: 'user1',
      })

      const result1 = await getLikeStatus('post123', 'user1')
      expect(result1.success && result1.data.liked).toBe(true)

      // User2 has not liked
      ;(prisma.like.findUnique as jest.Mock).mockResolvedValueOnce(null)

      const result2 = await getLikeStatus('post123', 'user2')
      expect(result2.success && result2.data.liked).toBe(false)
    })
  })
})
