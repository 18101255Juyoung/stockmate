/**
 * Unit tests for Investment Verification Service
 * Tests verification of posts with linked transactions
 */

import { verifyPost } from '@/lib/services/investmentVerificationService'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
  },
}))

describe('InvestmentVerificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('verifyPost', () => {
    it('should successfully verify post with valid transactions', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
        title: 'My investment',
        isVerified: false,
      }

      const mockTransactions = [
        {
          id: 'tx1',
          userId: 'user123',
          type: 'BUY',
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 100,
        },
        {
          id: 'tx2',
          userId: 'user123',
          type: 'SELL',
          stockCode: '005930',
          stockName: '삼성전자',
          quantity: 50,
        },
      ]

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue(
        mockTransactions
      )
      ;(prisma.post.update as jest.Mock).mockResolvedValue({
        ...mockPost,
        isVerified: true,
        linkedTransactionIds: ['tx1', 'tx2'],
      })

      const result = await verifyPost('post123', ['tx1', 'tx2'])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isVerified).toBe(true)
      }

      // Verify post was updated with verification
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post123' },
        data: {
          isVerified: true,
          linkedTransactionIds: ['tx1', 'tx2'],
          linkedTransactions: {
            connect: [{ id: 'tx1' }, { id: 'tx2' }],
          },
        },
      })
    })

    it('should fail when post not found', async () => {
      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await verifyPost('nonexistent', ['tx1'])

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND')
        expect(result.error.message).toContain('Post not found')
      }

      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should fail when transaction IDs array is empty', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
      }

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)

      const result = await verifyPost('post123', [])

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_INVALID_INPUT')
        expect(result.error.message).toContain('at least one transaction')
      }

      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should fail when not all transactions exist', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
      }

      // Only tx1 exists, tx2 does not
      const mockTransactions = [
        {
          id: 'tx1',
          userId: 'user123',
        },
      ]

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue(
        mockTransactions
      )

      const result = await verifyPost('post123', ['tx1', 'tx2'])

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_INVALID_INPUT')
        expect(result.error.message).toContain('not found')
      }

      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should fail when transactions belong to different user', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
      }

      // tx1 belongs to user123, but tx2 belongs to differentUser
      const mockTransactions = [
        {
          id: 'tx1',
          userId: 'user123',
        },
        {
          id: 'tx2',
          userId: 'differentUser', // Different user!
        },
      ]

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue(
        mockTransactions
      )

      const result = await verifyPost('post123', ['tx1', 'tx2'])

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.code).toBe('AUTH_UNAUTHORIZED')
        expect(result.error.message).toContain('your own transactions')
      }

      expect(prisma.post.update).not.toHaveBeenCalled()
    })

    it('should verify with single transaction', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
      }

      const mockTransactions = [
        {
          id: 'tx1',
          userId: 'user123',
        },
      ]

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue(
        mockTransactions
      )
      ;(prisma.post.update as jest.Mock).mockResolvedValue({
        ...mockPost,
        isVerified: true,
        linkedTransactionIds: ['tx1'],
      })

      const result = await verifyPost('post123', ['tx1'])

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isVerified).toBe(true)
      }
    })

    it('should handle already verified post (re-verification)', async () => {
      const mockPost = {
        id: 'post123',
        userId: 'user123',
        isVerified: true,
        linkedTransactionIds: ['oldTx1'],
      }

      const mockTransactions = [
        {
          id: 'newTx1',
          userId: 'user123',
        },
        {
          id: 'newTx2',
          userId: 'user123',
        },
      ]

      ;(prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost)
      ;(prisma.transaction.findMany as jest.Mock).mockResolvedValue(
        mockTransactions
      )
      ;(prisma.post.update as jest.Mock).mockResolvedValue({
        ...mockPost,
        linkedTransactionIds: ['newTx1', 'newTx2'],
      })

      const result = await verifyPost('post123', ['newTx1', 'newTx2'])

      expect(result.success).toBe(true)

      // Should update with new transaction IDs
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post123' },
        data: {
          isVerified: true,
          linkedTransactionIds: ['newTx1', 'newTx2'],
          linkedTransactions: {
            connect: [{ id: 'newTx1' }, { id: 'newTx2' }],
          },
        },
      })
    })
  })
})
