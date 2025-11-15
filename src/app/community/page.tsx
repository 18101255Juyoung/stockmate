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

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function CommunityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'verified' | 'stock_recommendation'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  })

  useEffect(() => {
    fetchPosts()
  }, [filter, currentPage])

  const fetchPosts = async () => {
    setLoading(true)
    setError(null)

    try {
      let url = `/api/posts?limit=20&page=${currentPage}`

      if (filter === 'verified') {
        url += '&isVerified=true'
      } else if (filter === 'stock_recommendation') {
        url += '&hasStock=true'
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setPosts(data.data.posts)
        setPagination(data.data.pagination)
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

  const handleFilterChange = (newFilter: 'all' | 'verified' | 'stock_recommendation') => {
    setFilter(newFilter)
    setCurrentPage(1) // Reset to first page when filter changes
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null

    const pages = []
    const maxPagesToShow = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
    let endPage = Math.min(pagination.totalPages, startPage + maxPagesToShow - 1)

    // Adjust startPage if we're near the end
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div className="flex justify-center items-center gap-2 mt-8">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ◀ 이전
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2 text-gray-500">...</span>}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              currentPage === page
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < pagination.totalPages && (
          <>
            {endPage < pagination.totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
            <button
              onClick={() => handlePageChange(pagination.totalPages)}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {pagination.totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === pagination.totalPages}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          다음 ▶
        </button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
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
            onClick={() => handleFilterChange('all')}
            className={`pb-3 px-2 font-medium transition-colors ${
              filter === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => handleFilterChange('verified')}
            className={`pb-3 px-2 font-medium transition-colors ${
              filter === 'verified'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            인증글
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
        <>
          <div className="border rounded-lg bg-white overflow-hidden">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={session?.user?.id} />
            ))}
          </div>

          {/* Pagination */}
          {renderPagination()}
        </>
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
