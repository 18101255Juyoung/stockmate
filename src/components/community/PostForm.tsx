'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Holding {
  stockCode: string
  stockName: string
  quantity: number
  avgPrice: number
  currentPrice: number
}

interface PostFormProps {
  mode: 'create' | 'edit'
  initialData?: {
    id?: string
    title: string
    content: string
    imageUrls?: string[]
    stockCode?: string
    stockName?: string
    returnRate?: number
  }
  onCancel?: () => void
}

export default function PostForm({
  mode,
  initialData,
  onCancel,
}: PostFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(initialData?.title || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [imageUrls, setImageUrls] = useState<string[]>(initialData?.imageUrls || [])
  const [selectedHolding, setSelectedHolding] = useState<string>(initialData?.stockCode || '')
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch holdings on mount (only for create mode)
  useEffect(() => {
    if (mode === 'create') {
      fetchHoldings()
    }
  }, [mode])

  const fetchHoldings = async () => {
    setIsLoadingHoldings(true)
    try {
      const res = await fetch('/api/portfolio')
      if (!res.ok) throw new Error('Failed to fetch portfolio')

      const result = await res.json()
      if (result.success && result.data.portfolio?.holdings) {
        setHoldings(result.data.portfolio.holdings)
      }
    } catch (error) {
      console.error('Failed to load holdings:', error)
    } finally {
      setIsLoadingHoldings(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Limit to 3 images
    if (imageUrls.length + files.length > 3) {
      alert('최대 3개의 이미지만 업로드할 수 있습니다.')
      return
    }

    setIsUploadingImage(true)

    try {
      const uploadedUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) throw new Error('Upload failed')

        const result = await res.json()
        if (result.success) {
          uploadedUrls.push(result.data.url)
        }
      }

      setImageUrls([...imageUrls, ...uploadedUrls])
    } catch (error) {
      console.error('Image upload error:', error)
      alert('이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      alert('제목과 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      const url =
        mode === 'create' ? '/api/posts' : `/api/posts/${initialData?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      // Calculate return rate if holding is selected
      let holdingData = {}
      if (selectedHolding) {
        const holding = holdings.find((h) => h.stockCode === selectedHolding)
        if (holding) {
          const returnRate =
            ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100
          holdingData = {
            stockCode: holding.stockCode,
            stockName: holding.stockName,
            returnRate: Math.round(returnRate * 100) / 100,
          }
        }
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          imageUrls,
          ...holdingData,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save post')
      }

      const result = await res.json()

      if (result.success) {
        router.push(`/community/${result.data.post.id}`)
        router.refresh()
      }
    } catch (error) {
      console.error('Post save error:', error)
      alert('게시글 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get selected holding details for display
  const selectedHoldingDetails = holdings.find((h) => h.stockCode === selectedHolding)
  const selectedReturnRate = selectedHoldingDetails
    ? ((selectedHoldingDetails.currentPrice - selectedHoldingDetails.avgPrice) /
        selectedHoldingDetails.avgPrice) *
      100
    : 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          제목
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="게시글 제목을 입력하세요"
          maxLength={200}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label
          htmlFor="content"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          내용
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[300px]"
          placeholder="투자 인사이트를 공유해주세요..."
          disabled={isSubmitting}
        />
      </div>

      {/* Image Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          이미지 (선택사항, 최대 3개)
        </label>

        <div className="space-y-3">
          {/* Image Previews */}
          {imageUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <div className="relative w-full h-32 border border-gray-300 rounded-md overflow-hidden">
                    <Image
                      src={url}
                      alt={`Upload ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          {imageUrls.length < 3 && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploadingImage || isSubmitting}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage || isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingImage ? '업로드 중...' : '이미지 추가'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Holding Selection */}
      {mode === 'create' && (
        <div>
          <label
            htmlFor="holding"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            보유 종목 (선택사항)
          </label>
          {isLoadingHoldings ? (
            <p className="text-sm text-gray-500">보유 종목 로딩 중...</p>
          ) : holdings.length === 0 ? (
            <p className="text-sm text-gray-500">보유 중인 종목이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              <select
                id="holding"
                value={selectedHolding}
                onChange={(e) => setSelectedHolding(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                <option value="">선택 안 함</option>
                {holdings.map((holding) => {
                  const returnRate =
                    ((holding.currentPrice - holding.avgPrice) / holding.avgPrice) * 100
                  return (
                    <option key={holding.stockCode} value={holding.stockCode}>
                      {holding.stockName} ({holding.stockCode}) -{' '}
                      {returnRate >= 0 ? '+' : ''}
                      {returnRate.toFixed(2)}%
                    </option>
                  )
                })}
              </select>

              {/* Selected Holding Display */}
              {selectedHoldingDetails && (
                <div
                  className={`p-3 rounded-md border ${
                    selectedReturnRate >= 0
                      ? 'bg-red-50 border-red-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {selectedHoldingDetails.stockName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedHoldingDetails.stockCode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${
                          selectedReturnRate >= 0 ? 'text-red-600' : 'text-blue-600'
                        }`}
                      >
                        {selectedReturnRate >= 0 ? '+' : ''}
                        {selectedReturnRate.toFixed(2)}%
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedHoldingDetails.currentPrice.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? '저장 중...'
            : mode === 'create'
            ? '게시하기'
            : '수정하기'}
        </button>
      </div>
    </form>
  )
}
