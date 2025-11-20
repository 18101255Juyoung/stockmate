'use client'

import { useState, useEffect, useCallback } from 'react'
import PostCard from '@/components/community/PostCard'

interface ProfileTabsProps {
  username: string
}

interface Post {
  id: string
  title: string
  content: string
  imageUrls?: string[]
  stockCode?: string | null
  stockName?: string | null
  returnRate?: number | null
  isVerified: boolean
  linkedTransactionIds: string[]
  createdAt: string
  user: {
    id: string
    username: string
    displayName: string
    profileImage: string | null
  }
  likeCount: number
  commentCount: number
  viewCount: number
}

export default function ProfileTabs({ username }: ProfileTabsProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const loadUserContent = useCallback(async () => {
    setLoading(true)
    try {
      // First, get user info to get userId from username
      const userRes = await fetch(`/api/users/${username}`)
      if (userRes.ok) {
        const userData = await userRes.json()
        if (userData.success && userData.data.user) {
          const fetchedUserId = userData.data.user.id
          setUserId(fetchedUserId)

          // Now load posts with userId filter
          const postsRes = await fetch(`/api/posts?userId=${fetchedUserId}&limit=20`)
          if (postsRes.ok) {
            const postsData = await postsRes.json()
            if (postsData.success) {
              setPosts(postsData.data.posts)
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user content:', error)
    } finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    loadUserContent()
  }, [username, loadUserContent])

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-xl font-bold">작성 글</h2>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          작성한 게시글이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
