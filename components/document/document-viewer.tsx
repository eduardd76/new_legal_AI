'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Download,
  Play,
  Loader2
} from 'lucide-react'
import type { Document, Analysis, Comment, DocumentClause } from '@/lib/types/database'

interface DocumentViewerProps {
  document: Document
  analysis: Analysis | null
  comments: Comment[]
  clauses: DocumentClause[]
}

export function DocumentViewer({ document, analysis, comments, clauses }: DocumentViewerProps) {
  const router = useRouter()
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError(null)
    try {
      console.log('[UI] Starting analysis for document:', document.id)
      const startTime = Date.now()

      const response = await fetch(`/api/documents/${document.id}/analyze`, {
        method: 'POST',
      })

      const duration = Date.now() - startTime
      console.log('[UI] Analysis response received in', duration, 'ms')

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[UI] Analysis failed:', errorData)

        // Show user-friendly error messages
        let errorMessage = errorData.error || 'Analysis failed'

        if (errorData.error_type === 'timeout') {
          errorMessage += '\n\nTip: Try simplifying your document or reducing its size.'
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('[UI] Analysis successful:', result)

      // Refresh page to show results
      router.refresh()
    } catch (error: any) {
      console.error('[UI] Analysis error:', error)
      setError(error.message)

      // Show error in alert as well
      alert(`Analysis failed:\n\n${error.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  const getRiskColor = (score?: number) => {
    if (!score) return 'text-gray-500'
    if (score >= 0.7) return 'text-red-600'
    if (score >= 0.4) return 'text-amber-600'
    return 'text-green-600'
  }

  const getRiskBadge = (level: string) => {
    const variants = {
      critical: { label: 'Critical', variant: 'destructive' },
      high: { label: 'High Risk', variant: 'destructive' },
      medium: { label: 'Medium Risk', variant: 'default' },
      low: { label: 'Low Risk', variant: 'secondary' },
    }
    return variants[level as keyof typeof variants] || variants.low
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-wrap">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{document.filename}</h1>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">{document.status}</Badge>
            {document.contract_type && (
              <Badge variant="secondary">{document.contract_type}</Badge>
            )}
            {document.word_count && (
              <span className="text-sm text-gray-500">{document.word_count} words</span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {document.status === 'analyzed' ? (
            <>
              <Button variant="outline" onClick={() => router.push(`/dashboard/documents/${document.id}/export`)}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Re-analyze
              </Button>
            </>
          ) : (
            <Button onClick={handleAnalyze} disabled={analyzing || document.status === 'processing'}>
              {analyzing || document.status === 'processing' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Analysis
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Analysis Summary */}
      {analysis && document.status === 'analyzed' && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Risk Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getRiskColor(document.overall_risk_score)}`}>
                {document.overall_risk_score ? (document.overall_risk_score * 100).toFixed(0) : 'N/A'}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {document.compliance_score ? (document.compliance_score * 100).toFixed(0) : 'N/A'}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Issues Found</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{comments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">High Risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {comments.filter(c => c.risk_level === 'high' || c.risk_level === 'critical').length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Split Pane: Document + Comments */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Document Text */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Content
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              {clauses.length > 0 ? (
                <div className="space-y-4 pr-4">
                  {clauses.map((clause) => (
                    <div key={clause.id} className="border-l-2 border-gray-200 pl-4">
                      {clause.clause_number && (
                        <div className="font-semibold text-blue-600 mb-1">
                          {clause.clause_number}
                        </div>
                      )}
                      {clause.heading && (
                        <div className="font-semibold text-gray-900 mb-2">
                          {clause.heading}
                        </div>
                      )}
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {clause.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {document.status === 'processing' ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p>Processing document...</p>
                    </>
                  ) : (
                    <p>Click &quot;Start Analysis&quot; to process this document</p>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Comments Panel */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              AI Analysis & Comments
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              {comments.length > 0 ? (
                <div className="space-y-4 pr-4">
                  {comments.map((comment) => {
                    const badge = getRiskBadge(comment.risk_level || 'low')
                    return (
                      <div
                        key={comment.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedCommentId === comment.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedCommentId(comment.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{comment.title}</h4>
                          <Badge variant={badge.variant as any}>{badge.label}</Badge>
                        </div>

                        <p className="text-sm text-gray-700 mb-3">{comment.content}</p>

                        {comment.suggested_revision && (
                          <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                            <div className="text-xs font-semibold text-green-800 mb-1">
                              Suggested Revision:
                            </div>
                            <p className="text-sm text-green-900">{comment.suggested_revision}</p>
                          </div>
                        )}

                        {comment.legal_references && comment.legal_references.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-600">Legal References:</div>
                            {comment.legal_references.map((ref: any, idx: number) => (
                              <div key={idx} className="text-xs text-blue-600">
                                {ref.law} - {ref.article}
                              </div>
                            ))}
                          </div>
                        )}

                        {comment.confidence_score && (
                          <div className="mt-2 text-xs text-gray-500">
                            Confidence: {(comment.confidence_score * 100).toFixed(0)}%
                          </div>
                        )}

                        {comment.is_ai_generated && (
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" variant="outline" className="text-xs">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Accept
                            </Button>
                            <Button size="sm" variant="outline" className="text-xs">
                              <XCircle className="mr-1 h-3 w-3" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {document.status === 'analyzed' ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p>No issues found! Contract looks good.</p>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                      <p>Analysis comments will appear here</p>
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
