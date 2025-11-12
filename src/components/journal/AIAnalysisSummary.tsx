/**
 * AIAnalysisSummary - AI 분석 요약 컴포넌트
 * 3줄 요약을 표시하고 [자세히 보기] 버튼 제공
 */

'use client'

import { Sparkles } from 'lucide-react'

interface AIAnalysis {
  id: string
  summary: string
  analysisDate: Date
}

interface AIAnalysisSummaryProps {
  analysis: AIAnalysis
  onViewDetail?: () => void
}

export default function AIAnalysisSummary({
  analysis,
  onViewDetail,
}: AIAnalysisSummaryProps) {
  return (
    <div className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <h4 className="text-base font-bold text-purple-900">AI 투자 분석</h4>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
          {analysis.summary}
        </p>
      </div>

      {onViewDetail && (
        <button
          onClick={onViewDetail}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          📖 전체 분석 보기
        </button>
      )}
    </div>
  )
}
