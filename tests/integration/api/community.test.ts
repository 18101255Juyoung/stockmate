/**
 * Integration tests for community API endpoints
 * Tests posts, comments, and likes with real database
 */

import { prisma } from '@/lib/prisma'
import {
  createPost,
  getPost,
  getPosts,
  updatePost,
  deletePost,
} from '@/lib/services/postService'
import {
  createComment,
  getComments,
  deleteComment,
} from '@/lib/services/commentService'

describe('Community API Integration Tests - Posts', () => {
  let testUser1Id: string
  let testUser2Id: string

  beforeEach(async () => {
    // Clean up database
    await prisma.like.deleteMany({})
    await prisma.comment.deleteMany({})
    await prisma.post.deleteMany({})
    await prisma.transaction.deleteMany({})
    await prisma.holding.deleteMany({})
    await prisma.portfolio.deleteMany({})
    await prisma.user.deleteMany({})

    // Create test users
    const user1 = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        password: 'hashedpassword1',
        username: 'user1',
        displayName: 'User One',
      },
    })

    const user2 = await prisma.user.create({
      data: {
        email: 'user2@example.com',
        password: 'hashedpassword2',
        username: 'user2',
        displayName: 'User Two',
      },
    })

    testUser1Id = user1.id
    testUser2Id = user2.id
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Create Post', () => {
    it('should create a post successfully', async () => {
      const result = await createPost(testUser1Id, {
        title: '삼성전자 매수 후기',
        content: '오늘 삼성전자 100주 매수했습니다. 앞으로 상승이 기대됩니다.',
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.post.title).toBe('삼성전자 매수 후기')
      expect(result.data.post.userId).toBe(testUser1Id)
      expect(result.data.post.isVerified).toBe(false)
      expect(result.data.post.likeCount).toBe(0)
      expect(result.data.post.commentCount).toBe(0)
      expect(result.data.post.viewCount).toBe(0)

      // Verify post was saved in database
      const post = await prisma.post.findUnique({
        where: { id: result.data.post.id },
      })

      expect(post).not.toBeNull()
      expect(post?.title).toBe('삼성전자 매수 후기')
    })

    it('should create post with image URLs', async () => {
      const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ]

      const result = await createPost(testUser1Id, {
        title: 'Post with images',
        content: 'This post has images',
        imageUrls,
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.post.imageUrls).toEqual(imageUrls)
    })

    it('should fail when title is empty', async () => {
      const result = await createPost(testUser1Id, {
        title: '',
        content: 'Content without title',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('VALIDATION_MISSING_FIELDS')

      // Verify no post was created
      const posts = await prisma.post.findMany({})
      expect(posts).toHaveLength(0)
    })

    it('should fail when content is empty', async () => {
      const result = await createPost(testUser1Id, {
        title: 'Title without content',
        content: '',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('VALIDATION_MISSING_FIELDS')
    })
  })

  describe('Get Post', () => {
    it('should get post and increment view count', async () => {
      // Create a post
      const createResult = await createPost(testUser1Id, {
        title: 'Test Post',
        content: 'Test Content',
      })

      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const postId = createResult.data.post.id

      // Get post first time
      const result1 = await getPost(postId)
      expect(result1.success).toBe(true)
      if (!result1.success) return

      expect(result1.data.post.viewCount).toBe(1)
      expect(result1.data.post.user.username).toBe('user1')

      // Get post second time
      const result2 = await getPost(postId)
      expect(result2.success).toBe(true)
      if (!result2.success) return

      expect(result2.data.post.viewCount).toBe(2)
    })

    it('should fail when post does not exist', async () => {
      const result = await getPost('nonexistent-id')

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
    })
  })

  describe('Get Posts List', () => {
    beforeEach(async () => {
      // Create multiple posts
      await createPost(testUser1Id, {
        title: 'Post 1 by User1',
        content: 'Content 1',
      })

      await createPost(testUser1Id, {
        title: 'Post 2 by User1',
        content: 'Content 2',
      })

      await createPost(testUser2Id, {
        title: 'Post 1 by User2',
        content: 'Content 3',
      })
    })

    it('should get all posts with pagination', async () => {
      const result = await getPosts({ page: 1, limit: 10 })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.posts).toHaveLength(3)
      expect(result.data.pagination.total).toBe(3)
      expect(result.data.pagination.page).toBe(1)
      expect(result.data.pagination.limit).toBe(10)
      expect(result.data.pagination.totalPages).toBe(1)

      // Posts should be ordered by createdAt desc (newest first)
      expect(result.data.posts[0].title).toBe('Post 1 by User2')
      expect(result.data.posts[2].title).toBe('Post 1 by User1')
    })

    it('should filter posts by userId', async () => {
      const result = await getPosts({ page: 1, limit: 10, userId: testUser1Id })

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.posts).toHaveLength(2)
      expect(result.data.posts[0].userId).toBe(testUser1Id)
      expect(result.data.posts[1].userId).toBe(testUser1Id)
    })

    it('should filter posts by isVerified', async () => {
      const result = await getPosts({
        page: 1,
        limit: 10,
        isVerified: false,
      })

      expect(result.success).toBe(true)
      if (!result.success) return

      // All posts are unverified by default
      expect(result.data.posts).toHaveLength(3)
      result.data.posts.forEach((post) => {
        expect(post.isVerified).toBe(false)
      })
    })

    it('should handle pagination correctly', async () => {
      // Get page 1 with limit 2
      const result1 = await getPosts({ page: 1, limit: 2 })
      expect(result1.success).toBe(true)
      if (!result1.success) return

      expect(result1.data.posts).toHaveLength(2)
      expect(result1.data.pagination.totalPages).toBe(2)

      // Get page 2 with limit 2
      const result2 = await getPosts({ page: 2, limit: 2 })
      expect(result2.success).toBe(true)
      if (!result2.success) return

      expect(result2.data.posts).toHaveLength(1)

      // Posts should not overlap
      const page1Ids = result1.data.posts.map((p) => p.id)
      const page2Ids = result2.data.posts.map((p) => p.id)
      expect(page1Ids).not.toContain(page2Ids[0])
    })
  })

  describe('Update Post', () => {
    it('should update post successfully', async () => {
      // Create post
      const createResult = await createPost(testUser1Id, {
        title: 'Original Title',
        content: 'Original Content',
      })

      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const postId = createResult.data.post.id

      // Update post
      const updateResult = await updatePost(postId, testUser1Id, {
        title: 'Updated Title',
        content: 'Updated Content',
      })

      expect(updateResult.success).toBe(true)
      if (!updateResult.success) return

      expect(updateResult.data.post.title).toBe('Updated Title')
      expect(updateResult.data.post.content).toBe('Updated Content')

      // Verify in database
      const post = await prisma.post.findUnique({
        where: { id: postId },
      })

      expect(post?.title).toBe('Updated Title')
      expect(post?.content).toBe('Updated Content')
    })

    it('should update only title', async () => {
      // Create post
      const createResult = await createPost(testUser1Id, {
        title: 'Original Title',
        content: 'Original Content',
      })

      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const postId = createResult.data.post.id

      // Update only title
      const updateResult = await updatePost(postId, testUser1Id, {
        title: 'New Title',
      })

      expect(updateResult.success).toBe(true)
      if (!updateResult.success) return

      expect(updateResult.data.post.title).toBe('New Title')
      expect(updateResult.data.post.content).toBe('Original Content') // Unchanged
    })

    it('should fail when user is not the author', async () => {
      // User1 creates post
      const createResult = await createPost(testUser1Id, {
        title: 'User1 Post',
        content: 'Created by User1',
      })

      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const postId = createResult.data.post.id

      // User2 tries to update
      const updateResult = await updatePost(postId, testUser2Id, {
        title: 'Hacked Title',
      })

      expect(updateResult.success).toBe(false)
      if (updateResult.success) return

      expect(updateResult.error.code).toBe('AUTH_UNAUTHORIZED')

      // Verify post was not changed
      const post = await prisma.post.findUnique({
        where: { id: postId },
      })

      expect(post?.title).toBe('User1 Post') // Original title
    })

    it('should fail when post does not exist', async () => {
      const result = await updatePost('nonexistent-id', testUser1Id, {
        title: 'New Title',
      })

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
    })
  })

  describe('Delete Post', () => {
    it('should delete post successfully', async () => {
      // Create post
      const createResult = await createPost(testUser1Id, {
        title: 'Post to delete',
        content: 'This will be deleted',
      })

      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const postId = createResult.data.post.id

      // Delete post
      const deleteResult = await deletePost(postId, testUser1Id)

      expect(deleteResult.success).toBe(true)
      if (!deleteResult.success) return

      expect(deleteResult.data.deleted).toBe(true)

      // Verify post was deleted from database
      const post = await prisma.post.findUnique({
        where: { id: postId },
      })

      expect(post).toBeNull()
    })

    it('should fail when user is not the author', async () => {
      // User1 creates post
      const createResult = await createPost(testUser1Id, {
        title: 'User1 Post',
        content: 'Created by User1',
      })

      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const postId = createResult.data.post.id

      // User2 tries to delete
      const deleteResult = await deletePost(postId, testUser2Id)

      expect(deleteResult.success).toBe(false)
      if (deleteResult.success) return

      expect(deleteResult.error.code).toBe('AUTH_UNAUTHORIZED')

      // Verify post still exists
      const post = await prisma.post.findUnique({
        where: { id: postId },
      })

      expect(post).not.toBeNull()
    })

    it('should fail when post does not exist', async () => {
      const result = await deletePost('nonexistent-id', testUser1Id)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
    })

    it('should cascade delete comments when post is deleted', async () => {
      // Create post
      const createResult = await createPost(testUser1Id, {
        title: 'Post with comments',
        content: 'This post will have comments',
      })

      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const postId = createResult.data.post.id

      // Create comment manually (commentService not yet implemented)
      await prisma.comment.create({
        data: {
          postId,
          userId: testUser2Id,
          content: 'This is a comment',
        },
      })

      // Verify comment exists
      const commentsBefore = await prisma.comment.findMany({
        where: { postId },
      })
      expect(commentsBefore).toHaveLength(1)

      // Delete post
      const deleteResult = await deletePost(postId, testUser1Id)
      expect(deleteResult.success).toBe(true)

      // Verify comments were cascade deleted
      const commentsAfter = await prisma.comment.findMany({
        where: { postId },
      })
      expect(commentsAfter).toHaveLength(0)
    })
  })
})

describe('Community API Integration Tests - Comments', () => {
  let testUser1Id: string
  let testUser2Id: string
  let testPostId: string

  beforeEach(async () => {
    // Clean up database
    await prisma.like.deleteMany({})
    await prisma.comment.deleteMany({})
    await prisma.post.deleteMany({})
    await prisma.transaction.deleteMany({})
    await prisma.holding.deleteMany({})
    await prisma.portfolio.deleteMany({})
    await prisma.user.deleteMany({})

    // Create test users
    const user1 = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        password: 'hashedpassword1',
        username: 'user1',
        displayName: 'User One',
      },
    })

    const user2 = await prisma.user.create({
      data: {
        email: 'user2@example.com',
        password: 'hashedpassword2',
        username: 'user2',
        displayName: 'User Two',
      },
    })

    testUser1Id = user1.id
    testUser2Id = user2.id

    // Create a test post
    const postResult = await createPost(testUser1Id, {
      title: 'Test Post for Comments',
      content: 'This is a test post',
    })

    if (postResult.success) {
      testPostId = postResult.data.post.id
    }
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Create Comment', () => {
    it('should create a comment successfully', async () => {
      const result = await createComment(
        testPostId,
        testUser2Id,
        'Great post!'
      )

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.comment.content).toBe('Great post!')
      expect(result.data.comment.postId).toBe(testPostId)
      expect(result.data.comment.userId).toBe(testUser2Id)
      expect(result.data.comment.user.username).toBe('user2')

      // Verify comment was saved in database
      const comment = await prisma.comment.findUnique({
        where: { id: result.data.comment.id },
      })

      expect(comment).not.toBeNull()
      expect(comment?.content).toBe('Great post!')

      // Verify post commentCount was incremented
      const post = await prisma.post.findUnique({
        where: { id: testPostId },
      })

      expect(post?.commentCount).toBe(1)
    })

    it('should fail when post not found', async () => {
      const result = await createComment(
        'nonexistent-post',
        testUser1Id,
        'Comment'
      )

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')

      // Verify no comment was created
      const comments = await prisma.comment.findMany({})
      expect(comments).toHaveLength(0)
    })

    it('should fail when content is empty', async () => {
      const result = await createComment(testPostId, testUser1Id, '')

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('VALIDATION_MISSING_FIELDS')
    })

    it('should trim whitespace from content', async () => {
      const result = await createComment(
        testPostId,
        testUser1Id,
        '  Trimmed comment  '
      )

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.comment.content).toBe('Trimmed comment')
    })
  })

  describe('Get Comments', () => {
    it('should get all comments for a post', async () => {
      // Create multiple comments
      await createComment(testPostId, testUser1Id, 'First comment')
      await createComment(testPostId, testUser2Id, 'Second comment')
      await createComment(testPostId, testUser1Id, 'Third comment')

      const result = await getComments(testPostId)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.comments).toHaveLength(3)
      expect(result.data.comments[0].content).toBe('First comment')
      expect(result.data.comments[1].content).toBe('Second comment')
      expect(result.data.comments[2].content).toBe('Third comment')

      // Verify comments are ordered by createdAt (oldest first)
      const timestamps = result.data.comments.map((c) =>
        new Date(c.createdAt).getTime()
      )
      expect(timestamps[0]).toBeLessThanOrEqual(timestamps[1])
      expect(timestamps[1]).toBeLessThanOrEqual(timestamps[2])
    })

    it('should return empty array when post has no comments', async () => {
      const result = await getComments(testPostId)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.comments).toHaveLength(0)
    })

    it('should include user information in comments', async () => {
      await createComment(testPostId, testUser1Id, 'Test comment')

      const result = await getComments(testPostId)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.data.comments[0].user).toBeDefined()
      expect(result.data.comments[0].user.username).toBe('user1')
      expect(result.data.comments[0].user.displayName).toBe('User One')
    })
  })

  describe('Delete Comment', () => {
    it('should delete comment successfully', async () => {
      // Create comment
      const createResult = await createComment(
        testPostId,
        testUser1Id,
        'Comment to delete'
      )

      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const commentId = createResult.data.comment.id

      // Verify initial commentCount
      const postBefore = await prisma.post.findUnique({
        where: { id: testPostId },
      })
      expect(postBefore?.commentCount).toBe(1)

      // Delete comment
      const deleteResult = await deleteComment(commentId, testUser1Id)

      expect(deleteResult.success).toBe(true)
      if (!deleteResult.success) return

      expect(deleteResult.data.deleted).toBe(true)

      // Verify comment was deleted from database
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      })

      expect(comment).toBeNull()

      // Verify post commentCount was decremented
      const postAfter = await prisma.post.findUnique({
        where: { id: testPostId },
      })

      expect(postAfter?.commentCount).toBe(0)
    })

    it('should fail when user is not the author', async () => {
      // User1 creates comment
      const createResult = await createComment(
        testPostId,
        testUser1Id,
        'User1 comment'
      )

      expect(createResult.success).toBe(true)
      if (!createResult.success) return

      const commentId = createResult.data.comment.id

      // User2 tries to delete
      const deleteResult = await deleteComment(commentId, testUser2Id)

      expect(deleteResult.success).toBe(false)
      if (deleteResult.success) return

      expect(deleteResult.error.code).toBe('AUTH_UNAUTHORIZED')

      // Verify comment still exists
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      })

      expect(comment).not.toBeNull()

      // Verify commentCount was not decremented
      const post = await prisma.post.findUnique({
        where: { id: testPostId },
      })

      expect(post?.commentCount).toBe(1)
    })

    it('should fail when comment does not exist', async () => {
      const result = await deleteComment('nonexistent-comment', testUser1Id)

      expect(result.success).toBe(false)
      if (result.success) return

      expect(result.error.code).toBe('NOT_FOUND')
    })
  })

  describe('Comment Count Management', () => {
    it('should correctly manage commentCount with multiple operations', async () => {
      // Initially 0 comments
      let post = await prisma.post.findUnique({ where: { id: testPostId } })
      expect(post?.commentCount).toBe(0)

      // Create 3 comments
      const comment1 = await createComment(testPostId, testUser1Id, 'Comment 1')
      const comment2 = await createComment(testPostId, testUser2Id, 'Comment 2')
      const comment3 = await createComment(testPostId, testUser1Id, 'Comment 3')

      expect(comment1.success && comment2.success && comment3.success).toBe(
        true
      )

      // Should have 3 comments
      post = await prisma.post.findUnique({ where: { id: testPostId } })
      expect(post?.commentCount).toBe(3)

      // Delete 1 comment
      if (comment2.success) {
        await deleteComment(comment2.data.comment.id, testUser2Id)
      }

      // Should have 2 comments
      post = await prisma.post.findUnique({ where: { id: testPostId } })
      expect(post?.commentCount).toBe(2)

      // Delete another comment
      if (comment1.success) {
        await deleteComment(comment1.data.comment.id, testUser1Id)
      }

      // Should have 1 comment
      post = await prisma.post.findUnique({ where: { id: testPostId } })
      expect(post?.commentCount).toBe(1)
    })
  })
})
