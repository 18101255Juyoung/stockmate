'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import FollowButton from './FollowButton'

interface ProfileHeaderProps {
  user: {
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
}

export default function ProfileHeader({ user }: ProfileHeaderProps) {
  const { data: session } = useSession()
  const isOwnProfile = session?.user?.id === user.id

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="border-b bg-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* Profile Image */}
          <div className="flex-shrink-0">
            {user.profileImage ? (
              <Image
                src={user.profileImage}
                alt={user.displayName}
                width={120}
                height={120}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full bg-gray-200 text-3xl font-bold text-gray-600">
                {getInitials(user.displayName)}
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold">{user.displayName}</h1>
                <p className="text-gray-600">@{user.username}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {isOwnProfile ? (
                  <Link href="/settings/profile">
                    <Button variant="outline">프로필 편집</Button>
                  </Link>
                ) : (
                  <FollowButton
                    username={user.username}
                    isOwnProfile={isOwnProfile}
                    initialIsFollowing={false}
                  />
                )}
              </div>
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="mt-4 text-gray-700 whitespace-pre-wrap">
                {user.bio}
              </p>
            )}

            {/* Stats */}
            <div className="mt-4 flex gap-6 text-sm">
              <div>
                <span className="font-bold">{user.postCount}</span>{' '}
                <span className="text-gray-600">게시글</span>
              </div>
              <div>
                <span className="font-bold">{user.transactionCount}</span>{' '}
                <span className="text-gray-600">거래</span>
              </div>
              <Link
                href={`/profile/${user.username}/followers`}
                className="hover:underline"
              >
                <span className="font-bold">{user.followerCount}</span>{' '}
                <span className="text-gray-600">팔로워</span>
              </Link>
              <Link
                href={`/profile/${user.username}/following`}
                className="hover:underline"
              >
                <span className="font-bold">{user.followingCount}</span>{' '}
                <span className="text-gray-600">팔로잉</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
