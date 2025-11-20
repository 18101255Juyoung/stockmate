'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import RankingPeriodSelector from '@/components/ranking/RankingPeriodSelector'
import RankingList from '@/components/ranking/RankingList'

type League = 'ROOKIE' | 'HALL_OF_FAME'

interface Ranking {
  id: string
  userId: string
  rank: number
  totalReturn: number
  period: string
  league: string
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
  league?: string
  user?: {
    id: string
    username: string
    displayName: string
    profileImage: string | null
    league: string
  }
}

export default function RankingPage() {
  const { data: session } = useSession()
  const [league, setLeague] = useState<League>('ROOKIE')
  const [period, setPeriod] = useState<'WEEKLY' | 'MONTHLY' | 'ALL_TIME'>('ALL_TIME')
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [myRank, setMyRank] = useState<MyRank | null>(null)
  const [loading, setLoading] = useState(true)

  const loadRankings = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/ranking?period=${period}&league=${league}&limit=100`)
      const data = await response.json()

      if (data.success) {
        setRankings(data.data.rankings)
      }
    } catch (error) {
      console.error('Failed to load rankings:', error)
    } finally {
      setLoading(false)
    }
  }, [period, league])

  const loadMyRank = useCallback(async () => {
    try {
      const response = await fetch(`/api/ranking/me?period=${period}`)
      const data = await response.json()

      if (data.success) {
        setMyRank(data.data)
      }
    } catch (error) {
      console.error('Failed to load my rank:', error)
    }
  }, [period])

  useEffect(() => {
    loadRankings()
    if (session) {
      loadMyRank()
    }
  }, [period, session, loadRankings, loadMyRank])

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

        {/* League Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-4">
          <div className="grid grid-cols-2 border-b">
            <button
              onClick={() => setLeague('ROOKIE')}
              className={`py-4 px-6 text-center font-medium transition-colors ${
                league === 'ROOKIE'
                  ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              🌱 루키 리그
              <span className="text-xs block text-gray-500 mt-1">자산 1억 미만</span>
            </button>
            <button
              onClick={() => setLeague('HALL_OF_FAME')}
              className={`py-4 px-6 text-center font-medium transition-colors ${
                league === 'HALL_OF_FAME'
                  ? 'text-yellow-600 border-b-2 border-yellow-600 bg-yellow-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              👑 명예의 전당
              <span className="text-xs block text-gray-500 mt-1">자산 1억 이상</span>
            </button>
          </div>
        </div>

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
                  {myRank && myRank.user && (
                    <div className="mb-4 text-center">
                      <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-gray-100 to-gray-200">
                        {myRank.user.league === 'ROOKIE' ? '🌱 루키 리그' : '👑 명예의 전당'}
                      </div>
                    </div>
                  )}
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
              <CardContent className="text-sm text-gray-600 space-y-3">
                <div>
                  <p className="font-medium text-gray-800 mb-1">📊 리그 시스템</p>
                  <p>• 🌱 루키 리그: 총 자산 1억 미만</p>
                  <p>• 👑 명예의 전당: 총 자산 1억 이상</p>
                  <p className="text-xs text-gray-500 mt-1">매일 자정에 자동 분류됩니다</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-1">🏆 월간 보상</p>
                  <p>• 루키 1-10위: +1,000만원</p>
                  <p>• 루키 11-100위: +500만원</p>
                </div>
                <div>
                  <p className="font-medium text-gray-800 mb-1">📈 랭킹 방식</p>
                  <p>• 각 리그는 독립적으로 운영됩니다</p>
                  <p>• 각 리그별 상위 100명만 표시됩니다</p>
                  <p>• 수익률 기준으로 순위가 매겨집니다</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

