'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import FollowList from '@/components/profile/FollowList'

interface UserData {
  id: string
  username: string
  displayName: string
  bio: string | null
  profileImage: string | null
}

export default function FollowersPage() {
  const router = useRouter()
  const params = useParams()
  const username = params.username as string

  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUserProfile()
  }, [username])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/users/${username}`)
      const data = await response.json()

      if (data.success) {
        setUser(data.data.user)
      } else {
        setError(data.error?.message || '사용자를 찾을 수 없습니다')
      }
    } catch (err) {
      setError('사용자 정보를 불러오는 중 오류가 발생했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1"
          >
            ← 돌아가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {user.displayName}님의 팔로워
          </h1>
        </div>

        {/* Followers List */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <FollowList username={username} type="followers" />
        </div>
      </div>
    </div>
  )
}
