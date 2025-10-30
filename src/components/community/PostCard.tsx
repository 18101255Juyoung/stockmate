'use client'

import Link from 'next/link'
import VerificationBadge from './VerificationBadge'

interface PostCardProps {
  post: {
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
        <div className="space-y-2">
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

          {/* Content Preview */}
          <p className="text-gray-700 line-clamp-2">{post.content}</p>

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
