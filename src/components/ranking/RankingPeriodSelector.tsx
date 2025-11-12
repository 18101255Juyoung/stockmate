'use client'

interface RankingPeriodSelectorProps {
  selectedPeriod: 'WEEKLY' | 'MONTHLY' | 'ALL_TIME'
  onPeriodChange: (period: 'WEEKLY' | 'MONTHLY' | 'ALL_TIME') => void
}

export default function RankingPeriodSelector({
  selectedPeriod,
  onPeriodChange,
}: RankingPeriodSelectorProps) {
  const periods = [
    { value: 'WEEKLY', label: '주간' },
    { value: 'MONTHLY', label: '월간' },
    { value: 'ALL_TIME', label: '전체' },
  ] as const

  return (
    <div className="flex gap-2 border-b">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onPeriodChange(period.value)}
          className={`px-6 py-3 font-medium transition-colors ${
            selectedPeriod === period.value
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  )
}
