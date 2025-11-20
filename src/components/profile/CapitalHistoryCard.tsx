'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CapitalHistoryEntry {
  id: string
  amount: string
  newTotal: string
  reason: string
  description: string | null
  rewardType: string | null
  rewardRank: number | null
  period: string | null
  league: string | null
  createdAt: Date
}

const reasonLabels: Record<string, string> = {
  INITIAL: '초기 자본',
  REFERRAL_GIVEN: '추천인 보너스',
  REFERRAL_USED: '추천 받은 보너스',
  ROOKIE_REWARD: '루키 리그 보상',
  HALL_REWARD: '명예의 전당 보상',
  ADMIN_ADJUSTMENT: '관리자 조정',
}

export default function CapitalHistoryCard() {
  const [history, setHistory] = useState<CapitalHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCapitalHistory = async () => {
      try {
        const response = await fetch('/api/capital-history?limit=20')
        const data = await response.json()

        if (data.success) {
          setHistory(data.data.history)
        }
      } catch (error) {
        console.error('Failed to fetch capital history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCapitalHistory()
  }, [])

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount)
    return num >= 0 ? `+₩${num.toLocaleString()}` : `-₩${Math.abs(num).toLocaleString()}`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>자본 변동 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>자본 변동 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            자본 변동 이력이 없습니다
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>자본 변동 이력</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium text-gray-700">날짜</th>
                <th className="text-left py-2 px-2 font-medium text-gray-700">분류</th>
                <th className="text-left py-2 px-2 font-medium text-gray-700">설명</th>
                <th className="text-right py-2 px-2 font-medium text-gray-700">변동액</th>
                <th className="text-right py-2 px-2 font-medium text-gray-700">잔액</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => {
                const amount = parseFloat(entry.amount)
                const isPositive = amount >= 0

                return (
                  <tr key={entry.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 text-gray-600">
                      {new Date(entry.createdAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-2">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {reasonLabels[entry.reason] || entry.reason}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-gray-700 max-w-xs truncate">
                      {entry.description || '-'}
                      {entry.rewardRank && (
                        <span className="ml-1 text-xs text-gray-500">
                          (#{entry.rewardRank})
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-3 px-2 text-right font-medium ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatAmount(entry.amount)}
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-gray-900">
                      ₩{parseFloat(entry.newTotal).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
