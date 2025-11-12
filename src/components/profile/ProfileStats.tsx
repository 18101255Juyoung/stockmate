'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProfileStatsProps {
  portfolio: {
    initialCapital: number
    currentCash: number
    totalAssets: number
    totalReturn: number
    realizedPL: number
    unrealizedPL: number
    updatedAt: Date
  } | null
}

export default function ProfileStats({ portfolio }: ProfileStatsProps) {
  if (!portfolio) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          포트폴리오 정보가 없습니다.
        </CardContent>
      </Card>
    )
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num)
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
    <Card>
      <CardHeader>
        <CardTitle>포트폴리오 현황</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {/* Total Assets */}
          <div>
            <p className="text-sm text-gray-600">총 자산</p>
            <p className="text-xl font-bold">
              {formatNumber(portfolio.totalAssets)}원
            </p>
          </div>

          {/* Total Return */}
          <div>
            <p className="text-sm text-gray-600">수익률</p>
            <p
              className={`text-xl font-bold ${getReturnColor(portfolio.totalReturn)}`}
            >
              {formatPercent(portfolio.totalReturn)}
            </p>
          </div>

          {/* Current Cash */}
          <div>
            <p className="text-sm text-gray-600">보유 현금</p>
            <p className="text-xl font-bold">
              {formatNumber(portfolio.currentCash)}원
            </p>
          </div>

          {/* Realized P/L */}
          <div>
            <p className="text-sm text-gray-600">실현 손익</p>
            <p
              className={`text-xl font-bold ${getReturnColor(portfolio.realizedPL)}`}
            >
              {formatNumber(portfolio.realizedPL)}원
            </p>
          </div>

          {/* Unrealized P/L */}
          <div>
            <p className="text-sm text-gray-600">평가 손익</p>
            <p
              className={`text-xl font-bold ${getReturnColor(portfolio.unrealizedPL)}`}
            >
              {formatNumber(portfolio.unrealizedPL)}원
            </p>
          </div>

          {/* Initial Capital */}
          <div>
            <p className="text-sm text-gray-600">시드머니</p>
            <p className="text-xl font-bold">
              {formatNumber(portfolio.initialCapital)}원
            </p>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          최근 업데이트:{' '}
          {new Date(portfolio.updatedAt).toLocaleString('ko-KR')}
        </div>
      </CardContent>
    </Card>
  )
}
