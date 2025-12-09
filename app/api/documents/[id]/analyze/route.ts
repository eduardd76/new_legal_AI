import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { NextRequest, NextResponse } from 'next/server'
import { getDefaultProvider } from '@/lib/ai/provider'
import { extractTextFromPDF, extractTextFromDOCX, parseDocumentStructure } from '@/lib/document-processing/extractor'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { id: documentId } = await context.params

    // Get document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    if (document.status === 'analyzed') {
      return NextResponse.json(
        { error: 'Document already analyzed' },
        { status: 400 }
      )
    }

    // Update status to processing
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)

    // Download document from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError || !fileData) {
      throw new Error('Failed to download document from storage')
    }

    // Extract text based on file type
    const buffer = Buffer.from(await fileData.arrayBuffer())
    let processedDoc

    if (document.file_type === 'application/pdf') {
      processedDoc = await extractTextFromPDF(buffer)
    } else if (document.file_type.includes('wordprocessingml')) {
      processedDoc = await extractTextFromDOCX(buffer)
    } else {
      throw new Error('Unsupported file type')
    }

    // Parse document structure
    const clauses = parseDocumentStructure(processedDoc.text)

    // Update document with extracted info
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
      await supabase.from('document_clauses').insert(
        clauses.map(clause => ({
          document_id: documentId,
          ...clause,
        }))
      )
    }

    // Create analysis record
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        document_id: documentId,
        ai_provider: 'mock', // Will use getDefaultProvider() in production
        model_version: 'mock-v1',
        status: 'in_progress',
      })
      .select()
      .single()

    if (analysisError) {
      throw new Error('Failed to create analysis record')
    }

    // Run AI analysis
    const provider = getDefaultProvider()
    const aiResponse = await provider.analyze({
      documentText: processedDoc.text,
      contractType: document.contract_type || undefined,
    })

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

    return NextResponse.json({
      success: true,
      analysis_id: analysis.id,
      issues_found: aiResponse.analysis.issues.length,
      overall_risk_score: aiResponse.analysis.overall_risk_score,
    })

  } catch (error: any) {
    console.error('Analysis error:', error)

    // Get documentId from context
    const { id: documentId } = await context.params

    // Update document status to failed
    const supabase = await createClient()
    await supabase
      .from('documents')
      .update({ status: 'failed' })
      .eq('id', documentId)

    return NextResponse.json(
      { error: error.message || 'Analysis failed' },
      { status: 500 }
    )
  }
}
