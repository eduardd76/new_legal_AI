import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { NextRequest, NextResponse } from 'next/server'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]

// Vercel route configuration - fast upload without text extraction
export const runtime = 'nodejs'
export const maxDuration = 10 // 10 seconds - works on Hobby plan (extraction moved to analyze endpoint)

export async function POST(request: NextRequest) {
  console.log('[UPLOAD] Request received at', new Date().toISOString())

  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and DOCX files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      )
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      )
    }

    // Create document record
    console.log('[UPLOAD] Creating document record for user:', user.id)

    const documentData: any = {
      user_id: user.id,
      filename: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: filePath,
      status: 'uploading', // Valid enum: uploading|processing|analyzed|failed|archived
    }

    // Only add organization_id if it exists (not all users have organizations)
    if (user.organization_id) {
      documentData.organization_id = user.organization_id
    }

    console.log('[UPLOAD] Document data:', JSON.stringify(documentData, null, 2))

    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single()

    if (dbError) {
      console.error('[UPLOAD] Database error details:', JSON.stringify({
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        code: dbError.code
      }, null, 2))

      // Clean up uploaded file
      await supabase.storage.from('documents').remove([filePath])

      return NextResponse.json(
        {
          error: 'Failed to create document record',
          details: dbError.message
        },
        { status: 500 }
      )
    }

    console.log(`[UPLOAD] Document uploaded successfully: ${document.id}`)
    console.log('[UPLOAD] Text extraction will occur when user clicks Analyze button (Hobby plan friendly - <10s upload)')

    // Create audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      organization_id: user.organization_id,
      action: 'document_upload',
      resource_type: 'document',
      resource_id: document.id,
      details: {
        filename: file.name,
        file_size: file.size,
        file_type: file.type,
      },
    })

    return NextResponse.json({
      success: true,
      document,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
