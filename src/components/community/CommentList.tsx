'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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

interface CommentListProps {
  postId: string
  initialComments: Comment[]
}

export default function CommentList({
  postId,
  initialComments,
}: CommentListProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>(initialComments)

  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) {
      return
    }

    try {
      const res = await fetch(
        `/api/posts/${postId}/comments/${commentId}`,
        {
          method: 'DELETE',
        }
      )

      if (!res.ok) {
        throw new Error('Failed to delete comment')
      }

      const result = await res.json()

      if (result.success) {
        setComments(comments.filter((c) => c.id !== commentId))
        router.refresh()
      }
    } catch (error) {
      console.error('Delete comment error:', error)
      alert('댓글 삭제 중 오류가 발생했습니다.')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '방금 전'
    if (minutes < 60) return `${minutes}분 전`
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return date.toLocaleDateString('ko-KR')
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        첫 댓글을 작성해보세요!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="border-b border-gray-200 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">
                  {comment.user.displayName}
                </span>
                <span className="text-sm text-gray-500">
                  @{comment.user.username}
                </span>
                <span className="text-sm text-gray-400">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
            {session?.user?.id === comment.userId && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                삭제
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
