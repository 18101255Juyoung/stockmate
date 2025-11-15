/**
 * MarketAnalysisCard - 시장 전체 분석 요약 카드
 * 당일 시장 상황 (KOSPI, KOSDAQ, 업종별 흐름)
 */

'use client'

import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react'

interface MarketData {
  indices: {
    kospi: {
      value: number
      changeRate: number
    }
    kosdaq: {
      value: number
      changeRate: number
    }
  }
  sectors: Array<{
    name: string
    changeRate: number
  }>
  summary: {
    marketSentiment: 'bullish' | 'bearish' | 'neutral'
  }
}

interface MarketAnalysisCardProps {
  date: Date
  marketData: MarketData
  summary: string
  onViewDetail: () => void
}

export default function MarketAnalysisCard({
  date,
  marketData,
  summary,
  onViewDetail,
}: MarketAnalysisCardProps) {
  const dateStr = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  const { indices, sectors, summary: marketSummary } = marketData

  // Backward compatibility: support both 'value' and 'currentPrice' fields
  const kospiValue = (indices?.kospi as any)?.value ?? (indices?.kospi as any)?.currentPrice ?? 0
  const kosdaqValue = (indices?.kosdaq as any)?.value ?? (indices?.kosdaq as any)?.currentPrice ?? 0

  // Backward compatibility: support both array and object format for sectors
  const sectorsArray = Array.isArray(sectors)
    ? sectors
    : sectors
      ? Object.values(sectors).slice(0, 4)
      : []

  // marketSummary가 없을 경우 기본값 사용
  const sentiment = marketSummary?.marketSentiment || 'neutral'

  const sentimentEmoji =
    sentiment === 'bullish'
      ? '🐂'
      : sentiment === 'bearish'
      ? '🐻'
      : '😐'

  const sentimentText =
    sentiment === 'bullish'
      ? '강세'
      : sentiment === 'bearish'
      ? '약세'
      : '중립'

  const sentimentColor =
    sentiment === 'bullish'
      ? 'bg-green-100 text-green-800'
      : sentiment === 'bearish'
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800'

  return (
    <div className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-bold text-blue-900">오늘의 시장 분석</h3>
            <p className="text-sm text-blue-700">{dateStr}</p>
          </div>
        </div>
        <span
          className={`text-sm font-semibold px-3 py-1 rounded-full ${sentimentColor}`}
        >
          {sentimentEmoji} {sentimentText}
        </span>
      </div>

      {/* 주요 지수 */}
      {indices?.kospi && indices?.kosdaq && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-600 mb-1">KOSPI</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                {kospiValue.toFixed(2)}
              </span>
              <span
                className={`text-sm font-medium flex items-center gap-1 ${
                  indices.kospi.changeRate >= 0 ? 'text-red-600' : 'text-blue-600'
                }`}
              >
                {indices.kospi.changeRate >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {indices.kospi.changeRate >= 0 ? '+' : ''}
                {indices.kospi.changeRate.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 shadow-sm">
            <div className="text-xs text-gray-600 mb-1">KOSDAQ</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                {kosdaqValue.toFixed(2)}
              </span>
              <span
                className={`text-sm font-medium flex items-center gap-1 ${
                  indices.kosdaq.changeRate >= 0 ? 'text-red-600' : 'text-blue-600'
                }`}
              >
                {indices.kosdaq.changeRate >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {indices.kosdaq.changeRate >= 0 ? '+' : ''}
                {indices.kosdaq.changeRate.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 업종별 흐름 */}
      {sectorsArray && sectorsArray.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-700 mb-2">업종별 흐름</h4>
          <div className="grid grid-cols-2 gap-2">
            {sectorsArray.map((sector: any, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white rounded px-3 py-2 text-xs"
              >
                <span className="text-gray-700">{sector.name}</span>
                <span
                  className={`font-semibold ${
                    sector.changeRate >= 0 ? 'text-red-600' : 'text-blue-600'
                  }`}
                >
                  {sector.changeRate >= 0 ? '+' : ''}
                  {sector.changeRate.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 분석 요약 */}
      <div className="bg-white rounded-lg p-4 mb-4">
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {summary}
        </p>
      </div>

      {/* 자세히 보기 버튼 */}
      <button
        onClick={onViewDetail}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        상세 시장 분석 보기
      </button>
    </div>
  )
}
