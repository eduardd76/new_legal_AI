import { getCurrentUser } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload } from 'lucide-react'
import Link from 'next/link'

export default async function DocumentsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-gray-600 mt-2">Manage your uploaded contracts and analyses</p>
        </div>
        <Link href="/dashboard/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      {documents && documents.length > 0 ? (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/dashboard/documents/${doc.id}`}>
              <Card className="hover:border-blue-500 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <FileText className="h-10 w-10 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{doc.filename}</h3>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge variant="outline">{doc.status}</Badge>
                          {doc.contract_type && (
                            <Badge variant="secondary">{doc.contract_type}</Badge>
                          )}
                          {doc.word_count && (
                            <span className="text-sm text-gray-500">{doc.word_count} words</span>
                          )}
                        </div>
                        {doc.status === 'analyzed' && (
                          <div className="mt-2 flex gap-4 text-sm">
                            <span className="text-gray-600">
                              Risk: <span className={doc.overall_risk_score && doc.overall_risk_score > 0.7 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                                {doc.overall_risk_score ? (doc.overall_risk_score * 100).toFixed(0) : 'N/A'}%
                              </span>
                            </span>
                            <span className="text-gray-600">
                              Compliance: <span className="text-green-600 font-semibold">
                                {doc.compliance_score ? (doc.compliance_score * 100).toFixed(0) : 'N/A'}%
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 text-right">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
            <p className="text-gray-500 mb-6 text-center max-w-md">
              Upload your first contract to get started with AI-powered analysis
            </p>
            <Link href="/dashboard/upload">
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Your First Document
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
