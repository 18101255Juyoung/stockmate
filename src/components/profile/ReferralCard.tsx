'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ReferralStats {
  referralCode: string
  totalReferrals: number
  totalBonus: number
  referrals: Array<{
    username: string
    displayName: string
    createdAt: Date
  }>
}

export default function ReferralCard() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchReferralStats = async () => {
      try {
        const response = await fetch('/api/referral/stats')
        const data = await response.json()

        if (data.success) {
          setStats(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch referral stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReferralStats()
  }, [])

  const copyToClipboard = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>추천 코드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">로딩 중...</div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>추천 코드</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            내 추천 코드
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={stats.referralCode}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-lg"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {copied ? '복사됨!' : '복사'}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            친구가 이 코드로 가입하면 양쪽 모두 +3,000,000원을 받습니다
          </p>
        </div>

        {/* Stats - Simplified */}
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600 mb-3">
            추천한 친구: <span className="font-semibold text-gray-900">{stats.totalReferrals}명</span>
          </p>

          {/* Referrals List */}
          {stats.referrals.length > 0 ? (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {stats.referrals.map((referral) => (
                <div
                  key={referral.username}
                  className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{referral.displayName}</span>
                    <span className="text-xs text-gray-500">@{referral.username}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(referral.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">
              아직 추천한 친구가 없습니다
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
