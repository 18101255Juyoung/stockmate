'use client'

import RankingCard from './RankingCard'

interface Ranking {
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

interface RankingListProps {
  rankings: Ranking[]
  loading?: boolean
}

export default function RankingList({ rankings, loading }: RankingListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">로딩 중...</p>
      </div>
    )
  }

  if (rankings.length === 0) {
    return (
      <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
        <p className="text-gray-600">랭킹 데이터가 없습니다.</p>
        <p className="text-sm text-gray-500 mt-2">
          거래를 시작하면 랭킹에 나타납니다!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rankings.map((ranking) => (
        <RankingCard key={ranking.id} ranking={ranking} />
      ))}
    </div>
  )
}
