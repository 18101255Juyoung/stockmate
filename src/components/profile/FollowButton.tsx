'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface FollowButtonProps {
  username: string
  isOwnProfile?: boolean
  initialIsFollowing?: boolean
  onFollowChange?: (isFollowing: boolean) => void
}

export default function FollowButton({
  username,
  isOwnProfile = false,
  initialIsFollowing = false,
  onFollowChange,
}: FollowButtonProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isLoading, setIsLoading] = useState(false)

  const fetchFollowStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${username}/follow-status`)
      if (res.ok) {
        const result = await res.json()
        if (result.success) {
          setIsFollowing(result.data.isFollowing)
        }
      }
    } catch (error) {
      console.error('Error fetching follow status:', error)
    }
  }, [username])

  // Fetch follow status on mount
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchFollowStatus()
    }
  }, [status, session, fetchFollowStatus])

  const handleFollow = async () => {
    if (status !== 'authenticated') {
      router.push('/login')
      return
    }

    setIsLoading(true)

    try {
      const endpoint = isFollowing
        ? `/api/users/${username}/unfollow`
        : `/api/users/${username}/follow`
      const method = isFollowing ? 'DELETE' : 'POST'

      const res = await fetch(endpoint, { method })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error?.message || '오류가 발생했습니다.')
        return
      }

      const result = await res.json()

      if (result.success) {
        const newIsFollowing = !isFollowing
        setIsFollowing(newIsFollowing)
        onFollowChange?.(newIsFollowing)
        router.refresh()
      }
    } catch (error) {
      console.error('Follow error:', error)
      alert('팔로우 처리 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show button for own profile
  if (isOwnProfile) {
    return null
  }

  // Don't show button if not authenticated
  if (status === 'unauthenticated') {
    return (
      <button
        onClick={() => router.push('/login')}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        로그인
      </button>
    )
  }

  return (
    <button
      onClick={handleFollow}
      disabled={isLoading}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isFollowing
          ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {isLoading ? '처리 중...' : isFollowing ? '팔로잉' : '팔로우'}
    </button>
  )
}
