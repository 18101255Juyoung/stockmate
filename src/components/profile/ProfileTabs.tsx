'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

interface Transaction {
  id: string
  type: 'BUY' | 'SELL'
  stockCode: string
  stockName: string
  quantity: number
  price: number
  totalAmount: number
  fee: number
  note: string | null
  createdAt: string
}

export default function ProfileTabs({ username }: ProfileTabsProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserContent()
  }, [username])

  const loadUserContent = async () => {
    setLoading(true)
    try {
      // Load posts
      const postsRes = await fetch(`/api/posts?username=${username}&limit=20`)
      if (postsRes.ok) {
        const postsData = await postsRes.json()
        if (postsData.success) {
          setPosts(postsData.data.posts)
        }
      }

      // Load transactions
      const transRes = await fetch(
        `/api/transactions?username=${username}&limit=20`
      )
      if (transRes.ok) {
        const transData = await transRes.json()
        if (transData.success) {
          setTransactions(transData.data.transactions)
        }
      }
    } catch (error) {
      console.error('Failed to load user content:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="posts">커뮤니티 글</TabsTrigger>
        <TabsTrigger value="transactions">투자 내역</TabsTrigger>
      </TabsList>

      <TabsContent value="posts" className="mt-6">
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
      </TabsContent>

      <TabsContent value="transactions" className="mt-6">
        {loading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            거래 내역이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        transaction.type === 'BUY'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {transaction.type === 'BUY' ? '매수' : '매도'}
                    </span>
                    <span className="font-bold">{transaction.stockName}</span>
                    <span className="text-sm text-gray-600">
                      ({transaction.stockCode})
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    {formatNumber(transaction.quantity)}주 @{' '}
                    {formatNumber(transaction.price)}원
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {formatDate(transaction.createdAt)}
                  </div>
                  {transaction.note && (
                    <div className="mt-2 text-sm text-gray-700">
                      {transaction.note}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className={`font-bold ${
                      transaction.type === 'BUY'
                        ? 'text-red-600'
                        : 'text-blue-600'
                    }`}
                  >
                    {transaction.type === 'BUY' ? '-' : '+'}
                    {formatNumber(transaction.totalAmount)}원
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
