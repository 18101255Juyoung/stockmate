'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RankingPeriodSelector from '@/components/ranking/RankingPeriodSelector'
import RankingList from '@/components/ranking/RankingList'

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

interface MyRank {
  rank: number | null
  totalReturn?: number
  period?: string
  user?: {
    id: string
    username: string
    displayName: string
    profileImage: string | null
  }
}

export default function RankingPage() {
  const { data: session } = useSession()
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'ALL_TIME'>('ALL_TIME')
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [myRank, setMyRank] = useState<MyRank | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRankings()
    if (session) {
      loadMyRank()
    }
  }, [period, session])

  const loadRankings = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/ranking?period=${period}&limit=100`)
      const data = await response.json()

      if (data.success) {
        setRankings(data.data.rankings)
      }
    } catch (error) {
      console.error('Failed to load rankings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMyRank = async () => {
    try {
      const response = await fetch(`/api/ranking/me?period=${period}`)
      const data = await response.json()

      if (data.success) {
        setMyRank(data.data)
      }
    } catch (error) {
      console.error('Failed to load my rank:', error)
    }
  }

  const formatPercent = (num: number) => {
    return num >= 0 ? `+${num.toFixed(2)}%` : `${num.toFixed(2)}%`
  }

  const getReturnColor = (value: number) => {
    if (value > 0) return 'text-red-600' // Red for gains (Korean convention)
    if (value < 0) return 'text-blue-600' // Blue for losses (Korean convention)
    return 'text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">투자 랭킹</h1>

        {/* Period Selector */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <RankingPeriodSelector
            selectedPeriod={period}
            onPeriodChange={setPeriod}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Rankings List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>상위 랭킹</CardTitle>
              </CardHeader>
              <CardContent>
                <RankingList rankings={rankings} loading={loading} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* My Rank Card */}
            {session && (
              <Card>
                <CardHeader>
                  <CardTitle>내 순위</CardTitle>
                </CardHeader>
                <CardContent>
                  {myRank && myRank.rank ? (
                    <div className="text-center py-4">
                      <div className="text-5xl font-bold text-blue-600 mb-2">
                        #{myRank.rank}
                      </div>
                      <div className="text-sm text-gray-600 mb-4">
                        {period === 'WEEKLY' && '주간 순위'}
                        {period === 'MONTHLY' && '월간 순위'}
                        {period === 'ALL_TIME' && '전체 순위'}
                      </div>
                      {myRank.totalReturn !== undefined && (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">수익률</p>
                          <p
                            className={`text-2xl font-bold ${getReturnColor(myRank.totalReturn)}`}
                          >
                            {formatPercent(myRank.totalReturn)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>아직 순위권에 들지 못했습니다.</p>
                      <p className="text-sm mt-2">
                        거래를 시작하고 수익을 올려보세요!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>랭킹 안내</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p>• 포트폴리오 수익률을 기준으로 순위가 매겨집니다.</p>
                <p>• 상위 100명만 랭킹에 표시됩니다.</p>
                <p>• 랭킹은 매일 자동으로 업데이트됩니다.</p>
                <p>• 주간/월간 랭킹은 해당 기간의 실제 수익률을 기준으로 계산됩니다.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

