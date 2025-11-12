'use client'

import Link from 'next/link'
import Image from 'next/image'
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
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <Link href={`/community/${post.id}`}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                {post.user.displayName}
              </span>
              <span className="text-sm text-gray-500">
                @{post.user.username}
              </span>
              {post.isVerified && <VerificationBadge />}
            </div>
            <span className="text-sm text-gray-500">
              {formatDate(post.createdAt)}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 hover:text-blue-600">
            {post.title}
          </h3>

          {/* Holding Badge */}
          {post.stockCode && post.stockName && post.returnRate != null && (
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
                post.returnRate >= 0
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              <span className="font-semibold">{post.stockName}</span>
              <span className="text-xs text-gray-600">({post.stockCode})</span>
              <span className="font-bold">
                {post.returnRate >= 0 ? '+' : ''}
                {post.returnRate.toFixed(2)}%
              </span>
            </div>
          )}

          {/* Content Preview */}
          <p className="text-gray-700 line-clamp-2">{post.content}</p>

          {/* Image Preview */}
          {post.imageUrls && post.imageUrls.length > 0 && (
            <div className="relative w-full h-48 rounded-md overflow-hidden bg-gray-100">
              <Image
                src={post.imageUrls[0]}
                alt={post.title}
                fill
                className="object-cover"
              />
              {post.imageUrls.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  +{post.imageUrls.length - 1}
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>👁️ {post.viewCount}</span>
            <span>💬 {post.commentCount}</span>
            <span>❤️ {post.likeCount}</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
