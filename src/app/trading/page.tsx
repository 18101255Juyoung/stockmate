'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LightweightChart from '@/components/chart/LightweightChart'
import { calculateMultipleMA, mergePriceWithMA } from '@/lib/utils/chartCalculations'

interface StockPrice {
  stockCode: string
  stockName: string
  currentPrice: number
  changePrice: number
  changeRate: number
  openPrice: number
  highPrice: number
  lowPrice: number
  volume: number
}

interface SearchResult {
  stockCode: string
  stockName: string
}

interface ChartDataPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type ChartTimeframe = 'daily' | 'weekly'

export default function TradingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [selectedStock, setSelectedStock] = useState<StockPrice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Chart state
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const chartPeriod = 90 // Fixed to 90 days
  const [chartTimeframe, setChartTimeframe] = useState<ChartTimeframe>('daily')

  // Trading state
  const [tradeQuantity, setTradeQuantity] = useState<number>(1)
  const [tradeNote, setTradeNote] = useState<string>('')
  const [tradeLoading, setTradeLoading] = useState(false)
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null)

  // Auto-refresh state
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false)

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Load default stock (Samsung Electronics) on page load
  useEffect(() => {
    const loadDefaultStock = async () => {
      if (status === 'loading' || status === 'unauthenticated') return
      if (selectedStock) return // Don't reload if already selected

      try {
        const response = await fetch('/api/stocks/005930')
        const data = await response.json()

        if (data.success && data.data) {
          setSelectedStock(data.data)
        }
      } catch (err) {
        console.error('Failed to load default stock:', err)
      }
    }

    loadDefaultStock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Auto-refresh during market hours (09:00-15:30 KST, Mon-Fri)
  useEffect(() => {
    if (!selectedStock) return

    // Check if market is open
    const checkMarketOpen = () => {
      const now = new Date()
      const kstTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
      const day = kstTime.getDay() // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
      const hour = kstTime.getHours()
      const minute = kstTime.getMinutes()

      // Weekend check
      if (day === 0 || day === 6) return false

      // Time check (09:00-15:30)
      const timeInMinutes = hour * 60 + minute
      const marketOpen = 9 * 60 // 09:00
      const marketClose = 15 * 60 + 30 // 15:30

      return timeInMinutes >= marketOpen && timeInMinutes <= marketClose
    }

    if (!checkMarketOpen()) {
      setIsAutoRefreshing(false)
      return
    }

    setIsAutoRefreshing(true)

    // Auto-refresh every 30 seconds during market hours
    const intervalId = setInterval(async () => {
      try {
        // Refresh stock price
        const response = await fetch(`/api/stocks/${selectedStock.stockCode}`)
        const data = await response.json()
        if (data.success && data.data) {
          setSelectedStock(data.data)
          setLastUpdateTime(new Date())
        }

        // Refresh chart data
        const chartResponse = await fetch(
          `/api/stocks/${selectedStock.stockCode}/chart?days=${chartPeriod}&timeframe=${chartTimeframe}`
        )
        const chartData = await chartResponse.json()
        if (chartData.success && chartData.data.chartData) {
          setChartData(chartData.data.chartData)
        }
      } catch (err) {
        console.error('Failed to auto-refresh:', err)
      }
    }, 30000) // 30 seconds

    return () => clearInterval(intervalId)
  }, [selectedStock, chartPeriod, chartTimeframe])

  // Calculate chart data with moving averages
  const chartDataWithMA = useMemo(() => {
    if (chartData.length === 0) return []

    // Calculate 5, 10, 20 day moving averages
    const maData = calculateMultipleMA(chartData, [5, 10, 20])
    return mergePriceWithMA(chartData, maData)
  }, [chartData])

  // 주식 검색
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('검색어를 입력해주세요')
      return
    }

    setLoading(true)
    setError(null)
    setSearchResults([])
    setSelectedStock(null)

    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (data.success) {
        setSearchResults(data.data || [])
        if (data.data && data.data.length === 0) {
          setError('검색 결과가 없습니다')
        }
      } else {
        setError(data.error?.message || '검색에 실패했습니다')
      }
    } catch (err) {
      setError('검색 중 오류가 발생했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 주식 상세 정보 조회
  const handleSelectStock = async (code: string) => {
    setLoading(true)
    setError(null)
    setSelectedStock(null)
    setChartData([])

    try {
      const response = await fetch(`/api/stocks/${code}`)
      const data = await response.json()

      if (data.success) {
        setSelectedStock(data.data)
      } else {
        setError(data.error?.message || '주식 정보를 가져오는데 실패했습니다')
      }
    } catch (err) {
      setError('주식 정보를 가져오는 중 오류가 발생했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // 차트 데이터 로드 (종목 선택 시 또는 기간/timeframe 변경 시 호출)
  useEffect(() => {
    const loadChartData = async () => {
      if (!selectedStock) {
        setChartData([])
        return
      }

      setChartLoading(true)

      try {
        const response = await fetch(
          `/api/stocks/${selectedStock.stockCode}/chart?days=${chartPeriod}&timeframe=${chartTimeframe}`
        )
        const data = await response.json()

        if (data.success && data.data.chartData) {
          setChartData(data.data.chartData)
        } else {
          setChartData([])
        }
      } catch (err) {
        console.error('Failed to load chart data:', err)
        setChartData([])
      } finally {
        setChartLoading(false)
      }
    }

    loadChartData()
  }, [selectedStock, chartPeriod, chartTimeframe])

  // Enter 키로 검색
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // 매수 처리
  const handleBuy = async () => {
    if (!selectedStock) return

    setTradeLoading(true)
    setError(null)
    setTradeSuccess(null)

    try {
      const response = await fetch('/api/transactions/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockCode: selectedStock.stockCode,
          quantity: tradeQuantity,
          note: tradeNote || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTradeSuccess(
          `매수 성공! ${selectedStock.stockName} ${tradeQuantity}주를 ${selectedStock.currentPrice.toLocaleString()}원에 구매했습니다.`
        )
        setTradeQuantity(1)
        setTradeNote('')
      } else {
        setError(data.error?.message || '매수에 실패했습니다')
      }
    } catch (err) {
      setError('매수 중 오류가 발생했습니다')
      console.error(err)
    } finally {
      setTradeLoading(false)
    }
  }

  // 매도 처리
  const handleSell = async () => {
    if (!selectedStock) return

    setTradeLoading(true)
    setError(null)
    setTradeSuccess(null)

    try {
      const response = await fetch('/api/transactions/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockCode: selectedStock.stockCode,
          quantity: tradeQuantity,
          note: tradeNote || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTradeSuccess(
          `매도 성공! ${selectedStock.stockName} ${tradeQuantity}주를 ${selectedStock.currentPrice.toLocaleString()}원에 판매했습니다.`
        )
        setTradeQuantity(1)
        setTradeNote('')
      } else {
        setError(data.error?.message || '매도에 실패했습니다')
      }
    } catch (err) {
      setError('매도 중 오류가 발생했습니다')
      console.error(err)
    } finally {
      setTradeLoading(false)
    }
  }

  // 예상 총액 계산
  const calculateTotalAmount = () => {
    if (!selectedStock) return 0
    return selectedStock.currentPrice * tradeQuantity
  }

  // Show loading state during authentication
  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">로딩 중...</div>
        </div>
      </div>
    )
  }

  // Don't render content if not authenticated
  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">주식 거래</h1>

      {/* 검색 영역 */}
      <div className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="종목명 또는 종목코드 검색 (예: 삼성전자, 005930)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 성공 메시지 */}
      {tradeSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {tradeSuccess}
        </div>
      )}

      {/* 검색 결과 리스트 */}
      {searchResults.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">검색 결과</h2>
          <div className="bg-white border border-gray-200 rounded-lg divide-y">
            {searchResults.map((stock) => (
              <button
                key={stock.stockCode}
                onClick={() => handleSelectStock(stock.stockCode)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{stock.stockName}</div>
                    <div className="text-sm text-gray-500">{stock.stockCode}</div>
                  </div>
                  <div className="text-blue-600">상세보기 →</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 선택한 주식 상세 정보 */}
      {selectedStock && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">
            {selectedStock.stockName} ({selectedStock.stockCode})
          </h2>

          {/* 현재가 및 변동 */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex items-end gap-3 mb-2">
              <div className="text-4xl font-bold">
                {selectedStock.currentPrice.toLocaleString()}원
              </div>
              <div
                className={`text-xl font-semibold ${
                  selectedStock.changePrice > 0
                    ? 'text-red-600'
                    : selectedStock.changePrice < 0
                    ? 'text-blue-600'
                    : 'text-gray-600'
                }`}
              >
                {selectedStock.changePrice > 0 ? '+' : ''}
                {selectedStock.changePrice.toLocaleString()}원 (
                {selectedStock.changeRate > 0 ? '+' : ''}
                {selectedStock.changeRate.toFixed(2)}%)
              </div>
            </div>

            {/* 실시간 업데이트 표시 */}
            <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
              <span>마지막 업데이트: {lastUpdateTime.toLocaleTimeString('ko-KR')}</span>
              {isAutoRefreshing && (
                <span className="flex items-center gap-1 text-green-600">
                  <span className="inline-block w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                  실시간
                </span>
              )}
            </div>
          </div>

          {/* 가격 정보 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">시가</div>
              <div className="text-lg font-semibold">
                {selectedStock.openPrice.toLocaleString()}원
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">고가</div>
              <div className="text-lg font-semibold text-red-600">
                {selectedStock.highPrice.toLocaleString()}원
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">저가</div>
              <div className="text-lg font-semibold text-blue-600">
                {selectedStock.lowPrice.toLocaleString()}원
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">거래량</div>
              <div className="text-lg font-semibold">
                {selectedStock.volume.toLocaleString()}주
              </div>
            </div>
          </div>

          {/* 캔들스틱 차트 */}
          <div className="mb-6 pb-6 border-b">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">가격 차트 (거래일 90일)</h3>

              {/* 시간프레임 선택 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setChartTimeframe('daily')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    chartTimeframe === 'daily'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  일봉
                </button>
                <button
                  onClick={() => setChartTimeframe('weekly')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    chartTimeframe === 'weekly'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  주봉
                </button>
              </div>
            </div>

            {chartLoading ? (
              <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-gray-500">차트 로딩 중...</div>
              </div>
            ) : chartDataWithMA.length > 0 ? (
              <LightweightChart
                data={chartDataWithMA.map((d) => ({
                  time: d.date,
                  open: d.open,
                  high: d.high,
                  low: d.low,
                  close: d.close,
                }))}
                volumeData={chartDataWithMA.map((d) => ({
                  time: d.date,
                  value: d.volume,
                  color: d.close > d.open ? '#ef444480' : '#3b82f680',
                }))}
                ma5={chartDataWithMA.map((d) => ({
                  time: d.date,
                  value: d.ma5 ?? null,
                }))}
                ma10={chartDataWithMA.map((d) => ({
                  time: d.date,
                  value: d.ma10 ?? null,
                }))}
                ma20={chartDataWithMA.map((d) => ({
                  time: d.date,
                  value: d.ma20 ?? null,
                }))}
                height={520}
              />
            ) : (
              <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-gray-500 mb-2">
                    차트 데이터가 아직 없습니다.
                  </p>
                  <p className="text-sm text-gray-400">
                    일봉 데이터는 매일 15:35에 자동 생성됩니다.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 거래 폼 */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">거래하기</h3>

            {/* 수량 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수량
              </label>
              <input
                type="number"
                min="1"
                value={tradeQuantity}
                onChange={(e) => setTradeQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 예상 총액 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">예상 총액 (수수료 제외)</span>
                <span className="text-lg font-bold">
                  {calculateTotalAmount().toLocaleString()}원
                </span>
              </div>
            </div>

            {/* 메모 입력 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                투자 메모 (선택사항)
              </label>
              <textarea
                value={tradeNote}
                onChange={(e) => setTradeNote(e.target.value)}
                placeholder="이 거래에 대한 메모를 남겨보세요..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>

            {/* 매수/매도 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={handleBuy}
                disabled={tradeLoading}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {tradeLoading ? '처리 중...' : '매수'}
              </button>
              <button
                onClick={handleSell}
                disabled={tradeLoading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {tradeLoading ? '처리 중...' : '매도'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 초기 안내 메시지 */}
      {!loading && searchResults.length === 0 && !selectedStock && !error && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">종목을 검색하여 주식 정보를 확인하세요</p>
          <p className="text-sm">예: 삼성전자, 005930, SK하이닉스</p>
          <p className="text-xs text-gray-400 mt-2">시총 상위 50개 종목만 지원됩니다</p>
        </div>
      )}
    </div>
  )
}
