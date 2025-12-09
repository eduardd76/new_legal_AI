import { getCurrentUser } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, FileText, File } from 'lucide-react'

export default async function ExportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id: documentId } = await params

  const supabase = await createClient()

  const { data: document, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  if (error || !document) {
    redirect('/dashboard/documents')
  }

  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('document_id', documentId)

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Export Document</h1>
        <p className="text-gray-600 mt-2">{document.filename}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle>DOCX with Track Changes</CardTitle>
                <CardDescription>Microsoft Word format with comments</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✓ Original document text</li>
              <li>✓ AI-generated comments in margins</li>
              <li>✓ Suggested revisions as track changes</li>
              <li>✓ Legal references included</li>
            </ul>
            <Button className="w-full" disabled>
              <Download className="mr-2 h-4 w-4" />
              Download DOCX (Coming Soon)
            </Button>
            <p className="text-xs text-gray-500">
              Full implementation requires docx generation library
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <File className="h-8 w-8 text-red-600" />
              <div>
                <CardTitle>PDF with Annotations</CardTitle>
                <CardDescription>Annotated PDF report</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✓ Document with highlights</li>
              <li>✓ Risk flags and warnings</li>
              <li>✓ Comment annotations</li>
              <li>✓ Executive summary page</li>
            </ul>
            <Button className="w-full" variant="outline" disabled>
              <Download className="mr-2 h-4 w-4" />
              Download PDF (Coming Soon)
            </Button>
            <p className="text-xs text-gray-500">
              Full implementation requires PDF generation library
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Risk Summary Report</CardTitle>
          <CardDescription>Executive summary of analysis findings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Overall Risk</div>
                <div className="text-2xl font-bold text-red-600">
                  {document.overall_risk_score ? (document.overall_risk_score * 100).toFixed(0) : 'N/A'}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Compliance</div>
                <div className="text-2xl font-bold text-green-600">
                  {document.compliance_score ? (document.compliance_score * 100).toFixed(0) : 'N/A'}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Issues Found</div>
                <div className="text-2xl font-bold">{comments?.length || 0}</div>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              <p className="mb-2"><strong>Summary:</strong></p>
              <p>
                This {document.contract_type || 'contract'} has been analyzed for compliance with 
                Romanian and EU law. The analysis identified {comments?.length || 0} potential issues, 
                including {comments?.filter(c => c.risk_level === 'high' || c.risk_level === 'critical').length || 0} high-priority 
                items requiring immediate attention.
              </p>
            </div>

            <Button className="w-full" variant="outline" disabled>
              <Download className="mr-2 h-4 w-4" />
              Download Summary Report (Coming Soon)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
