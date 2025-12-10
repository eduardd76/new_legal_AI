import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { NextRequest, NextResponse } from 'next/server'
import { extractTextFromPDF, extractTextFromDOCX, parseDocumentStructure, detectContractType } from '@/lib/document-processing/extractor'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]

export async function POST(request: NextRequest) {
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
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        organization_id: user.organization_id,
        filename: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: filePath,
        status: 'processing',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([filePath])
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      )
    }

    // Extract text from the uploaded file
    console.log(`[UPLOAD] Starting text extraction for ${document.id}`)
    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(filePath)

      if (downloadError) {
        console.error(`[UPLOAD] Failed to download file for extraction:`, downloadError)
        throw new Error('Failed to download file for processing')
      }

      // Convert to Buffer
      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Extract text based on file type
      let processedDoc: { text: string; wordCount: number; pageCount?: number } | null = null
      if (file.type === 'application/pdf') {
        console.log(`[UPLOAD] Extracting from PDF...`)
        processedDoc = await extractTextFromPDF(buffer)
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        console.log(`[UPLOAD] Extracting from DOCX...`)
        processedDoc = await extractTextFromDOCX(buffer)
      }

      if (!processedDoc) {
        throw new Error('Failed to extract text from document')
      }

      const extractedText = processedDoc.text
      console.log(`[UPLOAD] Extracted ${extractedText.length} characters`)

      // Parse document structure
      const clauses = parseDocumentStructure(extractedText)
      console.log(`[UPLOAD] Parsed ${clauses.length} clauses`)

      // Detect contract type
      const contractType = detectContractType(extractedText)
      console.log(`[UPLOAD] Detected contract type: ${contractType}`)

      // Update document with extracted data
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          extracted_text: extractedText,
          word_count: extractedText.split(/\s+/).length,
          contract_type: contractType,
          status: 'ready', // Mark as ready for analysis
        })
        .eq('id', document.id)

      if (updateError) {
        console.error(`[UPLOAD] Failed to update document:`, updateError)
        throw new Error('Failed to update document with extracted text')
      }

      // Store clauses
      if (clauses.length > 0) {
        const clauseRecords = clauses.map((clause, index) => ({
          document_id: document.id,
          clause_number: clause.clause_number || String(index + 1),
          clause_title: clause.heading || clause.clause_type,
          clause_text: clause.content,
          start_position: clause.start_char,
          end_position: clause.end_char,
        }))

        const { error: clauseError } = await supabase
          .from('document_clauses')
          .insert(clauseRecords)

        if (clauseError) {
          console.error(`[UPLOAD] Failed to insert clauses:`, clauseError)
          // Don't fail the whole request if clauses fail
        } else {
          console.log(`[UPLOAD] Inserted ${clauses.length} clauses`)
        }
      }

      console.log(`[UPLOAD] Text extraction completed successfully for ${document.id}`)
    } catch (extractError: any) {
      console.error(`[UPLOAD] Text extraction failed:`, extractError)
      // Mark document as having extraction error but don't fail the upload
      await supabase
        .from('documents')
        .update({
          status: 'error',
          error_message: extractError.message,
        })
        .eq('id', document.id)
    }

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
