/**
 * TransactionList - 거래 내역 목록 컴포넌트
 */

'use client'

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

interface TransactionListProps {
  transactions: Transaction[]
}

export default function TransactionList({ transactions }: TransactionListProps) {
  return (
    <div className="space-y-3">
      {transactions.map((tx) => {
        const time = new Date(tx.createdAt).toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        })

        const isBuy = tx.type === 'BUY'
        const typeBadge = isBuy
          ? 'bg-red-100 text-red-800'
          : 'bg-blue-100 text-blue-800'
        const typeText = isBuy ? '매수' : '매도'

        return (
          <div
            key={tx.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${typeBadge}`}
                >
                  {typeText}
                </span>
                <span className="text-sm font-medium text-gray-800">
                  {tx.stockName}
                </span>
                <span className="text-xs text-gray-500">({tx.stockCode})</span>
              </div>
              <span className="text-xs text-gray-500">{time}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">수량: </span>
                <span className="font-medium">{tx.quantity}주</span>
              </div>
              <div>
                <span className="text-gray-600">가격: </span>
                <span className="font-medium">
                  {tx.price.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-gray-600">총액: </span>
                <span className="font-semibold text-gray-900">
                  {tx.totalAmount.toLocaleString()}원
                </span>
              </div>
              <div>
                <span className="text-gray-600">수수료: </span>
                <span className="text-gray-700">{tx.fee.toLocaleString()}원</span>
              </div>
            </div>

            {tx.note && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">메모: </span>
                  {tx.note}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
