-- AI Contract Review Application Database Schema
-- For Supabase (PostgreSQL)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- For pgvector (RAG embeddings)

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('legal_professional', 'business_user', 'admin');
CREATE TYPE document_status AS ENUM ('uploading', 'processing', 'analyzed', 'failed', 'archived');
CREATE TYPE contract_type AS ENUM (
  'b2b_services',
  'b2c',
  'employment',
  'nda',
  'license',
  'software_development',
  'purchase_agreement',
  'lease',
  'partnership',
  'loan',
  'other'
);
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE comment_type AS ENUM ('info', 'warning', 'suggestion', 'revision');
CREATE TYPE comment_status AS ENUM ('open', 'resolved', 'rejected');
CREATE TYPE ai_provider AS ENUM ('claude-sonnet-4', 'gpt-4', 'local', 'mock');
CREATE TYPE analysis_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- ============================================
-- CORE TABLES
-- ============================================

-- Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'business_user',
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Organizations (for multi-tenant support)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  max_users INTEGER DEFAULT 5,
  max_documents_per_month INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- File metadata
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL, -- application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document
  storage_path TEXT NOT NULL, -- Supabase storage path
  
  -- Document classification
  contract_type contract_type,
  detected_language TEXT DEFAULT 'ro',
  status document_status NOT NULL DEFAULT 'uploading',
  
  -- Processing metadata
  page_count INTEGER,
  word_count INTEGER,
  has_scanned_pages BOOLEAN DEFAULT FALSE,
  ocr_completed BOOLEAN DEFAULT FALSE,
  
  -- Analysis summary
  overall_risk_score NUMERIC(3,2), -- 0.00 to 1.00
  compliance_score NUMERIC(3,2), -- 0.00 to 1.00
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Document Versions (for tracking changes)
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changes_summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(document_id, version_number)
);

-- Document Structure (clauses, sections, headings)
CREATE TABLE public.document_clauses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  
  -- Structure
  clause_number TEXT, -- e.g., "1", "1.1", "2.3.4"
  clause_type TEXT, -- title, article, paragraph, annex
  heading TEXT,
  content TEXT NOT NULL,
  
  -- Position in document
  start_char INTEGER NOT NULL,
  end_char INTEGER NOT NULL,
  page_number INTEGER,
  
  -- Parent-child relationships
  parent_clause_id UUID REFERENCES public.document_clauses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Analyses (one per document, tracks AI analysis runs)
CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  
  -- AI Provider used
  ai_provider ai_provider NOT NULL,
  model_version TEXT NOT NULL,
  
  -- Analysis metadata
  status analysis_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Cost tracking
  tokens_used INTEGER,
  cost_usd NUMERIC(10,4),
  
  -- Results summary
  issues_found INTEGER DEFAULT 0,
  high_risk_count INTEGER DEFAULT 0,
  medium_risk_count INTEGER DEFAULT 0,
  low_risk_count INTEGER DEFAULT 0,
  
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Comments (AI-generated + user-added)
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  clause_id UUID REFERENCES public.document_clauses(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
  
  -- Comment details
  comment_type comment_type NOT NULL,
  risk_level risk_level,
  status comment_status NOT NULL DEFAULT 'open',
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  suggested_revision TEXT,
  
  -- AI-generated or user-added
  is_ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
  confidence_score NUMERIC(3,2), -- 0.00 to 1.00 (only for AI comments)
  
  -- Legal references
  legal_references JSONB DEFAULT '[]'::jsonb, -- Array of {law, article, url}
  
  -- User interaction
  created_by UUID REFERENCES public.users(id),
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- User Actions on Comments (accept/reject suggestions)
CREATE TABLE public.comment_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  
  action TEXT NOT NULL, -- 'accepted', 'rejected', 'modified'
  note TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RAG & EMBEDDINGS TABLES
-- ============================================

-- Legislative Documents (Romanian & EU Law)
CREATE TABLE public.legislative_docs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Document identification
  law_name TEXT NOT NULL,
  law_number TEXT,
  article_number TEXT,
  jurisdiction TEXT NOT NULL, -- 'romania', 'eu'
  
  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  full_text TEXT, -- Original full text
  
  -- Metadata
  effective_date DATE,
  amendment_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  source_url TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Embeddings for RAG
CREATE TABLE public.embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Source reference
  legislative_doc_id UUID REFERENCES public.legislative_docs(id) ON DELETE CASCADE,
  clause_id UUID REFERENCES public.document_clauses(id) ON DELETE CASCADE,
  
  -- Content
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 / Claude embeddings size
  
  -- Metadata
  chunk_index INTEGER,
  token_count INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for vector similarity search
CREATE INDEX embeddings_vector_idx ON public.embeddings USING ivfflat (embedding vector_cosine_ops);

-- ============================================
-- AUDIT & COMPLIANCE TABLES
-- ============================================

-- Audit Logs (GDPR compliance)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  user_id UUID REFERENCES public.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  
  -- Action details
  action TEXT NOT NULL, -- 'document_upload', 'analysis_run', 'export', 'user_login', etc.
  resource_type TEXT, -- 'document', 'comment', 'user', etc.
  resource_id UUID,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Details
  details JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Data Retention Policies
CREATE TABLE public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  resource_type TEXT NOT NULL, -- 'documents', 'analyses', 'audit_logs'
  retention_days INTEGER NOT NULL,
  auto_delete BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Legislative Change Monitoring
CREATE TABLE public.legislative_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legislative_doc_id UUID NOT NULL REFERENCES public.legislative_docs(id) ON DELETE CASCADE,
  
  change_type TEXT NOT NULL, -- 'amended', 'repealed', 'replaced'
  change_date DATE NOT NULL,
  description TEXT,
  
  -- Affected documents
  affected_document_ids UUID[] DEFAULT '{}',
  
  notified BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_organization_id ON public.documents(organization_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);

CREATE INDEX idx_document_clauses_document_id ON public.document_clauses(document_id);
CREATE INDEX idx_document_clauses_parent_id ON public.document_clauses(parent_clause_id);

CREATE INDEX idx_comments_document_id ON public.comments(document_id);
CREATE INDEX idx_comments_clause_id ON public.comments(clause_id);
CREATE INDEX idx_comments_status ON public.comments(status);

CREATE INDEX idx_analyses_document_id ON public.analyses(document_id);
CREATE INDEX idx_analyses_status ON public.analyses(status);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

CREATE INDEX idx_legislative_docs_jurisdiction ON public.legislative_docs(jurisdiction);
CREATE INDEX idx_legislative_docs_is_active ON public.legislative_docs(is_active);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_legislative_docs_updated_at BEFORE UPDATE ON public.legislative_docs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA (Mock Legislative Texts)
-- ============================================

-- Insert mock Romanian Civil Code articles
INSERT INTO public.legislative_docs (law_name, law_number, article_number, jurisdiction, title, content, effective_date, is_active, source_url) VALUES
('Codul Civil', 'Law 287/2009', 'Art. 1270', 'romania', 'Libertatea contractuală', 'Părțile sunt libere să încheie orice contracte și să determine conținutul acestora, în limitele impuse de lege, de ordinea publică și de bunele moravuri.', '2011-10-01', TRUE, 'https://legislatie.just.ro/'),
('Codul Civil', 'Law 287/2009', 'Art. 1271', 'romania', 'Forța obligatorie a contractului', 'Contractul valabil încheiat are putere de lege între părțile contractante.', '2011-10-01', TRUE, 'https://legislatie.just.ro/'),
('Codul Civil', 'Law 287/2009', 'Art. 1350', 'romania', 'Clauze abuzive în contractele dintre profesioniști și consumatori', 'În contractele încheiate între profesioniști și consumatori sunt interzise clauzele care creează, în detrimentul consumatorului și contrar cerințelor bunei-credințe, un dezechilibru semnificativ între drepturile și obligațiile părților.', '2011-10-01', TRUE, 'https://legislatie.just.ro/');

-- Insert mock GDPR articles
INSERT INTO public.legislative_docs (law_name, law_number, article_number, jurisdiction, title, content, effective_date, is_active, source_url) VALUES
('GDPR', 'Regulation 2016/679', 'Art. 6', 'eu', 'Lawfulness of processing', 'Processing shall be lawful only if and to the extent that at least one of the following applies: (a) the data subject has given consent; (b) processing is necessary for the performance of a contract; (c) processing is necessary for compliance with a legal obligation...', '2018-05-25', TRUE, 'https://eur-lex.europa.eu/'),
('GDPR', 'Regulation 2016/679', 'Art. 17', 'eu', 'Right to erasure (right to be forgotten)', 'The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay...', '2018-05-25', TRUE, 'https://eur-lex.europa.eu/'),
('GDPR', 'Regulation 2016/679', 'Art. 32', 'eu', 'Security of processing', 'Taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing as well as the risk of varying likelihood and severity for the rights and freedoms of natural persons, the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk...', '2018-05-25', TRUE, 'https://eur-lex.europa.eu/');

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.documents IS 'Stores uploaded contract documents and their analysis status';
COMMENT ON TABLE public.document_clauses IS 'Hierarchical structure of document sections and clauses';
COMMENT ON TABLE public.comments IS 'AI-generated and user-added comments on document clauses';
COMMENT ON TABLE public.analyses IS 'Tracks AI analysis runs and their results';
COMMENT ON TABLE public.embeddings IS 'Vector embeddings for RAG-based legal reference retrieval';
COMMENT ON TABLE public.legislative_docs IS 'Romanian and EU legal texts for compliance checking';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for GDPR compliance';
