'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface CommentFormProps {
  postId: string
  onCommentAdded?: () => void
}

export default function CommentForm({
  postId,
  onCommentAdded,
}: CommentFormProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session) {
      router.push('/login')
      return
    }

    if (!content.trim()) {
      alert('댓글 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!res.ok) {
        throw new Error('Failed to create comment')
      }

      const result = await res.json()

      if (result.success) {
        setContent('')
        router.refresh()
        if (onCommentAdded) {
          onCommentAdded()
        }
      }
    } catch (error) {
      console.error('Comment creation error:', error)
      alert('댓글 작성 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session) {
    return (
      <div className="text-center py-4">
        <button
          onClick={() => router.push('/login')}
          className="text-blue-600 hover:text-blue-800"
        >
          로그인하고 댓글 작성하기
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="댓글을 입력하세요..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
        disabled={isSubmitting}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '작성 중...' : '댓글 작성'}
        </button>
      </div>
    </form>
  )
}
