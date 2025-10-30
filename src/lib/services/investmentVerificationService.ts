/**
 * Investment Verification Service
 * Verifies posts by linking them to real transactions
 */

import { prisma } from '@/lib/prisma'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'

/**
 * Verify a post by linking it to user's transactions
 * - Checks if all transactions exist
 * - Verifies all transactions belong to the post author
 * - Sets isVerified to true and updates linkedTransactionIds
 *
 * @param postId - Post ID to verify
 * @param transactionIds - Array of transaction IDs to link
 * @returns Verification result
 */
export async function verifyPost(
  postId: string,
  transactionIds: string[]
): Promise<ApiResponse<{ isVerified: boolean }>> {
  try {
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Post not found',
        },
      }
    }

    // Validate transaction IDs array
    if (!transactionIds || transactionIds.length === 0) {
      return {
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_INVALID_INPUT,
          message: 'Please provide at least one transaction to verify',
        },
      }
    }

    // Fetch all transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
      },
    })

    // Check if all transactions exist
    if (transactions.length !== transactionIds.length) {
      return {
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_INVALID_INPUT,
          message: 'One or more transactions not found',
        },
      }
    }

    // Check if all transactions belong to the post author
    const allBelongToAuthor = transactions.every(
      (tx) => tx.userId === post.userId
    )

    if (!allBelongToAuthor) {
      return {
        success: false,
        error: {
          code: ErrorCodes.AUTH_UNAUTHORIZED,
          message: 'You can only link your own transactions',
        },
      }
    }

    // Verify post: Set isVerified to true and link transactions
    await prisma.post.update({
      where: { id: postId },
      data: {
        isVerified: true,
        linkedTransactionIds: transactionIds,
        linkedTransactions: {
          connect: transactionIds.map((id) => ({ id })),
        },
      },
    })

    return {
      success: true,
      data: {
        isVerified: true,
      },
    }
  } catch (error) {
    console.error('Error verifying post:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to verify post',
      },
    }
  }
}
