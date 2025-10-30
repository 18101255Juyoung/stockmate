/**
 * Unit tests for Comment Service
 * Tests comment creation, retrieval, and deletion
 */

import {
  createComment,
  getComments,
  deleteComment,
} from '@/lib/services/commentService'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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

describe('CommentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createComment', () => {
    it('should successfully create a comment and increment post commentCount', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
        title: 'Test Post',
        commentCount: 5,
      }

      const mockUser = {
        id: 'user456',
        username: 'commenter',
        displayName: 'Commenter User',
      }

      const mockComment = {
        id: 'comment123',
        postId: 'post123',
        userId: 'user456',
        content: 'Great post!',
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user456',
          username: 'commenter',
          displayName: 'Commenter User',
          profileImage: null,
        },
      }

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.comment.create as jest.Mock).mockResolvedValue(mockComment)
      ;(prisma.post.update as jest.Mock).mockResolvedValue({
        ...mockPost,
        commentCount: 6,
      })

      const result = await createComment('post123', 'user456', 'Great post!')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.comment.content).toBe('Great post!')
        expect(result.data.comment.postId).toBe('post123')
        expect(result.data.comment.userId).toBe('user456')
      }

      // Verify commentCount was incremented
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post123' },
        data: { commentCount: { increment: 1 } },
      })
    })

    it('should fail when post not found', async () => {
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await createComment(
        'nonexistent',
        'user123',
        'Test comment'
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }

      // Should not create comment or update post
      expect(prisma.comment.create).not.toHaveBeenCalled()
      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should fail when user not found', async () => {
      const mockPost = {
        id: 'post123',
        title: 'Test Post',
      }

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await createComment(
        'post123',
        'nonexistent',
        'Test comment'
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }

      expect(prisma.comment.create).not.toHaveBeenCalled()
    })

    it('should fail when content is empty', async () => {
      const result = await createComment('post123', 'user123', '')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_MISSING_FIELDS')
      }

      expect(prisma.comment.create).not.toHaveBeenCalled()
    })

    it('should trim whitespace from content', async () => {
      const mockPost = {
        id: 'post123',
        commentCount: 0,
      }

      const mockUser = {
        id: 'user123',
        username: 'user',
      }

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.comment.create as jest.Mock).mockResolvedValue({
        id: 'comment123',
        content: 'Trimmed content',
      })
      ;(prisma.post.update as jest.Mock).mockResolvedValue(mockPost)

      const result = await createComment(
        'post123',
        'user123',
        '  Trimmed content  '
      )

      expect(result.success).toBe(true)
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: {
          postId: 'post123',
          userId: 'user123',
          content: 'Trimmed content',
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
  })

  describe('getComments', () => {
    it('should get all comments for a post', async () => {
      const mockComments = [
        {
          id: 'comment1',
          postId: 'post123',
          userId: 'user1',
          content: 'First comment',
          createdAt: new Date('2025-10-29T10:00:00Z'),
          user: {
            id: 'user1',
            username: 'user1',
            displayName: 'User One',
          },
        },
        {
          id: 'comment2',
          postId: 'post123',
          userId: 'user2',
          content: 'Second comment',
          createdAt: new Date('2025-10-29T11:00:00Z'),
          user: {
            id: 'user2',
            username: 'user2',
            displayName: 'User Two',
          },
        },
      ]

      ;(prisma.comment.findMany as jest.Mock).mockResolvedValue(mockComments)

      const result = await getComments('post123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.comments).toHaveLength(2)
        expect(result.data.comments[0].content).toBe('First comment')
        expect(result.data.comments[1].content).toBe('Second comment')
      }

      expect(prisma.comment.findMany).toHaveBeenCalledWith({
        where: { postId: 'post123' },
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
        orderBy: { createdAt: 'asc' },
      })
    })

    it('should return empty array when no comments', async () => {
      ;(prisma.comment.findMany as jest.Mock).mockResolvedValue([])

      const result = await getComments('post123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.comments).toHaveLength(0)
      }
    })
  })

  describe('deleteComment', () => {
    it('should successfully delete a comment and decrement post commentCount', async () => {
      const mockComment = {
        id: 'comment123',
        postId: 'post123',
        userId: 'user123',
        content: 'To be deleted',
      }

      const mockPost = {
        id: 'post123',
        commentCount: 5,
      }

      ;(prisma.comment.findUnique as jest.Mock).mockResolvedValue(mockComment)
      ;(prisma.comment.delete as jest.Mock).mockResolvedValue(mockComment)
      ;(prisma.post.update as jest.Mock).mockResolvedValue({
        ...mockPost,
        commentCount: 4,
      })

      const result = await deleteComment('comment123', 'user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.deleted).toBe(true)
      }

      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment123' },
      })

      // Verify commentCount was decremented
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post123' },
        data: { commentCount: { decrement: 1 } },
      })
    })

    it('should fail when comment not found', async () => {
      ;(prisma.comment.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await deleteComment('nonexistent', 'user123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }

      expect(prisma.comment.delete).not.toHaveBeenCalled()
      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should fail when user is not the author', async () => {
      const mockComment = {
        id: 'comment123',
        postId: 'post123',
        userId: 'user123',
        content: 'Comment by user123',
      }

      ;(prisma.comment.findUnique as jest.Mock).mockResolvedValue(mockComment)

      const result = await deleteComment('comment123', 'differentUser')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('AUTH_UNAUTHORIZED')
      }

      expect(prisma.comment.delete).not.toHaveBeenCalled()
      expect(prisma.post.update).not.toHaveBeenCalled()
    })
  })
})
