import { getCurrentUser } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentViewer } from '@/components/document/document-viewer'

export default async function DocumentViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id: documentId } = await params

  const supabase = await createClient()

  // Fetch document
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  if (docError || !document) {
    redirect('/dashboard/documents')
  }

  // Fetch latest analysis
  const { data: analysis } = await supabase
    .from('analyses')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Fetch comments
  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })

  // Fetch clauses
  const { data: clauses } = await supabase
    .from('document_clauses')
    .select('*')
    .eq('document_id', documentId)
    .order('order_index', { ascending: true })

  return (
    <DocumentViewer
      document={document}
      analysis={analysis}
      comments={comments || []}
      clauses={clauses || []}
    />
  )
}
