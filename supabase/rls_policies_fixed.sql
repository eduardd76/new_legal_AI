-- ============================================
-- STORAGE BUCKETS (Skip if already exist)
-- ============================================

-- Create storage buckets (only if they don't exist)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('documents', 'documents', false),
  ('exports', 'exports', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legislative_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legislative_changes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can read their own data
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own data (except role)
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Admins can manage all users
CREATE POLICY "Admins can manage users" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- ORGANIZATIONS TABLE POLICIES
-- ============================================

-- Users can read their organization
CREATE POLICY "Users can read own organization" ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.organization_id = organizations.id
    )
  );

-- Admins can manage organizations
CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- DOCUMENTS TABLE POLICIES
-- ============================================

-- Users can read their own documents
CREATE POLICY "Users can read own documents" ON public.documents
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    -- Or documents in their organization
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.organization_id = documents.organization_id
    )
  );

-- Users can insert their own documents
CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own documents
CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- DOCUMENT CLAUSES POLICIES
-- ============================================

-- Users can read clauses for documents they have access to
CREATE POLICY "Users can read accessible clauses" ON public.document_clauses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_clauses.document_id
      AND (
        documents.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.organization_id = documents.organization_id
        )
      )
    )
  );

-- ============================================
-- ANALYSES POLICIES
-- ============================================

-- Users can read analyses for their documents
CREATE POLICY "Users can read own analyses" ON public.analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = analyses.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- ============================================
-- COMMENTS POLICIES
-- ============================================

-- Users can read comments for documents they have access to
CREATE POLICY "Users can read accessible comments" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = comments.document_id
      AND (
        documents.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.organization_id = documents.organization_id
        )
      )
    )
  );

-- Users can insert comments on documents they have access to
CREATE POLICY "Users can insert comments" ON public.comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = comments.document_id
      AND (
        documents.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.organization_id = documents.organization_id
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (created_by = auth.uid());

-- ============================================
-- LEGISLATIVE DOCS POLICIES (Public Read)
-- ============================================

-- Legislative docs are readable by all authenticated users
CREATE POLICY "Authenticated users can read legislative docs" ON public.legislative_docs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage legislative docs
CREATE POLICY "Admins can manage legislative docs" ON public.legislative_docs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- EMBEDDINGS POLICIES
-- ============================================

-- Authenticated users can read embeddings (for RAG)
CREATE POLICY "Authenticated users can read embeddings" ON public.embeddings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage embeddings
CREATE POLICY "Admins can manage embeddings" ON public.embeddings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================

-- Users can read their own audit logs
CREATE POLICY "Users can read own audit logs" ON public.audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- Admins can read all audit logs
CREATE POLICY "Admins can read all audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Documents bucket policies
CREATE POLICY "Users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Exports bucket policies
CREATE POLICY "Users can upload exports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own exports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own exports" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
