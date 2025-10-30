/**
 * Comment Service
 * Handles comment operations (create, get, delete)
 */

import { prisma } from '@/lib/prisma'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'

/**
 * Create a new comment on a post
 *
 * @param postId - Post ID
 * @param userId - User ID creating the comment
 * @param content - Comment content
 * @returns Created comment
 */
export async function createComment(
  postId: string,
  userId: string,
  content: string
): Promise<ApiResponse<{ comment: any }>> {
  try {
    // Validate content
    if (!content || content.trim() === '') {
      return {
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_MISSING_FIELDS,
          message: 'Comment content is required',
        },
      }
    }

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

    // Check if user exists
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

    // Create comment and increment post commentCount
    const comment = await prisma.comment.create({
      data: {
        postId,
        userId,
        content: content.trim(),
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

    // Increment post commentCount
    await prisma.post.update({
      where: { id: postId },
      data: {
        commentCount: { increment: 1 },
      },
    })

    return {
      success: true,
      data: { comment },
    }
  } catch (error) {
    console.error('Error creating comment:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to create comment',
      },
    }
  }
}

/**
 * Get all comments for a post
 *
 * @param postId - Post ID
 * @returns List of comments ordered by createdAt (oldest first)
 */
export async function getComments(
  postId: string
): Promise<ApiResponse<{ comments: any[] }>> {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId },
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

    return {
      success: true,
      data: { comments },
    }
  } catch (error) {
    console.error('Error getting comments:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to get comments',
      },
    }
  }
}

/**
 * Delete a comment
 *
 * @param commentId - Comment ID
 * @param userId - User ID (must be the author)
 * @returns Deletion result
 */
export async function deleteComment(
  commentId: string,
  userId: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  try {
    // Check if comment exists
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    })

    if (!existingComment) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Comment not found',
        },
      }
    }

    // Check if user is the author
    if (existingComment.userId !== userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.AUTH_UNAUTHORIZED,
          message: 'You can only delete your own comments',
        },
      }
    }

    // Delete comment
    await prisma.comment.delete({
      where: { id: commentId },
    })

    // Decrement post commentCount
    await prisma.post.update({
      where: { id: existingComment.postId },
      data: {
        commentCount: { decrement: 1 },
      },
    })

    return {
      success: true,
      data: { deleted: true },
    }
  } catch (error) {
    console.error('Error deleting comment:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to delete comment',
      },
    }
  }
}
