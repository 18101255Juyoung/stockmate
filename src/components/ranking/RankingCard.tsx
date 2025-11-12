'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'

interface RankingCardProps {
  ranking: {
    id: string
    userId: string
    rank: number
    totalReturn: number
    period: string
    updatedAt: Date
    user: {
      id: string
      username: string
      displayName: string
      profileImage: string | null
    }
  }
}

export default function RankingCard({ ranking }: RankingCardProps) {
  const { data: session } = useSession()
  const isCurrentUser = session?.user?.id === ranking.userId

  const formatPercent = (num: number) => {
    return num >= 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`
  }

  const getReturnColor = (value: number) => {
    if (value > 0) return 'text-red-600' // Red for gains (Korean convention)
    if (value < 0) return 'text-blue-600' // Blue for losses (Korean convention)
    return 'text-gray-600'
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (rank === 2) return 'bg-gray-100 text-gray-800 border-gray-300'
    if (rank === 3) return 'bg-orange-100 text-orange-800 border-orange-300'
    return 'bg-gray-50 text-gray-700 border-gray-200'
  }

  const getRankMedal = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Link
      href={`/profile/${ranking.user.username}`}
      className={`block border rounded-lg p-4 hover:shadow-md transition-all ${
        isCurrentUser ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        {/* Rank and User Info */}
        <div className="flex items-center gap-4 flex-1">
          {/* Rank */}
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-full border-2 font-bold text-lg ${getRankBadgeColor(ranking.rank)}`}
          >
            {getRankMedal(ranking.rank) || `#${ranking.rank}`}
          </div>

          {/* Profile Image */}
          <div className="flex-shrink-0">
            {ranking.user.profileImage ? (
              <Image
                src={ranking.user.profileImage}
                alt={ranking.user.displayName}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                {getInitials(ranking.user.displayName)}
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-lg truncate">
                {ranking.user.displayName}
              </p>
              {isCurrentUser && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  내 순위
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">@{ranking.user.username}</p>
          </div>
        </div>

        {/* Return Percentage */}
        <div className="text-right">
          <p className="text-sm text-gray-600 mb-1">수익률</p>
          <p
            className={`text-2xl font-bold ${getReturnColor(ranking.totalReturn)}`}
          >
            {formatPercent(ranking.totalReturn)}
          </p>
        </div>
      </div>
    </Link>
  )
}
