/**
 * Unit tests for Post Service
 * Tests CRUD operations for community posts
 */

import {
  createPost,
  getPost,
  getPosts,
  updatePost,
  deletePost,
} from '@/lib/services/postService'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    post: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}))

describe('PostService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createPost', () => {
    it('should successfully create a post', async () => {
      const mockUser = {
        id: 'user123',
        username: 'testuser',
        displayName: '테스트유저',
      }

      const mockPost = {
        id: 'post123',
        userId: 'user123',
        title: '삼성전자 매수 후기',
        content: '오늘 삼성전자 100주 매수했습니다.',
        imageUrls: [],
        isVerified: false,
        linkedTransactionIds: [],
        likeCount: 0,
        commentCount: 0,
        viewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(prisma.post.create as jest.Mock).mockResolvedValue(mockPost)

      const result = await createPost('user123', {
        title: '삼성전자 매수 후기',
        content: '오늘 삼성전자 100주 매수했습니다.',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.post.title).toBe('삼성전자 매수 후기')
        expect(result.data.post.userId).toBe('user123')
        expect(result.data.post.imageUrls).toEqual([])
        expect(result.data.post.isVerified).toBe(false)
      }

      expect(prisma.post.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          title: '삼성전자 매수 후기',
          content: '오늘 삼성전자 100주 매수했습니다.',
          imageUrls: [],
          stockCode: undefined,
          stockName: undefined,
          returnRate: undefined,
          isVerified: false,
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
          linkedTransactions: true,
        },
      })
    })

    it('should fail when user not found', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await createPost('nonexistent', {
        title: 'Test',
        content: 'Test content',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when title is missing', async () => {
      const result = await createPost('user123', {
        title: '',
        content: 'Test content',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_MISSING_FIELDS')
      }
    })

    it('should fail when content is missing', async () => {
      const result = await createPost('user123', {
        title: 'Test title',
        content: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_MISSING_FIELDS')
      }
    })
  })

  describe('getPost', () => {
    it('should successfully get a post and increment viewCount', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
        title: '삼성전자 매수 후기',
        content: '오늘 삼성전자 100주 매수했습니다.',
        imageUrls: [],
        isVerified: false,
        linkedTransactionIds: [],
        likeCount: 5,
        commentCount: 3,
        viewCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user123',
          username: 'testuser',
          displayName: '테스트유저',
          profileImage: null,
        },
        linkedTransactions: [],
      }

      const updatedPost = { ...mockPost, viewCount: 11 }

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.post.update as jest.Mock).mockResolvedValue(updatedPost)

      const result = await getPost('post123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.post.id).toBe('post123')
        expect(result.data.post.viewCount).toBe(11)
      }

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post123' },
        data: { viewCount: { increment: 1 } },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              profileImage: true,
            },
          },
          linkedTransactions: true,
          comments: {
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
          },
        },
      })
    })

    it('should fail when post not found', async () => {
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getPost('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }
    })
  })

  describe('getPosts', () => {
    it('should successfully get posts with pagination', async () => {
      const mockPosts = [
        {
          id: 'post1',
          userId: 'user1',
          title: 'Post 1',
          content: 'Content 1',
          likeCount: 5,
          commentCount: 2,
          viewCount: 10,
          isVerified: true,
          createdAt: new Date('2025-10-29'),
          user: { username: 'user1', displayName: 'User 1' },
        },
        {
          id: 'post2',
          userId: 'user2',
          title: 'Post 2',
          content: 'Content 2',
          likeCount: 3,
          commentCount: 1,
          viewCount: 8,
          isVerified: false,
          createdAt: new Date('2025-10-28'),
          user: { username: 'user2', displayName: 'User 2' },
        },
      ]

      ;(prisma.post.findMany as jest.Mock).mockResolvedValue(mockPosts)
      ;(prisma.post.count as jest.Mock).mockResolvedValue(2)

      const result = await getPosts({ page: 1, limit: 10 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.posts).toHaveLength(2)
        expect(result.data.pagination.page).toBe(1)
        expect(result.data.pagination.limit).toBe(10)
        expect(result.data.pagination.total).toBe(2)
        expect(result.data.pagination.totalPages).toBe(1)
      }

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: {},
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
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      })
    })

    it('should filter posts by userId', async () => {
      ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.post.count as jest.Mock).mockResolvedValue(0)

      const result = await getPosts({ page: 1, limit: 10, userId: 'user123' })

      expect(result.success).toBe(true)
      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
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
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      })
    })

    it('should filter posts by isVerified', async () => {
      ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.post.count as jest.Mock).mockResolvedValue(0)

      const result = await getPosts({
        page: 1,
        limit: 10,
        isVerified: true,
      })

      expect(result.success).toBe(true)
      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: { isVerified: true },
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
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      })
    })

    it('should calculate pagination correctly for page 2', async () => {
      ;(prisma.post.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.post.count as jest.Mock).mockResolvedValue(25)

      const result = await getPosts({ page: 2, limit: 10 })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.pagination.page).toBe(2)
        expect(result.data.pagination.totalPages).toBe(3)
      }

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: {},
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
        orderBy: { createdAt: 'desc' },
        skip: 10, // (page - 1) * limit
        take: 10,
      })
    })
  })

  describe('updatePost', () => {
    it('should successfully update a post', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
        title: 'Old title',
        content: 'Old content',
      }

      const updatedPost = {
        ...mockPost,
        title: 'New title',
        content: 'New content',
        updatedAt: new Date(),
      }

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.post.update as jest.Mock).mockResolvedValue(updatedPost)

      const result = await updatePost('post123', 'user123', {
        title: 'New title',
        content: 'New content',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.post.title).toBe('New title')
        expect(result.data.post.content).toBe('New content')
      }

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post123' },
        data: {
          title: 'New title',
          content: 'New content',
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
          linkedTransactions: true,
        },
      })
    })

    it('should fail when post not found', async () => {
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await updatePost('nonexistent', 'user123', {
        title: 'New title',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }
    })

    it('should fail when user is not the author', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
        title: 'Original title',
      }

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)

      const result = await updatePost('post123', 'differentUser', {
        title: 'Hacked title',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('AUTH_UNAUTHORIZED')
      }

      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should update only provided fields', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
        title: 'Old title',
        content: 'Old content',
      }

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.post.update as jest.Mock).mockResolvedValue({
        ...mockPost,
        title: 'New title',
      })

      const result = await updatePost('post123', 'user123', {
        title: 'New title',
        // content는 업데이트 안 함
      })

      expect(result.success).toBe(true)
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post123' },
        data: {
          title: 'New title',
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
          linkedTransactions: true,
        },
      })
    })
  })

  describe('deletePost', () => {
    it('should successfully delete a post', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
        title: 'To be deleted',
        content: 'This post will be deleted',
      }

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.post.delete as jest.Mock).mockResolvedValue(mockPost)

      const result = await deletePost('post123', 'user123')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.deleted).toBe(true)
      }

      expect(prisma.post.delete).toHaveBeenCalledWith({
        where: { id: 'post123' },
      })
    })

    it('should fail when post not found', async () => {
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await deletePost('nonexistent', 'user123')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
      }

      expect(prisma.post.delete).not.toHaveBeenCalled()
    })

    it('should fail when user is not the author', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
        title: 'Original post',
      }

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)

      const result = await deletePost('post123', 'differentUser')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('AUTH_UNAUTHORIZED')
      }

      expect(prisma.post.delete).not.toHaveBeenCalled()
    })
  })
})
