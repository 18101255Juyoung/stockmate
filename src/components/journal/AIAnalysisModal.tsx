/**
 * AIAnalysisModal - AI 분석 전체 내용을 보여주는 모달
 */

'use client'

import { useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface AIAnalysisModalProps {
  isOpen: boolean
  onClose: () => void
  analysis: {
    analysisDate: Date
    response: string
    tokensUsed: number
    cost: number
    model: string
  } | null
}

export default function AIAnalysisModal({
  isOpen,
  onClose,
  analysis,
}: AIAnalysisModalProps) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden' // 스크롤 방지
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || !analysis) return null

  const dateStr = analysis.analysisDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative bg-white rounded-lg shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-bold">AI 투자 분석</h2>
              <p className="text-sm text-purple-100">{dateStr}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* 분석 내용 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{analysis.response}</ReactMarkdown>
          </div>
        </div>

        {/* 푸터 (메타 정보) */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>모델: {analysis.model}</span>
            <span>토큰: {analysis.tokensUsed.toLocaleString()}</span>
            <span>비용: ${analysis.cost.toFixed(6)}</span>
          </div>
          <button
            onClick={onClose}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
