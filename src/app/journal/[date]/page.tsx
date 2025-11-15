/**
 * 투자 일지 상세 페이지
 * 특정 날짜의 시장 분석, 개인 분석, 거래 내역을 표시
 */

'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import IntegratedAIAnalysisCard from '@/components/journal/IntegratedAIAnalysisCard'
import AIAnalysisSummary from '@/components/journal/AIAnalysisSummary'
import AIAnalysisModal from '@/components/journal/AIAnalysisModal'
import TransactionList from '@/components/journal/TransactionList'
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

interface MarketAnalysis {
  date: Date
  marketData: any
  summary: string
  analysis: string
}

interface PersonalAnalysis {
  id: string
  summary: string
  response: string
  analysisDate: Date
  tokensUsed: number
  cost: number
  model: string
}

interface PortfolioSnapshot {
  totalAssets: number
  currentCash: number
  totalReturn: number
}

interface PortfolioAnalysis {
  id: string
  userId: string
  date: Date
  summary: string
  analysis: string
  hasTransactions: boolean
  tokensUsed: number
  cost: number
}

export default function JournalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 데이터 상태
  const [dateObj, setDateObj] = useState<Date | null>(null)
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null)
  const [personalAnalysis, setPersonalAnalysis] = useState<PersonalAnalysis | null>(null)
  const [portfolioSnapshot, setPortfolioSnapshot] = useState<PortfolioSnapshot | null>(null)
  const [portfolioAnalysis, setPortfolioAnalysis] = useState<PortfolioAnalysis | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // 모달 상태
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false)

  // AI 생성 상태
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // 인증 확인
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  // 데이터 로드
  useEffect(() => {
    if (status === 'authenticated' && params.date) {
      loadDetailData(params.date as string)
    }
  }, [status, params.date])

  async function loadDetailData(dateStr: string) {
    try {
      setLoading(true)
      setError(null)

      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format')
      }
      setDateObj(date)

      // 병렬로 데이터 로드
      const [marketRes, personalRes, snapshotRes, transactionRes, analysisRes] = await Promise.allSettled([
        fetch(`/api/ai/market/${dateStr}`),
        fetch(`/api/ai/journal/${dateStr}`),
        fetch(`/api/portfolio/history?period=1d&date=${dateStr}`),
        fetch(`/api/transactions?date=${dateStr}`),
        fetch(`/api/portfolio/analysis?date=${dateStr}`),
      ])

      // 시장 분석
      if (marketRes.status === 'fulfilled' && marketRes.value.ok) {
        const data = await marketRes.value.json()
        if (data.success) {
          setMarketAnalysis({
            date: new Date(data.data.date),
            marketData: data.data.marketData,
            summary: data.data.summary,
            analysis: data.data.analysis,
          })
        }
      }

      // 개인 분석
      if (personalRes.status === 'fulfilled' && personalRes.value.ok) {
        const data = await personalRes.value.json()
        if (data.success) {
          setPersonalAnalysis({
            id: data.data.id,
            summary: data.data.summary,
            response: data.data.response,
            analysisDate: new Date(data.data.analysisDate),
            tokensUsed: data.data.tokensUsed,
            cost: data.data.cost,
            model: data.data.model,
          })
        }
      }

      // 포트폴리오 스냅샷
      if (snapshotRes.status === 'fulfilled' && snapshotRes.value.ok) {
        const data = await snapshotRes.value.json()
        if (data.success && data.data.history.length > 0) {
          const snapshot = data.data.history[0]
          setPortfolioSnapshot({
            totalAssets: snapshot.totalAssets,
            currentCash: snapshot.cash, // API 응답에서는 'cash' 필드 사용
            totalReturn: snapshot.return, // API 응답에서는 'return' 필드 사용
          })
        }
      }

      // 거래 내역
      if (transactionRes.status === 'fulfilled' && transactionRes.value.ok) {
        const data = await transactionRes.value.json()
        if (data.success) {
          setTransactions(data.data.transactions)
        }
      }

      // 포트폴리오 분석 (통합 분석)
      if (analysisRes.status === 'fulfilled' && analysisRes.value.ok) {
        const data = await analysisRes.value.json()
        if (data.success) {
          setPortfolioAnalysis({
            id: data.data.id,
            userId: data.data.userId,
            date: new Date(data.data.date),
            summary: data.data.summary,
            analysis: data.data.analysis,
            hasTransactions: data.data.hasTransactions,
            tokensUsed: data.data.tokensUsed,
            cost: data.data.cost,
          })
        }
      }
    } catch (err: any) {
      console.error('Detail data load error:', err)
      setError(err.message || '데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 이전/다음 날짜 이동
  function navigateToDate(offset: number) {
    if (!dateObj) return

    const newDate = new Date(dateObj)
    newDate.setDate(newDate.getDate() + offset)

    const newDateStr = newDate.toISOString().split('T')[0]
    router.push(`/journal/${newDateStr}`)
  }

  // AI 분석 생성 핸들러
  async function handleGenerateAnalysis() {
    if (!params.date) return

    setIsGenerating(true)
    setGenerationError(null)

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: params.date }),
      })

      const data = await response.json()

      if (data.success) {
        // 성공: 생성된 분석 데이터 업데이트
        if (data.data.marketAnalysis) {
          setMarketAnalysis({
            date: new Date(params.date as string),
            marketData: {},
            summary: data.data.marketAnalysis.summary,
            analysis: data.data.marketAnalysis.analysis,
          })
        }

        if (data.data.personalAnalysis) {
          setPersonalAnalysis({
            id: data.data.personalAnalysis.id || 'generated',
            summary: data.data.personalAnalysis.summary,
            response: data.data.personalAnalysis.response,
            analysisDate: new Date(params.date as string),
            tokensUsed: data.data.tokensUsed || 0,
            cost: data.data.cost || 0,
            model: 'gpt-5-nano',
          })
        }
      } else {
        // 에러 처리
        setGenerationError(data.error?.message || 'AI 분석 생성에 실패했습니다')
      }
    } catch (error) {
      console.error('AI generation error:', error)
      setGenerationError('AI 분석 생성 중 오류가 발생했습니다')
    } finally {
      setIsGenerating(false)
    }
  }

  // 모달 핸들러
  function handleViewPersonalAnalysis() {
    setIsPersonalModalOpen(true)
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

  if (!dateObj) {
    return null
  }

  const dateStr = dateObj.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 네비게이션 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push('/journal')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>목록으로</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateToDate(-1)}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              title="이전 날짜"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => navigateToDate(1)}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              title="다음 날짜"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{dateStr}</h1>
      </div>

      {/* 통합 AI 분석 섹션 */}
      {(marketAnalysis || portfolioAnalysis) ? (
        <div className="mb-6">
          <IntegratedAIAnalysisCard
            marketAnalysis={marketAnalysis}
            portfolioAnalysis={portfolioAnalysis}
            date={dateObj}
            hasTransactions={transactions.length > 0}
          />
        </div>
      ) : (
        <div className="mb-6">
          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">🤖 AI 종합 분석</h3>
                <p className="text-sm text-gray-600">
                  오늘의 시장 상황과 포트폴리오 분석을 확인하세요
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateAnalysis}
              disabled={isGenerating}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI 분석 생성 중... (약 5-10초)
                </span>
              ) : (
                'AI 분석 생성하기'
              )}
            </button>

            {generationError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{generationError}</p>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-3 text-center">
              💡 자동 생성: 매일 15:35, 16:00 (거래일 기준)
            </p>
          </div>
        </div>
      )}

      {/* 개인 포트폴리오 섹션 - 거래가 없는 날만 표시 */}
      {portfolioSnapshot && transactions.length === 0 && (
        <div className="mb-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">내 포트폴리오</h2>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">총 자산</div>
                <div className="text-lg font-bold text-gray-900">
                  {portfolioSnapshot.totalAssets.toLocaleString()}원
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">현금</div>
                <div className="text-lg font-bold text-gray-900">
                  {portfolioSnapshot.currentCash.toLocaleString()}원
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">수익률</div>
                <div
                  className={`text-lg font-bold ${
                    portfolioSnapshot.totalReturn >= 0
                      ? 'text-red-600'
                      : 'text-blue-600'
                  }`}
                >
                  {portfolioSnapshot.totalReturn >= 0 ? '+' : ''}
                  {portfolioSnapshot.totalReturn.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* 개인 AI 분석 */}
            {personalAnalysis && (
              <AIAnalysisSummary
                analysis={{
                  id: personalAnalysis.id,
                  summary: personalAnalysis.summary,
                  analysisDate: personalAnalysis.analysisDate,
                }}
                onViewDetail={handleViewPersonalAnalysis}
              />
            )}
          </div>
        </div>
      )}

      {/* 거래 내역 섹션 */}
      {transactions.length > 0 && (
        <div className="mb-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              거래 내역 ({transactions.length}건)
            </h2>
            <TransactionList transactions={transactions} />
          </div>
        </div>
      )}

      {/* 데이터 없는 경우 */}
      {!marketAnalysis && !personalAnalysis && transactions.length === 0 && !portfolioAnalysis && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">이 날짜에는 기록이 없습니다</p>
        </div>
      )}

      {/* 개인 분석 모달 */}
      {personalAnalysis && (
        <AIAnalysisModal
          isOpen={isPersonalModalOpen}
          onClose={() => setIsPersonalModalOpen(false)}
          analysis={{
            analysisDate: personalAnalysis.analysisDate,
            response: personalAnalysis.response,
            tokensUsed: personalAnalysis.tokensUsed,
            cost: personalAnalysis.cost,
            model: personalAnalysis.model,
          }}
        />
      )}
    </div>
  )
}
