/**
 * IntegratedAIAnalysisCard - 통합 AI 분석 카드
 * 시장 상황 + 시장 분석 + 포트폴리오 분석을 하나의 카드에 표시
 */

'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

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

interface MarketAnalysis {
  marketData: MarketData
  summary: string
  analysis: string
}

interface PortfolioAnalysis {
  summary: string
  analysis: string
}

interface IntegratedAIAnalysisCardProps {
  marketAnalysis: MarketAnalysis | null
  portfolioAnalysis: PortfolioAnalysis | null
  date: Date
  hasTransactions: boolean
}

export default function IntegratedAIAnalysisCard({
  marketAnalysis,
  portfolioAnalysis,
  date,
  hasTransactions,
}: IntegratedAIAnalysisCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [marketExpanded, setMarketExpanded] = useState(false)

  const formattedDate = new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  // Market data with backward compatibility
  const marketData = marketAnalysis?.marketData
  const kospiValue = (marketData?.indices?.kospi as any)?.value ?? (marketData?.indices?.kospi as any)?.currentPrice ?? 0
  const kosdaqValue = (marketData?.indices?.kosdaq as any)?.value ?? (marketData?.indices?.kosdaq as any)?.currentPrice ?? 0

  const sectorsArray = marketData?.sectors
    ? Array.isArray(marketData.sectors)
      ? marketData.sectors.slice(0, 10)
      : Object.values(marketData.sectors).slice(0, 10)
    : []

  const sentiment = marketData?.summary?.marketSentiment || 'neutral'
  const sentimentEmoji =
    sentiment === 'bullish' ? '🐂' : sentiment === 'bearish' ? '🐻' : '😐'
  const sentimentText =
    sentiment === 'bullish' ? '강세' : sentiment === 'bearish' ? '약세' : '중립'
  const sentimentColor =
    sentiment === 'bullish'
      ? 'bg-green-100 text-green-800'
      : sentiment === 'bearish'
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800'

  return (
    <div className="border-2 border-purple-200 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-lg p-6 shadow-md">
      {/* 섹션 1: 오늘의 시장 상황 */}
      {marketData && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-800">📊 오늘의 시장 상황</h4>
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${sentimentColor}`}>
                {sentimentEmoji} {sentimentText}
              </span>
            </div>

            {/* KOSPI & KOSDAQ */}
            {marketData.indices?.kospi && marketData.indices?.kosdaq && (
              <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
                <div className="flex items-center justify-around">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">KOSPI</div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {kospiValue.toFixed(2)}
                        </span>
                        <span
                          className={`text-sm font-medium flex items-center gap-1 ${
                            marketData.indices.kospi.changeRate >= 0 ? 'text-red-600' : 'text-blue-600'
                          }`}
                        >
                          {marketData.indices.kospi.changeRate >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {marketData.indices.kospi.changeRate >= 0 ? '+' : ''}
                          {marketData.indices.kospi.changeRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="h-12 w-px bg-gray-200" />

                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">KOSDAQ</div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {kosdaqValue.toFixed(2)}
                        </span>
                        <span
                          className={`text-sm font-medium flex items-center gap-1 ${
                            marketData.indices.kosdaq.changeRate >= 0 ? 'text-red-600' : 'text-blue-600'
                          }`}
                        >
                          {marketData.indices.kosdaq.changeRate >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {marketData.indices.kosdaq.changeRate >= 0 ? '+' : ''}
                          {marketData.indices.kosdaq.changeRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 업종별 흐름 (10개) */}
            {sectorsArray.length > 0 && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">업종별 흐름</h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {sectorsArray.map((sector: any, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 rounded px-3 py-2"
                    >
                      <span className="text-xs text-gray-700 font-medium">{sector.name}</span>
                      <span
                        className={`text-xs font-bold ${
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
          </div>

          <div className="border-t border-gray-300 my-6" />
        </>
      )}

      {/* 섹션 2: 시장 분석 */}
      {marketAnalysis && (
        <>
          <div className="mb-6">
            <h4 className="text-lg font-bold text-gray-800 mb-3">📰 시장 분석</h4>

            {/* 요약 */}
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <p className="text-sm whitespace-pre-wrap text-gray-700 leading-relaxed">
                {marketAnalysis.summary}
              </p>
            </div>

            {/* 펼치기/접기 버튼 */}
            <button
              onClick={() => setMarketExpanded(!marketExpanded)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {marketExpanded ? '접기 ▲' : '자세히 보기 ▼'}
            </button>

            {/* 전체 분석 (펼쳐졌을 때) */}
            {marketExpanded && (
              <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-bold mt-3 mb-2 text-gray-800">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-semibold mt-2 mb-1 text-gray-800">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-gray-700 mb-2 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-2 text-gray-700">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-inside mb-2 text-gray-700">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm text-gray-700 mb-1">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-bold text-gray-900">{children}</strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic text-gray-800">{children}</em>
                      ),
                      code: ({ children }) => (
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {marketAnalysis.analysis}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-300 my-6" />
        </>
      )}

      {/* 섹션 3: 포트폴리오 분석 */}
      {portfolioAnalysis && (
        <div>
          <h4 className="text-lg font-bold text-gray-800 mb-3">💼 포트폴리오 분석</h4>

          {/* 3줄 요약 */}
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <p className="text-sm whitespace-pre-wrap text-gray-700 leading-relaxed">
              {portfolioAnalysis.summary}
            </p>
          </div>

          {/* 펼치기/접기 버튼 */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {expanded ? '접기 ▲' : '자세히 보기 ▼'}
          </button>

          {/* 전체 분석 (펼쳐졌을 때) */}
          {expanded && (
            <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-lg font-bold mt-3 mb-2 text-gray-800">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-base font-semibold mt-2 mb-1 text-gray-800">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-sm text-gray-700 mb-2 leading-relaxed">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside mb-2 text-gray-700">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside mb-2 text-gray-700">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-sm text-gray-700 mb-1">{children}</li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-bold text-gray-900">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-gray-800">{children}</em>
                    ),
                    code: ({ children }) => (
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">
                        {children}
                      </code>
                    ),
                  }}
                >
                  {portfolioAnalysis.analysis}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
