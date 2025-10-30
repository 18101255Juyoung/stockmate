'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PostForm from '@/components/community/PostForm'

export default function NewPostPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">새 게시글 작성</h1>
        <p className="text-gray-600">투자 인사이트를 공유해보세요</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <PostForm
          mode="create"
          onCancel={() => router.push('/community')}
        />
      </div>
    </div>
  )
}
