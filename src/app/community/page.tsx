'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PostCard from '@/components/community/PostCard'
import Link from 'next/link'

interface Post {
  id: string
  title: string
  content: string
  user: {
    username: string
    displayName: string
  }
  isVerified: boolean
  likeCount: number
  commentCount: number
  viewCount: number
  createdAt: string
}

export default function CommunityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'verified'>('all')

  useEffect(() => {
    fetchPosts()
  }, [filter])

  const fetchPosts = async () => {
    setLoading(true)
    setError(null)

    try {
      const url =
        filter === 'verified'
          ? '/api/posts?isVerified=true&limit=20'
          : '/api/posts?limit=20'

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setPosts(data.data.posts)
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">커뮤니티</h1>
          <p className="text-gray-600">투자 인사이트를 공유하고 소통하세요</p>
        </div>
        {session && (
          <Link
            href="/community/new"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            글쓰기
          </Link>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`pb-3 px-2 font-medium transition-colors ${
              filter === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilter('verified')}
            className={`pb-3 px-2 font-medium transition-colors ${
              filter === 'verified'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            인증됨
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-600">게시글을 불러오는 중...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Posts List */}
      {!loading && !error && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={session?.user?.id} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-600 mb-2">게시글이 없습니다</p>
          <p className="text-sm text-gray-500 mb-4">
            첫 게시글을 작성해보세요!
          </p>
          {session && (
            <Link
              href="/community/new"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              글쓰기
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

