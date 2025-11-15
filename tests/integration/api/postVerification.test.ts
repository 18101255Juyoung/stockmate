/**
 * Integration tests for Post Return Rate Validation
 * Tests returnRate validation logic with real database
 */

import { prisma } from '@/lib/prisma'
import { createPost, CreatePostData } from '@/lib/services/postService'
import { verifyTestDatabase } from '../../helpers/database'

describe('Post Return Rate Validation Integration Tests', () => {
  let testUserId: string
  let testPortfolioId: string

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

    // Create test user with portfolio
    const user = await prisma.user.create({
      data: {
        email: 'posttest@test.com',
        password: 'hashedpassword',
        username: 'posttestuser',
        displayName: 'Post Test User',
        portfolio: {
          create: {
            initialCapital: 10000000,
            currentCash: 9000000,
            totalAssets: 11000000,
            totalReturn: 10.0,
          },
        },
      },
      include: {
        portfolio: true,
      },
    })

    testUserId = user.id
    testPortfolioId = user.portfolio!.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('returnRate validation', () => {
    it('should auto-verify post when returnRate matches actual holding (exact match)', async () => {
      // Create holding with avgPrice 50000, currentPrice 55000 => 10% return
      await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 50000,
          currentPrice: 55000, // +10% return
        },
      })

      const postData: CreatePostData = {
        title: 'Samsung Stock Analysis',
        content: 'My investment is doing well',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: 10.0, // Exact match
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.post.isVerified).toBe(true)
      expect(result.data.post.returnRate).toBe(10.0)
    })

    it('should auto-verify post when returnRate is within 10% tolerance', async () => {
      // Create holding with avgPrice 50000, currentPrice 55000 => 10% return
      await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 50000,
          currentPrice: 55000,
        },
      })

      const postData: CreatePostData = {
        title: 'Samsung Stock Analysis',
        content: 'My investment is doing well',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: 15.0, // Within 10% tolerance (actual 10%, claimed 15%, diff 5%)
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.post.isVerified).toBe(true)
    })

    it('should reject post when returnRate difference exceeds 10%', async () => {
      // Create holding with avgPrice 50000, currentPrice 55000 => 10% return
      await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 50000,
          currentPrice: 55000,
        },
      })

      const postData: CreatePostData = {
        title: 'Samsung Stock Analysis',
        content: 'My investment is doing well',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: 25.0, // Exceeds tolerance (actual 10%, claimed 25%, diff 15%)
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('VALIDATION_INVALID_INPUT')
      expect(result.error.message).toContain('Return rate validation failed')
      expect(result.error.message).toContain('25.00%')
      expect(result.error.message).toContain('10.00%')
    })

    it('should handle negative return rates correctly', async () => {
      // Create holding with avgPrice 50000, currentPrice 40000 => -20% return
      await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 50000,
          currentPrice: 40000,
        },
      })

      const postData: CreatePostData = {
        title: 'Samsung Stock Loss',
        content: 'Market is down',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: -20.0, // Exact match
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.post.isVerified).toBe(true)
      expect(result.data.post.returnRate).toBe(-20.0)
    })

    it('should handle negative return rate within tolerance', async () => {
      // Create holding with avgPrice 50000, currentPrice 40000 => -20% return
      await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 50000,
          currentPrice: 40000,
        },
      })

      const postData: CreatePostData = {
        title: 'Samsung Stock Loss',
        content: 'Market is down',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: -15.0, // Within tolerance (actual -20%, claimed -15%, diff 5%)
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.post.isVerified).toBe(true)
    })

    it('should reject negative return rate exceeding tolerance', async () => {
      // Create holding with avgPrice 50000, currentPrice 40000 => -20% return
      await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 50000,
          currentPrice: 40000,
        },
      })

      const postData: CreatePostData = {
        title: 'Samsung Stock Loss',
        content: 'Market is down',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: -5.0, // Exceeds tolerance (actual -20%, claimed -5%, diff 15%)
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('VALIDATION_INVALID_INPUT')
      expect(result.error.message).toContain('Return rate validation failed')
    })

    it('should not auto-verify when user does not own the stock', async () => {
      // No holding created, but post claims to own it

      const postData: CreatePostData = {
        title: 'Samsung Stock Analysis',
        content: 'My investment',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: 10.0,
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(true)
      if (!result.success) return

      // Should create post but not verify it
      expect(result.data.post.isVerified).toBe(false)
      expect(result.data.post.returnRate).toBe(10.0)
    })

    it('should not auto-verify when holding quantity is 0', async () => {
      // Create holding with 0 quantity (sold all)
      await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 0,
          avgPrice: 50000,
          currentPrice: 55000,
        },
      })

      const postData: CreatePostData = {
        title: 'Samsung Stock Analysis',
        content: 'My investment',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: 10.0,
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.post.isVerified).toBe(false)
    })

    it('should handle edge case where avgPrice is 0', async () => {
      // Create holding with avgPrice 0 (edge case, shouldn't happen in real scenario)
      await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 0,
          currentPrice: 55000,
        },
      })

      const postData: CreatePostData = {
        title: 'Samsung Stock Analysis',
        content: 'My investment',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: 0.0,
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(true)
      if (!result.success) return

      // Should verify since calculated return is 0 and claimed is 0
      expect(result.data.post.isVerified).toBe(true)
    })

    it('should allow posts without stock information', async () => {
      const postData: CreatePostData = {
        title: 'General Market Analysis',
        content: 'My thoughts on the market',
        // No stock info
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.post.isVerified).toBe(false)
      expect(result.data.post.stockCode).toBeNull()
      expect(result.data.post.returnRate).toBeNull()
    })

    it('should allow posts with stock but no returnRate', async () => {
      await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 50000,
          currentPrice: 55000,
        },
      })

      const postData: CreatePostData = {
        title: 'Samsung Stock Analysis',
        content: 'My investment',
        stockCode: '005930',
        stockName: '삼성전자',
        // No returnRate provided
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.post.isVerified).toBe(false)
      expect(result.data.post.returnRate).toBeNull()
    })

    it('should handle boundary: exactly 10% difference (should pass)', async () => {
      await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 50000,
          currentPrice: 55000, // +10% actual
        },
      })

      const postData: CreatePostData = {
        title: 'Samsung Stock Analysis',
        content: 'My investment',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: 20.0, // Exactly 10% difference
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.post.isVerified).toBe(true)
    })

    it('should handle boundary: just over 10% difference (should fail)', async () => {
      await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 50000,
          currentPrice: 55000, // +10% actual
        },
      })

      const postData: CreatePostData = {
        title: 'Samsung Stock Analysis',
        content: 'My investment',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: 20.1, // Just over 10% difference
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('VALIDATION_INVALID_INPUT')
    })

    it('should handle decimal precision correctly', async () => {
      await prisma.holding.create({
        data: {
          portfolioId: testPortfolioId,
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 10,
          avgPrice: 50000,
          currentPrice: 51234, // +2.468% actual
        },
      })

      const postData: CreatePostData = {
        title: 'Samsung Stock Analysis',
        content: 'My investment',
        stockCode: '005930',
        stockName: '삼성전자',
        returnRate: 2.47, // Close to actual
      }

      const result = await createPost(testUserId, postData)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.post.isVerified).toBe(true)
    })
  })
})
