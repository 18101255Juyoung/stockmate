'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Holding {
  id: string
  stockCode: string
  stockName: string
  quantity: number
  avgPrice: number
  currentPrice: number
}

interface Portfolio {
  id: string
  userId: string
  initialCapital: number
  currentCash: number
  totalAssets: number
  totalReturn: number
  realizedPL: number
  unrealizedPL: number
  holdings: Holding[]
}

interface PortfolioHistoryPoint {
  date: string
  cash: number
  totalAssets: number
  return: number
}

type Period = '7d' | '30d' | '90d' | '1y' | 'all'

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [testUserId, setTestUserId] = useState('')
  const [inputUserId, setInputUserId] = useState('')
  const [history, setHistory] = useState<PortfolioHistoryPoint[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30d')

  // 포트폴리오 조회
  const fetchPortfolio = async (userId: string) => {
    if (!userId.trim()) {
      setError('User ID를 입력해주세요')
      return
    }

    setLoading(true)
    setError(null)
    setPortfolio(null)

    try {
      const response = await fetch(`/api/portfolio?userId=${encodeURIComponent(userId)}`)
      const data = await response.json()

      if (data.success) {
        setPortfolio(data.data.portfolio)
        setTestUserId(userId)
        // 포트폴리오 조회 성공 시 히스토리도 가져오기
        fetchPortfolioHistory(userId, selectedPeriod)
      } else {
        setError(data.error?.message || '포트폴리오를 가져오는데 실패했습니다')
      }
    } catch (err) {
      setError('포트폴리오를 가져오는 중 오류가 발생했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 포트폴리오 히스토리 조회
  const fetchPortfolioHistory = async (userId: string, period: Period) => {
    setHistoryLoading(true)
    try {
      const response = await fetch(
        `/api/portfolio/history?userId=${encodeURIComponent(userId)}&period=${period}`
      )
      const data = await response.json()

      if (data.success) {
        setHistory(data.data.history)
      } else {
        console.error('Failed to fetch history:', data.error)
        setHistory([])
      }
    } catch (err) {
      console.error('History fetch error:', err)
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  // Period 변경 시 히스토리 다시 가져오기
  useEffect(() => {
    if (testUserId) {
      fetchPortfolioHistory(testUserId, selectedPeriod)
    }
  }, [selectedPeriod, testUserId])

  // 페이지 로드 시 로컬스토리지에서 userId 불러오기
  useEffect(() => {
    const savedUserId = localStorage.getItem('testUserId')
    if (savedUserId) {
      setInputUserId(savedUserId)
      fetchPortfolio(savedUserId)
    } else {
      setLoading(false)
    }
  }, [])

  // userId 저장 및 조회
  const handleFetchPortfolio = () => {
    localStorage.setItem('testUserId', inputUserId)
    fetchPortfolio(inputUserId)
  }

  // Enter 키로 조회
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFetchPortfolio()
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">내 포트폴리오</h1>

      {/* 테스트용 User ID 입력 */}
      <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800 mb-3">
          ⚠️ 테스트용: 인증 시스템 구현 전까지 User ID를 직접 입력해주세요
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputUserId}
            onChange={(e) => setInputUserId(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="User ID 입력 (예: test-user-123)"
            className="flex-1 px-4 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <button
            onClick={handleFetchPortfolio}
            disabled={loading}
            className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '조회 중...' : '조회'}
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 포트폴리오 요약 */}
      {portfolio && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* 총 자산 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-2">총 자산</div>
              <div className="text-2xl font-bold">
                {portfolio.totalAssets.toLocaleString()}원
              </div>
            </div>

            {/* 보유 현금 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-2">보유 현금</div>
              <div className="text-2xl font-bold text-blue-600">
                {portfolio.currentCash.toLocaleString()}원
              </div>
            </div>

            {/* 총 수익률 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-2">총 수익률</div>
              <div
                className={`text-2xl font-bold ${
                  portfolio.totalReturn > 0
                    ? 'text-red-600'
                    : portfolio.totalReturn < 0
                    ? 'text-blue-600'
                    : 'text-gray-600'
                }`}
              >
                {portfolio.totalReturn > 0 ? '+' : ''}
                {portfolio.totalReturn.toFixed(2)}%
              </div>
            </div>

            {/* 평가 손익 */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-2">평가 손익</div>
              <div
                className={`text-2xl font-bold ${
                  portfolio.unrealizedPL > 0
                    ? 'text-red-600'
                    : portfolio.unrealizedPL < 0
                    ? 'text-blue-600'
                    : 'text-gray-600'
                }`}
              >
                {portfolio.unrealizedPL > 0 ? '+' : ''}
                {portfolio.unrealizedPL.toLocaleString()}원
              </div>
            </div>
          </div>

          {/* 실현 손익 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">실현 손익</span>
              <span
                className={`text-lg font-semibold ${
                  portfolio.realizedPL > 0
                    ? 'text-red-600'
                    : portfolio.realizedPL < 0
                    ? 'text-blue-600'
                    : 'text-gray-600'
                }`}
              >
                {portfolio.realizedPL > 0 ? '+' : ''}
                {portfolio.realizedPL.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* 포트폴리오 히스토리 차트 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">자산 변동 추이</h2>
              <div className="flex gap-2">
                {(['7d', '30d', '90d', '1y', 'all'] as Period[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      selectedPeriod === period
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {period === '7d'
                      ? '7일'
                      : period === '30d'
                      ? '30일'
                      : period === '90d'
                      ? '90일'
                      : period === '1y'
                      ? '1년'
                      : '전체'}
                  </button>
                ))}
              </div>
            </div>

            {historyLoading ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                차트 로딩 중...
              </div>
            ) : history.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                거래 내역이 없습니다
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value)
                      return `${date.getMonth() + 1}/${date.getDate()}`
                    }}
                  />
                  <YAxis
                    tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString()}원`, '총 자산']}
                    labelFormatter={(label) => {
                      const date = new Date(label)
                      return date.toLocaleDateString('ko-KR')
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalAssets"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 보유 종목 테이블 */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-xl font-semibold">보유 종목</h2>
            </div>

            {portfolio.holdings.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                보유 중인 종목이 없습니다
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        종목
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        보유수량
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        평균단가
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        현재가
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        평가금액
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        손익
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        수익률
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {portfolio.holdings.map((holding) => {
                      const totalValue = holding.quantity * holding.currentPrice
                      const profitLoss =
                        (holding.currentPrice - holding.avgPrice) * holding.quantity
                      const returnRate =
                        ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) *
                        100

                      return (
                        <tr key={holding.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium">{holding.stockName}</div>
                            <div className="text-sm text-gray-500">
                              {holding.stockCode}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {holding.quantity.toLocaleString()}주
                          </td>
                          <td className="px-6 py-4 text-right">
                            {holding.avgPrice.toLocaleString()}원
                          </td>
                          <td className="px-6 py-4 text-right font-medium">
                            {holding.currentPrice.toLocaleString()}원
                          </td>
                          <td className="px-6 py-4 text-right font-medium">
                            {totalValue.toLocaleString()}원
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-semibold ${
                              profitLoss > 0
                                ? 'text-red-600'
                                : profitLoss < 0
                                ? 'text-blue-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {profitLoss > 0 ? '+' : ''}
                            {profitLoss.toLocaleString()}원
                          </td>
                          <td
                            className={`px-6 py-4 text-right font-semibold ${
                              returnRate > 0
                                ? 'text-red-600'
                                : returnRate < 0
                                ? 'text-blue-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {returnRate > 0 ? '+' : ''}
                            {returnRate.toFixed(2)}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 초기 안내 메시지 */}
      {!loading && !portfolio && !error && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">User ID를 입력하여 포트폴리오를 조회하세요</p>
          <p className="text-sm">인증 시스템 구현 후 자동으로 조회됩니다</p>
        </div>
      )}
    </div>
  )
}
