'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import VerificationBadge from '@/components/community/VerificationBadge'
import LikeButton from '@/components/community/LikeButton'
import CommentList from '@/components/community/CommentList'
import CommentForm from '@/components/community/CommentForm'

interface Post {
  id: string
  title: string
  content: string
  user: {
    id: string
    username: string
    displayName: string
  }
  isVerified: boolean
  likeCount: number
  commentCount: number
  viewCount: number
  createdAt: string
  updatedAt: string
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    username: string
    displayName: string
  }
  userId: string
}

export default function PostDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [liked, setLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPost()
    fetchComments()
    if (session) {
      fetchLikeStatus()
    }
  }, [postId, session])

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`)
      const data = await response.json()

      if (data.success) {
        setPost(data.data.post)
      } else {
        setError(data.error?.message || '게시글을 불러오는데 실패했습니다')
      }
    } catch (err) {
      setError('게시글을 불러오는 중 오류가 발생했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`)
      const data = await response.json()

      if (data.success) {
        setComments(data.data.comments)
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err)
    }
  }

  const fetchLikeStatus = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`)
      const data = await response.json()

      if (data.success) {
        setLiked(data.data.liked)
      }
    } catch (err) {
      console.error('Failed to fetch like status:', err)
    }
  }

  const handleDelete = async () => {
    if (!confirm('게시글을 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        router.push('/community')
      } else {
        alert(data.error?.message || '게시글 삭제에 실패했습니다')
      }
    } catch (err) {
      alert('게시글 삭제 중 오류가 발생했습니다')
      console.error(err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || '게시글을 찾을 수 없습니다'}
        </div>
        <Link
          href="/community"
          className="text-blue-600 hover:text-blue-800"
        >
          ← 커뮤니티로 돌아가기
        </Link>
      </div>
    )
  }

  const isAuthor = session?.user?.id === post.user.id

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/community"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          커뮤니티로 돌아가기
        </Link>
      </div>

      {/* Post Content */}
      <article className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        {/* Header */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {post.title}
              {post.isVerified && <VerificationBadge />}
            </h1>
            {isAuthor && (
              <div className="flex gap-2">
                <Link
                  href={`/community/${post.id}/edit`}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  수정
                </Link>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                >
                  삭제
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <Link
              href={`/profile/${post.user.username}`}
              className="font-medium hover:text-gray-900"
            >
              {post.user.displayName} (@{post.user.username})
            </Link>
            <span>{formatDate(post.createdAt)}</span>
            {post.updatedAt !== post.createdAt && (
              <span className="text-gray-400">(수정됨)</span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>조회 {post.viewCount.toLocaleString()}</span>
            <span>댓글 {post.commentCount.toLocaleString()}</span>
            <span>좋아요 {post.likeCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Content */}
        <div className="prose max-w-none mb-6">
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
          <LikeButton
            postId={post.id}
            initialLiked={liked}
            initialLikeCount={post.likeCount}
          />
        </div>
      </article>

      {/* Comments Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-6">
          댓글 {comments.length.toLocaleString()}개
        </h2>

        {/* Comment Form */}
        <div className="mb-8">
          <CommentForm postId={post.id} onCommentAdded={fetchComments} />
        </div>

        {/* Comment List */}
        <CommentList postId={post.id} initialComments={comments} />
      </div>
    </div>
  )
}
