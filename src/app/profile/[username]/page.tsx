'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ProfileHeader from '@/components/profile/ProfileHeader'
import ProfileStats from '@/components/profile/ProfileStats'
import ProfileTabs from '@/components/profile/ProfileTabs'
import ReferralCard from '@/components/profile/ReferralCard'

interface UserData {
  id: string
  username: string
  displayName: string
  bio: string | null
  profileImage: string | null
  createdAt: Date
  followerCount: number
  followingCount: number
  postCount: number
  transactionCount: number
}

interface PortfolioData {
  initialCapital: number
  currentCash: number
  totalAssets: number
  totalReturn: number
  realizedPL: number
  unrealizedPL: number
  updatedAt: Date
}

export default function ProfilePage() {
  const router = useRouter()
  const params = useParams()
  const username = params.username as string
  const { data: session } = useSession()

  const [user, setUser] = useState<UserData | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if viewing own profile
  const isOwnProfile = session?.user?.username === username

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${username}`)
      const data = await response.json()

      if (data.success) {
        setUser(data.data.user)
        setPortfolio(data.data.portfolio)
      } else {
        setError(data.error?.message || '사용자를 찾을 수 없습니다')
      }
    } catch (err) {
      setError('사용자 정보를 불러오는 중 오류가 발생했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    fetchUserProfile()
  }, [username, fetchUserProfile])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || '사용자를 찾을 수 없습니다'}
        </div>
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-800"
        >
          ← 돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileHeader user={user} />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          <ProfileStats portfolio={portfolio} />

          {/* Referral Card - Only for own profile */}
          {isOwnProfile && <ReferralCard />}

          <ProfileTabs username={username} />
        </div>
      </div>
    </div>
  )
}
