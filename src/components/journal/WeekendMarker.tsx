/**
 * WeekendMarker - 주말/휴장일 표시 컴포넌트
 */

'use client'

interface WeekendMarkerProps {
  date: Date
}

export default function WeekendMarker({ date }: WeekendMarkerProps) {
  const dateStr = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 py-4 px-6">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-gray-600">{dateStr}</span>
        <span className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-full font-medium">
          🔒 휴장
        </span>
      </div>
    </div>
  )
}
