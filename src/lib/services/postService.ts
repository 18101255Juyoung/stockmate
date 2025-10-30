/**
 * Post Service
 * Handles CRUD operations for community posts
 */

import { prisma } from '@/lib/prisma'
import { ApiResponse, ErrorCodes } from '@/lib/types/api'

/**
 * Post data for creation
 */
export interface CreatePostData {
  title: string
  content: string
  imageUrls?: string[]
}

/**
 * Post data for update
 */
export interface UpdatePostData {
  title?: string
  content?: string
  imageUrls?: string[]
}

/**
 * Options for getting posts list
 */
export interface GetPostsOptions {
  page?: number
  limit?: number
  userId?: string
  isVerified?: boolean
}

/**
 * Create a new post
 *
 * @param userId - User ID creating the post
 * @param data - Post data
 * @returns Created post
 */
export async function createPost(
  userId: string,
  data: CreatePostData
): Promise<ApiResponse<{ post: any }>> {
  try {
    // Validate required fields
    if (!data.title || data.title.trim() === '') {
      return {
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_MISSING_FIELDS,
          message: 'Title is required',
        },
      }
    }

    if (!data.content || data.content.trim() === '') {
      return {
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_MISSING_FIELDS,
          message: 'Content is required',
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

    // Create post
    const post = await prisma.post.create({
      data: {
        userId,
        title: data.title.trim(),
        content: data.content.trim(),
        imageUrls: data.imageUrls || [],
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

    return {
      success: true,
      data: { post },
    }
  } catch (error) {
    console.error('Error creating post:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to create post',
      },
    }
  }
}

/**
 * Get a single post by ID and increment view count
 *
 * @param postId - Post ID
 * @returns Post details
 */
export async function getPost(
  postId: string
): Promise<ApiResponse<{ post: any }>> {
  try {
    // Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!existingPost) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Post not found',
        },
      }
    }

    // Get post and increment view count
    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        viewCount: { increment: 1 },
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

    return {
      success: true,
      data: { post },
    }
  } catch (error) {
    console.error('Error getting post:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to get post',
      },
    }
  }
}

/**
 * Get posts list with pagination and filtering
 *
 * @param options - Query options
 * @returns Posts list with pagination info
 */
export async function getPosts(
  options: GetPostsOptions = {}
): Promise<
  ApiResponse<{
    posts: any[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }>
> {
  try {
    const page = options.page || 1
    const limit = options.limit || 10
    const skip = (page - 1) * limit

    // Build where clause for filtering
    const where: any = {}

    if (options.userId) {
      where.userId = options.userId
    }

    if (options.isVerified !== undefined) {
      where.isVerified = options.isVerified
    }

    // Get posts with pagination
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
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
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    }
  } catch (error) {
    console.error('Error getting posts:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to get posts',
      },
    }
  }
}

/**
 * Update a post
 *
 * @param postId - Post ID
 * @param userId - User ID (must be the author)
 * @param data - Update data
 * @returns Updated post
 */
export async function updatePost(
  postId: string,
  userId: string,
  data: UpdatePostData
): Promise<ApiResponse<{ post: any }>> {
  try {
    // Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!existingPost) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Post not found',
        },
      }
    }

    // Check if user is the author
    if (existingPost.userId !== userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.AUTH_UNAUTHORIZED,
          message: 'You can only update your own posts',
        },
      }
    }

    // Build update data (only include provided fields)
    const updateData: any = {}

    if (data.title !== undefined) {
      updateData.title = data.title.trim()
    }

    if (data.content !== undefined) {
      updateData.content = data.content.trim()
    }

    if (data.imageUrls !== undefined) {
      updateData.imageUrls = data.imageUrls
    }

    // Update post
    const post = await prisma.post.update({
      where: { id: postId },
      data: updateData,
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

    return {
      success: true,
      data: { post },
    }
  } catch (error) {
    console.error('Error updating post:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to update post',
      },
    }
  }
}

/**
 * Delete a post
 *
 * @param postId - Post ID
 * @param userId - User ID (must be the author)
 * @returns Deletion result
 */
export async function deletePost(
  postId: string,
  userId: string
): Promise<ApiResponse<{ deleted: boolean }>> {
  try {
    // Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!existingPost) {
      return {
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Post not found',
        },
      }
    }

    // Check if user is the author
    if (existingPost.userId !== userId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.AUTH_UNAUTHORIZED,
          message: 'You can only delete your own posts',
        },
      }
    }

    // Delete post (comments and likes will be cascade deleted)
    await prisma.post.delete({
      where: { id: postId },
    })

    return {
      success: true,
      data: { deleted: true },
    }
  } catch (error) {
    console.error('Error deleting post:', error)
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to delete post',
      },
    }
  }
}
