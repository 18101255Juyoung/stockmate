/**
 * Like Service
 * Handles like/unlike toggle functionality
 */

import { prisma } from '@/lib/prisma'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'

/**
 * Toggle like on a post
 * - If user hasn't liked: Add like and increment likeCount
 * - If user has liked: Remove like and decrement likeCount
 *
 * @param postId - Post ID
 * @param userId - User ID
 * @returns Toggle result with liked status and new likeCount
 */
export async function toggleLike(
  postId: string,
  userId: string
): Promise<ApiResponse<{ liked: boolean; likeCount: number }>> {
  try {
    // Check if like already exists
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    })

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

    if (existingLike) {
      // Unlike: Remove like and decrement count
      await prisma.like.delete({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      })

      // Decrement post likeCount
      const updatedPost = await prisma.post.update({
        where: { id: postId },
        data: {
          likeCount: { decrement: 1 },
        },
      })

      return {
        success: true,
        data: {
          liked: false,
          likeCount: updatedPost.likeCount,
        },
      }
    } else {
      // Like: Check if user exists, then add like and increment count
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCodes.NOT_FOUND,
            message: 'User not found',
          },
        }
      }

      // Create like
      await prisma.like.create({
        data: {
          postId,
          userId,
        },
      })

      // Increment post likeCount
      const updatedPost = await prisma.post.update({
        where: { id: postId },
        data: {
          likeCount: { increment: 1 },
        },
      })

      return {
        success: true,
        data: {
          liked: true,
          likeCount: updatedPost.likeCount,
        },
      }
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to toggle like',
      },
    }
  }
}

/**
 * Get like status for a user on a post
 *
 * @param postId - Post ID
 * @param userId - User ID
 * @returns Whether the user has liked the post
 */
export async function getLikeStatus(
  postId: string,
  userId: string
): Promise<ApiResponse<{ liked: boolean }>> {
  try {
    const like = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    })

    return {
      success: true,
      data: {
        liked: !!like,
      },
    }
  } catch (error) {
    console.error('Error getting like status:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to get like status',
      },
    }
  }
}
