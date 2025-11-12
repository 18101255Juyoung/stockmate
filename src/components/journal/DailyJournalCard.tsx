/**
 * DailyJournalCard - 날짜별 투자 일지 카드
 * 자산 변동, 거래 내역, AI 분석을 포함
 */

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import TransactionList from './TransactionList'
import AIAnalysisSummary from './AIAnalysisSummary'

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

interface AIAnalysis {
  id: string
  summary: string
  analysisDate: Date
}

interface DailyData {
  date: Date
  totalAssets: number
  currentCash: number
  totalReturn: number
  transactions: Transaction[]
  aiAnalysis?: AIAnalysis | null
}

interface DailyJournalCardProps {
  data: DailyData
  onViewAnalysis?: (date: string) => void
}

export default function DailyJournalCard({
  data,
  onViewAnalysis,
}: DailyJournalCardProps) {
  const [isTransactionsExpanded, setIsTransactionsExpanded] = useState(false)

  const { date, totalAssets, currentCash, totalReturn, transactions, aiAnalysis } =
    data

  const dateStr = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  const assetChange = totalReturn >= 0 ? '+' : ''
  const assetChangeColor = totalReturn >= 0 ? 'text-red-600' : 'text-blue-600'

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* 날짜 헤더 */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">{dateStr}</h3>
      </div>

      <div className="p-6 space-y-6">
        {/* 자산 변동 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">총 자산</p>
              <p className="text-lg font-bold text-gray-900">
                {totalAssets.toLocaleString()}원
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">현금</p>
              <p className="text-lg font-semibold text-gray-700">
                {currentCash.toLocaleString()}원
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">수익률</p>
              <p className={`text-lg font-bold ${assetChangeColor}`}>
                {assetChange}
                {totalReturn.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* 거래 내역 */}
        <div>
          <button
            onClick={() => setIsTransactionsExpanded(!isTransactionsExpanded)}
            className="w-full flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-gray-800">
                거래 내역
              </span>
              <span className="text-sm text-gray-500">
                ({transactions.length}건)
              </span>
            </div>
            {isTransactionsExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {isTransactionsExpanded && (
            <div className="mt-3">
              {transactions.length > 0 ? (
                <TransactionList transactions={transactions} />
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  거래 내역이 없습니다
                </p>
              )}
            </div>
          )}
        </div>

        {/* AI 분석 */}
        {aiAnalysis ? (
          <AIAnalysisSummary
            analysis={aiAnalysis}
            onViewDetail={() =>
              onViewAnalysis?.(
                date.toISOString().split('T')[0] // YYYY-MM-DD
              )
            }
          />
        ) : transactions.length > 0 ? (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">
              AI 분석이 아직 생성되지 않았습니다
            </p>
            <p className="text-xs text-gray-500 mt-1">
              매일 19:00에 자동으로 생성됩니다
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
