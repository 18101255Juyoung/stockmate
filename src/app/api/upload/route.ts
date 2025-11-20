import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Image Upload API
 * POST /api/upload
 * Uploads images to /public/uploads and returns URL
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_MISSING_FILE',
            message: 'No file provided',
          },
        },
        { status: 400 }
      )
    }

    // Validate file type (only images)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_INVALID_FILE_TYPE',
            message: 'Only image files are allowed (JPEG, PNG, GIF, WebP)',
          },
        },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_FILE_TOO_LARGE',
            message: 'File size must be less than 5MB',
          },
        },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = path.extname(file.name)
    const filename = `${timestamp}-${randomString}${extension}`

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save to /public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    const filepath = path.join(uploadDir, filename)

    await writeFile(filepath, buffer)

    // Return URL path
    const url = `/uploads/${filename}`

    return NextResponse.json({
      success: true,
      data: {
        url,
        filename,
        size: file.size,
        type: file.type,
      },
    })
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to upload image',
        },
      },
      { status: 500 }
    )
  }
}
