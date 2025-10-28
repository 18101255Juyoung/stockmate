'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts'
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

type ChartPeriod = 7 | 30 | 90 | 365 | 1095

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
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>(30)

  // Trading state
  const [tradeQuantity, setTradeQuantity] = useState<number>(1)
  const [tradeNote, setTradeNote] = useState<string>('')
  const [tradeLoading, setTradeLoading] = useState(false)
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null)

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

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

  // 차트 데이터 로드 (종목 선택 시 또는 기간 변경 시 호출)
  useEffect(() => {
    const loadChartData = async () => {
      if (!selectedStock) {
        setChartData([])
        return
      }

      setChartLoading(true)

      try {
        const response = await fetch(
          `/api/stocks/${selectedStock.stockCode}/chart?days=${chartPeriod}`
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
  }, [selectedStock, chartPeriod])

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

  // Custom Candlestick Shape
  const CandlestickShape = (props: any) => {
    const { x, y, width, height, open, close, high, low, fill } = props

    const isGreen = close > open
    const color = isGreen ? '#ef4444' : '#3b82f6' // 빨강(상승) / 파랑(하락)
    const candleWidth = width * 0.6
    const candleX = x + (width - candleWidth) / 2

    // Calculate body position
    const bodyTop = Math.min(open, close)
    const bodyBottom = Math.max(open, close)
    const bodyHeight = Math.abs(close - open)

    return (
      <g>
        {/* Wick (High-Low line) */}
        <line
          x1={x + width / 2}
          y1={high}
          x2={x + width / 2}
          y2={low}
          stroke={color}
          strokeWidth={1}
        />
        {/* Body */}
        <rect
          x={candleX}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight || 1}
          fill={color}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    )
  }

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const data = payload[0].payload

    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-2">{data.date}</p>
        <div className="space-y-1">
          <p>시가: {data.open?.toLocaleString()}원</p>
          <p>고가: <span className="text-red-600">{data.high?.toLocaleString()}원</span></p>
          <p>저가: <span className="text-blue-600">{data.low?.toLocaleString()}원</span></p>
          <p className="font-semibold">종가: {data.close?.toLocaleString()}원</p>
          <p className="text-gray-600">거래량: {data.volume?.toLocaleString()}주</p>
          {data.ma5 && <p className="text-red-500">MA5: {data.ma5.toFixed(0).toLocaleString()}원</p>}
          {data.ma10 && <p className="text-green-500">MA10: {data.ma10.toFixed(0).toLocaleString()}원</p>}
          {data.ma20 && <p className="text-blue-500">MA20: {data.ma20.toFixed(0).toLocaleString()}원</p>}
        </div>
      </div>
    )
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
              <h3 className="text-lg font-semibold">가격 차트</h3>

              {/* 기간 선택 탭 */}
              <div className="flex gap-2">
                {([7, 30, 90, 365, 1095] as ChartPeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartPeriod(period)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      chartPeriod === period
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {period === 1095 ? '3년' : period === 365 ? '1년' : `${period}일`}
                  </button>
                ))}
              </div>
            </div>

            {chartLoading ? (
              <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-gray-500">차트 로딩 중...</div>
              </div>
            ) : chartDataWithMA.length > 0 ? (
              <div className="space-y-4">
                {/* 캔들스틱 + 이동평균선 차트 */}
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={chartDataWithMA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(date) => {
                        const d = new Date(date)
                        return `${d.getMonth() + 1}/${d.getDate()}`
                      }}
                    />
                    <YAxis
                      yAxisId="price"
                      domain={['dataMin - 2000', 'dataMax + 2000']}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    {/* Moving Averages */}
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="ma5"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      dot={false}
                      name="MA5"
                      connectNulls
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="ma10"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      dot={false}
                      name="MA10"
                      connectNulls
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="ma20"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      dot={false}
                      name="MA20"
                      connectNulls
                    />

                    {/* Candlesticks (using Bar as workaround) */}
                    <Bar
                      yAxisId="price"
                      dataKey="high"
                      shape={<CandlestickShape />}
                      name="가격"
                    />
                  </ComposedChart>
                </ResponsiveContainer>

                {/* 거래량 차트 */}
                <ResponsiveContainer width="100%" height={120}>
                  <ComposedChart data={chartDataWithMA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(date) => {
                        const d = new Date(date)
                        return `${d.getMonth() + 1}/${d.getDate()}`
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                        return value.toString()
                      }}
                    />
                    <Tooltip
                      formatter={(value: number) => [value.toLocaleString(), '거래량']}
                      labelFormatter={(date) => date}
                    />
                    <Bar dataKey="volume" fill="#94a3b8" name="거래량">
                      {chartDataWithMA.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.close > entry.open ? '#ef4444' : '#3b82f6'}
                        />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>

                <div className="text-sm text-gray-500 text-center">
                  차트 데이터: {chartDataWithMA.length}일 |
                  이동평균선: MA5(빨강), MA10(초록), MA20(파랑)
                </div>
              </div>
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
