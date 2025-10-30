'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import PostForm from '@/components/community/PostForm'

export default function EditPostPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    fetchPost()
  }, [status, postId, router])

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`)
      const data = await response.json()

      if (data.success) {
        // Check if user is the author
        if (data.data.post.user.id !== session?.user?.id) {
          setError('수정 권한이 없습니다')
          return
        }
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

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800"
        >
          ← 돌아가기
        </button>
      </div>
    )
  }

  if (!post) {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">게시글 수정</h1>
        <p className="text-gray-600">게시글을 수정하세요</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <PostForm
          mode="edit"
          initialData={{
            id: post.id,
            title: post.title,
            content: post.content,
          }}
          onCancel={() => router.push(`/community/${postId}`)}
        />
      </div>
    </div>
  )
}
