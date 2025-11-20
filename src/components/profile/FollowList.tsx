'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import FollowButton from './FollowButton'

interface User {
  id: string
  username: string
  displayName: string
  profileImage: string | null
}

interface FollowListProps {
  username: string
  type: 'followers' | 'following'
  initialUsers?: User[]
}

export default function FollowList({
  username,
  type,
  initialUsers = [],
}: FollowListProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endpoint =
        type === 'followers'
          ? `/api/users/${username}/followers`
          : `/api/users/${username}/following`

      const res = await fetch(endpoint)

      if (!res.ok) {
        throw new Error('Failed to fetch users')
      }

      const result = await res.json()

      if (result.success) {
        setUsers(
          type === 'followers'
            ? result.data.followers
            : result.data.following
        )
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('사용자 목록을 불러올 수 없습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [username, type])

  useEffect(() => {
    if (initialUsers.length === 0) {
      fetchUsers()
    }
  }, [initialUsers.length, fetchUsers])

  const handleFollowChange = () => {
    // Refresh the list when follow status changes
    fetchUsers()
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center text-gray-600">
        로딩 중...
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-600">
        {error}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        {type === 'followers'
          ? '아직 팔로워가 없습니다.'
          : '아직 팔로우하는 사용자가 없습니다.'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <Link
            href={`/profile/${user.username}`}
            className="flex items-center gap-3 flex-1"
          >
            {/* Profile Image */}
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-500 text-xl font-semibold">
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <p className="font-semibold text-gray-900 hover:text-blue-600">
                {user.displayName}
              </p>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>
          </Link>

          {/* Follow Button */}
          <FollowButton
            username={user.username}
            onFollowChange={handleFollowChange}
          />
        </div>
      ))}
    </div>
  )
}
