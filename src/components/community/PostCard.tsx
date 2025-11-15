'use client'

import Link from 'next/link'
import VerificationBadge from './VerificationBadge'

interface PostCardProps {
  post: {
    id: string
    title: string
    content: string
    imageUrls?: string[]
    stockCode?: string | null
    stockName?: string | null
    returnRate?: number | null
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
  currentUserId?: string
}

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <Link href={`/community/${post.id}`}>
      <div className="border-b py-3 px-2 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          {/* 제목 + 인증 마크 */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <h3 className="text-base font-medium text-gray-900 hover:text-blue-600 truncate">
              {post.title}
            </h3>
            {post.isVerified && (
              <div className="flex-shrink-0">
                <VerificationBadge />
              </div>
            )}
          </div>

          {/* 메타 정보 */}
          <div className="flex items-center gap-3 text-sm text-gray-500 flex-shrink-0">
            <span className="hidden sm:inline">{post.user.displayName}</span>
            <span className="hidden md:inline">{formatDate(post.createdAt)}</span>
            <span className="whitespace-nowrap">조회 {post.viewCount}</span>
            <span className="whitespace-nowrap">댓글 {post.commentCount}</span>
            <span className="whitespace-nowrap">좋아요 {post.likeCount}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
