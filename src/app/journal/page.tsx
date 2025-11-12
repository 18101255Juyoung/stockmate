/**
 * 투자 일지 목록 페이지
 * 실제 데이터가 있는 날짜만 표시, 10개씩 페이지네이션
 */

'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import JournalDateCard from '@/components/journal/JournalDateCard'
import { toKSTDateOnly } from '@/lib/utils/timezone'

interface Transaction {
  id: string
  type: 'BUY' | 'SELL'
  stockCode: string
  stockName: string
  quantity: number
  price: number
  totalAmount: number
  fee: number
  note?: string
  createdAt: string
}

interface DailyData {
  date: Date
  totalAssets: number
  currentCash: number
  totalReturn: number
  hasTransactions: boolean
  hasAIAnalysis: boolean
  marketData?: {
    kospi?: {
      currentPrice: number
      changeRate: number
    }
  }
}

const ITEMS_PER_PAGE = 10

export default function JournalListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()

  const [allData, setAllData] = useState<DailyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // 인증 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // 데이터 로드
  useEffect(() => {
    if (status === 'authenticated') {
      loadJournalList()
    }
  }, [status])

  async function loadJournalList() {
    try {
      setLoading(true)
      setError(null)

      // 1. 포트폴리오 히스토리 조회 (정확한 계산)
      const historyResponse = await fetch('/api/portfolio/history?period=all')
      const historyData = await historyResponse.json()
      const history = historyData.success ? historyData.data.history : []

      // 2. 모든 거래 내역 조회
      const transactionResponse = await fetch('/api/transactions?limit=1000')
      const transactionData = await transactionResponse.json()
      const transactions: Transaction[] = transactionData.success
        ? transactionData.data.transactions
        : []

      // 3. 모든 AI 분석 조회
      const aiResponse = await fetch('/api/ai/journal?limit=1000')
      const aiData = await aiResponse.json()
      const aiAnalyses = aiData.success ? aiData.data.analyses : []

      // 4. 모든 unique 날짜 수집
      const dateSet = new Set<string>()

      // 히스토리 날짜
      history.forEach((h: any) => {
        dateSet.add(h.date.split('T')[0])
      })

      // 거래 날짜
      transactions.forEach((t) => {
        const txDate = new Date(t.createdAt).toISOString().split('T')[0]
        dateSet.add(txDate)
      })

      // AI 분석 날짜
      aiAnalyses.forEach((a: any) => {
        dateSet.add(a.analysisDate.split('T')[0])
      })

      // 5. 날짜별 데이터 조합 (날짜 문자열을 Date 객체로 변환)
      const uniqueDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a)) // 최신순 정렬

      const combined: DailyData[] = uniqueDates
        .map((dateStr) => {
          const date = new Date(dateStr)

          // 주말 제외 (0 = 일요일, 6 = 토요일)
          const dayOfWeek = date.getDay()
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            return null
          }

          // 해당 날짜의 히스토리
          const historyPoint = history.find(
            (h: any) => h.date.split('T')[0] === dateStr
          )

          // 해당 날짜의 거래 유무
          const hasTransactions = transactions.some((t) => {
            const txDate = new Date(t.createdAt).toISOString().split('T')[0]
            return txDate === dateStr
          })

          // 해당 날짜의 AI 분석 유무
          const hasAIAnalysis = aiAnalyses.some(
            (a: any) => a.analysisDate.split('T')[0] === dateStr
          )

          return {
            date,
            totalAssets: historyPoint?.totalAssets || 0,
            currentCash: historyPoint?.cash || 0,
            totalReturn: historyPoint?.return || 0,
            hasTransactions,
            hasAIAnalysis,
          }
        })
        .filter((item): item is DailyData => item !== null) // 주말 제거

      setAllData(combined)
    } catch (err: any) {
      console.error('Journal list load error:', err)
      setError(err.message || '데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 페이지네이션 계산
  const totalPages = Math.ceil(allData.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentData = allData.slice(startIndex, endIndex)

  // 페이지 변경 핸들러
  function handlePrevPage() {
    setCurrentPage((prev) => Math.max(1, prev - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNextPage() {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          에러: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">투자 일지</h1>
        <p className="text-gray-600">
          날짜를 클릭하면 상세 분석을 확인할 수 있습니다
        </p>
        {allData.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            총 {allData.length}개의 기록 (페이지 {currentPage} / {totalPages})
          </p>
        )}
      </div>

      {/* 날짜 목록 */}
      {currentData.length > 0 ? (
        <>
          <div className="space-y-3">
            {currentData.map((data, index) => (
              <JournalDateCard
                key={index}
                date={data.date}
                marketData={data.marketData}
                portfolioData={{
                  totalAssets: data.totalAssets,
                  totalReturn: data.totalReturn,
                }}
                hasTransactions={data.hasTransactions}
                hasAIAnalysis={data.hasAIAnalysis}
              />
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
                <span>이전</span>
              </button>

              <span className="text-gray-700 font-medium">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>다음</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">아직 거래 내역이 없습니다</p>
          <button
            onClick={() => router.push('/trading')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            거래 시작하기
          </button>
        </div>
      )}
    </div>
  )
}
