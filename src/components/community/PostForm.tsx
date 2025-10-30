'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PostFormProps {
  mode: 'create' | 'edit'
  initialData?: {
    id?: string
    title: string
    content: string
  }
  onCancel?: () => void
}

export default function PostForm({
  mode,
  initialData,
  onCancel,
}: PostFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      const url =
        mode === 'create' ? '/api/posts' : `/api/posts/${initialData?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })

      if (!res.ok) {
        throw new Error('Failed to save post')
      }

      const result = await res.json()

      if (result.success) {
        router.push(`/community/${result.data.post.id}`)
        router.refresh()
      }
    } catch (error) {
      console.error('Post save error:', error)
      alert('게시글 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          제목
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="게시글 제목을 입력하세요"
          maxLength={200}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          내용
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px]"
          placeholder="투자 인사이트를 공유해주세요..."
          disabled={isSubmitting}
        />
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? '저장 중...'
            : mode === 'create'
            ? '게시하기'
            : '수정하기'}
        </button>
      </div>
    </form>
  )
}
