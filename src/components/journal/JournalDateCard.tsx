/**
 * JournalDateCard - 투자 일지 목록용 날짜 카드
 * 간단한 요약 정보와 함께 클릭하면 상세 페이지로 이동
 */

'use client'

import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, FileText, ChevronRight } from 'lucide-react'

interface JournalDateCardProps {
  date: Date
  marketData?: {
    kospi?: {
      currentPrice: number
      changeRate: number
    }
  }
  portfolioData?: {
    totalAssets: number
    totalReturn: number
  }
  hasTransactions: boolean
  hasAIAnalysis: boolean
}

export default function JournalDateCard({
  date,
  marketData,
  portfolioData,
  hasTransactions,
  hasAIAnalysis,
}: JournalDateCardProps) {
  const router = useRouter()

  const dateStr = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  const dateParam = date.toISOString().split('T')[0]

  const handleClick = () => {
    router.push(`/journal/${dateParam}`)
  }

  return (
    <div
      onClick={handleClick}
      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-blue-300 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        {/* 왼쪽: 날짜 및 정보 */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-base font-semibold text-gray-900">{dateStr}</h3>

            {/* 태그들 */}
            <div className="flex items-center gap-2">
              {hasTransactions && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  거래
                </span>
              )}
              {hasAIAnalysis && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  AI 분석
                </span>
              )}
            </div>
          </div>

          {/* 요약 정보 */}
          <div className="flex items-center gap-6 text-sm">
            {/* KOSPI */}
            {marketData?.kospi && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">KOSPI</span>
                <span className="font-medium text-gray-900">
                  {marketData.kospi.currentPrice.toFixed(2)}
                </span>
                <span
                  className={`flex items-center gap-1 font-medium ${
                    marketData.kospi.changeRate >= 0
                      ? 'text-red-600'
                      : 'text-blue-600'
                  }`}
                >
                  {marketData.kospi.changeRate >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {marketData.kospi.changeRate >= 0 ? '+' : ''}
                  {marketData.kospi.changeRate.toFixed(2)}%
                </span>
              </div>
            )}

            {/* 포트폴리오 */}
            {portfolioData && portfolioData.totalAssets > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">총자산</span>
                  <span className="font-medium text-gray-900">
                    {(portfolioData.totalAssets / 10000).toFixed(0)}만원
                  </span>
                </div>

                {portfolioData.totalReturn !== undefined && !isNaN(portfolioData.totalReturn) && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">수익률</span>
                    <span
                      className={`font-medium ${
                        portfolioData.totalReturn >= 0
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {portfolioData.totalReturn >= 0 ? '+' : ''}
                      {portfolioData.totalReturn.toFixed(2)}%
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 오른쪽: 화살표 아이콘 */}
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
      </div>
    </div>
  )
}
