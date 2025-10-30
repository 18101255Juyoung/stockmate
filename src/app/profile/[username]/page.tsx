'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import FollowButton from '@/components/community/FollowButton'
import PostCard from '@/components/community/PostCard'

interface User {
  id: string
  username: string
  displayName: string
  bio: string | null
  profileImage: string | null
  createdAt: string
  _count: {
    posts: number
    followers: number
    following: number
  }
}

interface Post {
  id: string
  title: string
  content: string
  user: {
    username: string
    displayName: string
  }
  isVerified: boolean
  likeCount: number
  commentCount: number
  viewCount: number
  createdAt: string
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const username = params.username as string

  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUser()
    fetchPosts()
    if (session) {
      fetchFollowStatus()
    }
  }, [username, session])

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/profile/${username}`)
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

  const fetchPosts = async () => {
    try {
      const response = await fetch(`/api/posts?userId=${username}&limit=20`)
      const data = await response.json()

      if (data.success) {
        setPosts(data.data.posts)
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err)
    }
  }

  const fetchFollowStatus = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/users/${user.id}/following`)
      const data = await response.json()

      if (data.success) {
        setIsFollowing(data.data.isFollowing)
      }
    } catch (err) {
      console.error('Failed to fetch follow status:', err)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
    })
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

  const isOwnProfile = session?.user?.id === user.id

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Profile Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Profile Image */}
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.displayName.charAt(0)}
            </div>

            <div>
              <h1 className="text-2xl font-bold mb-1">{user.displayName}</h1>
              <p className="text-gray-600">@{user.username}</p>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(user.createdAt)} 가입
              </p>
            </div>
          </div>

          {/* Follow/Edit Button */}
          {isOwnProfile ? (
            <Link
              href="/profile/edit"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              프로필 수정
            </Link>
          ) : (
            session && (
              <FollowButton userId={user.id} initialIsFollowing={isFollowing} />
            )
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-gray-700 mb-4 whitespace-pre-wrap">{user.bio}</p>
        )}

        {/* Stats */}
        <div className="flex gap-6 pt-4 border-t border-gray-200">
          <div>
            <span className="font-bold text-lg">
              {user._count.posts.toLocaleString()}
            </span>
            <span className="text-gray-600 ml-1">게시글</span>
          </div>
          <div>
            <span className="font-bold text-lg">
              {user._count.followers.toLocaleString()}
            </span>
            <span className="text-gray-600 ml-1">팔로워</span>
          </div>
          <div>
            <span className="font-bold text-lg">
              {user._count.following.toLocaleString()}
            </span>
            <span className="text-gray-600 ml-1">팔로잉</span>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div>
        <h2 className="text-xl font-bold mb-4">게시글</h2>
        {posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={session?.user?.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <p className="text-gray-600">아직 작성한 게시글이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
