/**
 * PortfolioAnalysisCard Component
 * 포트폴리오 AI 분석을 표시하는 카드
 * - 3줄 요약 표시
 * - 자세히 보기 토글
 * - 거래 여부 표시
 */

'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface PortfolioAnalysisCardProps {
  summary: string
  analysis: string
  date: Date
  hasTransactions: boolean
}

export default function PortfolioAnalysisCard({
  summary,
  analysis,
  date,
  hasTransactions,
}: PortfolioAnalysisCardProps) {
  const [expanded, setExpanded] = useState(false)

  const formattedDate = new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="border rounded-lg p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 shadow-sm">
      {/* 헤더 */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          🤖 AI 포트폴리오 분석
          {hasTransactions && (
            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
              거래 평가 포함
            </span>
          )}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {formattedDate}
        </p>
      </div>

      {/* 3줄 요약 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow-sm">
        <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
          {summary}
        </p>
      </div>

      {/* 자세히 보기 버튼 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
      >
        <span>{expanded ? '접기' : '자세히 보기'}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* 전체 분석 (확장 시) */}
      {expanded && (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm animate-fadeIn">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-white">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700 dark:text-gray-300">
                    {children}
                  </ul>
                ),
                li: ({ children }) => (
                  <li className="ml-2">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-purple-700 dark:text-purple-400">
                    {children}
                  </strong>
                ),
              }}
            >
              {analysis}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
