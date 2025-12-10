import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { NextRequest, NextResponse } from 'next/server'
import { getDefaultProvider } from '@/lib/ai/provider'
import { extractTextFromPDF, extractTextFromDOCX, parseDocumentStructure } from '@/lib/document-processing/extractor'
import { withTimeout, TIMEOUTS, TimeoutError } from '@/lib/utils/timeout'

// Vercel serverless function configuration
export const runtime = 'nodejs'
export const maxDuration = 60 // Maximum duration in seconds (Vercel Pro limit)

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  let documentId: string | null = null

  try {
    console.log('[ANALYZE] Starting analysis request')

    const user = await requireAuth()
    const supabase = await createClient()
    const { id } = await context.params
    documentId = id

    console.log('[ANALYZE] Document ID:', documentId)
    console.log('[ANALYZE] User ID:', user.id)

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      console.error('[ANALYZE] Document not found:', docError)
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    console.log('[ANALYZE] Document found:', {
      filename: document.filename,
      fileType: document.file_type,
      status: document.status
    })

    if (document.status === 'analyzed') {
      console.log('[ANALYZE] Document already analyzed')
      return NextResponse.json(
        { error: 'Document already analyzed. Use re-analyze if you want to analyze again.' },
        { status: 400 }
      )
    }

    // Update status to processing
    console.log('[ANALYZE] Setting status to processing')
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)

    // Download document from storage
    console.log('[ANALYZE] Downloading file from storage:', document.storage_path)
    const downloadStart = Date.now()

    const { data: fileData, error: downloadError} = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError || !fileData) {
      console.error('[ANALYZE] Download error:', downloadError)
      throw new Error('Failed to download document from storage: ' + downloadError?.message)
    }

    const downloadDuration = Date.now() - downloadStart
    console.log('[ANALYZE] File downloaded in', downloadDuration, 'ms, size:', fileData.size)

    // Extract text based on file type
    const buffer = Buffer.from(await fileData.arrayBuffer())
    let processedDoc

    console.log('[ANALYZE] Extracting text, file type:', document.file_type)
    const extractStart = Date.now()

    if (document.file_type === 'application/pdf') {
      processedDoc = await extractTextFromPDF(buffer)
    } else if (document.file_type.includes('wordprocessingml')) {
      processedDoc = await extractTextFromDOCX(buffer)
    } else {
      throw new Error(`Unsupported file type: ${document.file_type}. Please upload PDF or DOCX files.`)
    }

    const extractDuration = Date.now() - extractStart
    console.log('[ANALYZE] Text extracted in', extractDuration, 'ms')
    console.log('[ANALYZE] Extracted text length:', processedDoc.text.length, 'chars')
    console.log('[ANALYZE] Word count:', processedDoc.wordCount)

    // Parse document structure
    console.log('[ANALYZE] Parsing document structure')
    const parseStart = Date.now()
    const clauses = parseDocumentStructure(processedDoc.text)
    const parseDuration = Date.now() - parseStart
    console.log('[ANALYZE] Parsed', clauses.length, 'clauses in', parseDuration, 'ms')

    // Update document with extracted info
    console.log('[ANALYZE] Updating document metadata')
    await supabase
      .from('documents')
      .update({
        page_count: processedDoc.pageCount,
        word_count: processedDoc.wordCount,
        has_scanned_pages: processedDoc.hasScannedPages,
      })
      .eq('id', documentId)

    // Insert clauses
    if (clauses.length > 0) {
      console.log('[ANALYZE] Inserting', clauses.length, 'clauses')
      const { error: clausesError } = await supabase.from('document_clauses').insert(
        clauses.map(clause => ({
          document_id: documentId,
          ...clause,
        }))
      )

      if (clausesError) {
        console.warn('[ANALYZE] Error inserting clauses:', clausesError)
        // Don't fail the whole analysis if clause insertion fails
      }
    }

    // Get AI provider configuration
    console.log('[ANALYZE] Initializing AI provider')
    const provider = getDefaultProvider()
    const providerName = process.env.AI_PROVIDER || 'mock'
    console.log('[ANALYZE] Using AI provider:', providerName)

    // Create analysis record
    const modelVersion = providerName === 'mock' ? 'mock-v1' :
                        providerName === 'claude-sonnet-4' ? 'claude-sonnet-4.5-20250929' :
                        providerName === 'gpt-4' ? 'gpt-4-turbo' : 'unknown'

    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        document_id: documentId,
        ai_provider: providerName,
        model_version: modelVersion,
        status: 'in_progress',
      })
      .select()
      .single()

    if (analysisError) {
      console.error('[ANALYZE] Failed to create analysis record:', analysisError)
      throw new Error('Failed to create analysis record: ' + analysisError.message)
    }

    console.log('[ANALYZE] Analysis record created:', analysis.id)

    // Run AI analysis with timeout
    console.log('[ANALYZE] Starting AI analysis')
    const aiStart = Date.now()

    const aiResponse = await withTimeout(
      provider.analyze({
        documentText: processedDoc.text,
        contractType: document.contract_type || undefined,
      }),
      TIMEOUTS.AI_ANALYSIS,
      'AI analysis timed out. The document may be too long or complex. Please try a shorter document or contact support.'
    )

    const aiDuration = Date.now() - aiStart
    console.log('[ANALYZE] AI analysis completed in', aiDuration, 'ms')
    console.log('[ANALYZE] Found', aiResponse.analysis.issues.length, 'issues')

    // Store analysis results
    await supabase
      .from('analyses')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        tokens_used: aiResponse.tokens_used,
        cost_usd: aiResponse.cost_usd,
        issues_found: aiResponse.analysis.issues.length,
        high_risk_count: aiResponse.analysis.issues.filter(i => i.risk_level === 'high' || i.risk_level === 'critical').length,
        medium_risk_count: aiResponse.analysis.issues.filter(i => i.risk_level === 'medium').length,
        low_risk_count: aiResponse.analysis.issues.filter(i => i.risk_level === 'low').length,
      })
      .eq('id', analysis.id)

    // Store AI-generated comments
    const comments = aiResponse.analysis.issues.map(issue => ({
      document_id: documentId,
      analysis_id: analysis.id,
      comment_type: issue.risk_level === 'critical' || issue.risk_level === 'high' ? 'warning' : 'suggestion',
      risk_level: issue.risk_level,
      title: issue.title,
      content: issue.description,
      suggested_revision: issue.suggested_revision,
      is_ai_generated: true,
      confidence_score: issue.confidence,
      legal_references: issue.legal_references || [],
      status: 'open',
    }))

    if (comments.length > 0) {
      await supabase.from('comments').insert(comments)
    }

    // Update document status and scores
    await supabase
      .from('documents')
      .update({
        status: 'analyzed',
        analyzed_at: new Date().toISOString(),
        overall_risk_score: aiResponse.analysis.overall_risk_score,
        compliance_score: aiResponse.analysis.compliance_score,
        contract_type: aiResponse.analysis.contract_type,
      })
      .eq('id', documentId)

    // Create audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'analysis_completed',
      resource_type: 'document',
      resource_id: documentId,
      details: {
        analysis_id: analysis.id,
        issues_found: aiResponse.analysis.issues.length,
        tokens_used: aiResponse.tokens_used,
      },
    })

    const totalDuration = Date.now() - startTime
    console.log('[ANALYZE] ✅ Analysis completed successfully in', totalDuration, 'ms')

    return NextResponse.json({
      success: true,
      analysis_id: analysis.id,
      issues_found: aiResponse.analysis.issues.length,
      overall_risk_score: aiResponse.analysis.overall_risk_score,
      duration_ms: totalDuration,
    })

  } catch (error: any) {
    const totalDuration = Date.now() - startTime
    console.error('[ANALYZE] ❌ Analysis failed after', totalDuration, 'ms')
    console.error('[ANALYZE] Error details:', error)

    // Determine user-friendly error message
    let userMessage = 'Analysis failed. Please try again.'
    let statusCode = 500

    if (error instanceof TimeoutError) {
      userMessage = error.message
      statusCode = 408 // Request Timeout
      console.error('[ANALYZE] Timeout error:', error.message)
    } else if (error.message?.includes('Unsupported file type')) {
      userMessage = error.message
      statusCode = 400
    } else if (error.message?.includes('not found')) {
      userMessage = error.message
      statusCode = 404
    } else if (error.message) {
      userMessage = error.message
    }

    // Update document status to failed if we have a documentId
    if (documentId) {
      try {
        const supabase = await createClient()
        await supabase
          .from('documents')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId)

        console.log('[ANALYZE] Document status updated to failed')
      } catch (updateError) {
        console.error('[ANALYZE] Failed to update document status:', updateError)
      }
    }

    return NextResponse.json(
      {
        error: userMessage,
        error_type: error instanceof TimeoutError ? 'timeout' : 'processing_error',
        duration_ms: totalDuration,
      },
      { status: statusCode }
    )
  }
}
