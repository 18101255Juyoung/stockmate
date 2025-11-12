'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface FollowButtonProps {
  username: string
  initialIsFollowing: boolean
}

export default function FollowButton({
  username,
  initialIsFollowing,
}: FollowButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isLoading, setIsLoading] = useState(false)

  const handleFollow = async () => {
    if (!session) {
      router.push('/login')
      return
    }

    setIsLoading(true)

    try {
      const url = isFollowing
        ? `/api/users/${username}/unfollow`
        : `/api/users/${username}/follow`
      const method = 'POST'

      const res = await fetch(url, { method })

      if (!res.ok) {
        throw new Error('Failed to toggle follow')
      }

      const result = await res.json()

      if (result.success) {
        setIsFollowing(!isFollowing)
        router.refresh()
      }
    } catch (error) {
      console.error('Follow error:', error)
      alert('팔로우 처리 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className={`px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {isLoading ? '처리 중...' : isFollowing ? '팔로잉' : '팔로우'}
    </button>
  )
}
