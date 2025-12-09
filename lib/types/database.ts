// Database types for AI Contract Review Application

export type UserRole = 'legal_professional' | 'business_user' | 'admin';

export type DocumentStatus = 
  | 'uploading' 
  | 'processing' 
  | 'analyzed' 
  | 'failed' 
  | 'archived';

export type ContractType =
  | 'b2b_services'
  | 'b2c'
  | 'employment'
  | 'nda'
  | 'license'
  | 'software_development'
  | 'purchase_agreement'
  | 'lease'
  | 'partnership'
  | 'loan'
  | 'other';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type CommentType = 'info' | 'warning' | 'suggestion' | 'revision';

export type CommentStatus = 'open' | 'resolved' | 'rejected';

export type AIProvider = 'claude-sonnet-4' | 'gpt-4' | 'local' | 'mock';

export type AnalysisStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  organization_id?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  max_users: number;
  max_documents_per_month: number;
  created_at: string;
  updated_at: string;
  settings: Record<string, any>;
}

export interface Document {
  id: string;
  user_id: string;
  organization_id?: string;
  filename: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  contract_type?: ContractType;
  detected_language: string;
  status: DocumentStatus;
  page_count?: number;
  word_count?: number;
  has_scanned_pages: boolean;
  ocr_completed: boolean;
  overall_risk_score?: number;
  compliance_score?: number;
  created_at: string;
  updated_at: string;
  analyzed_at?: string;
  metadata: Record<string, any>;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  created_by: string;
  created_at: string;
  changes_summary?: string;
  metadata: Record<string, any>;
}

export interface DocumentClause {
  id: string;
  document_id: string;
  clause_number?: string;
  clause_type: string;
  heading?: string;
  content: string;
  start_char: number;
  end_char: number;
  page_number?: number;
  parent_clause_id?: string;
  order_index: number;
  created_at: string;
  metadata: Record<string, any>;
}

export interface Analysis {
  id: string;
  document_id: string;
  ai_provider: AIProvider;
  model_version: string;
  status: AnalysisStatus;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  tokens_used?: number;
  cost_usd?: number;
  issues_found: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  error_message?: string;
  metadata: Record<string, any>;
}

export interface LegalReference {
  law: string;
  article: string;
  url?: string;
  relevance_score?: number;
}

export interface Comment {
  id: string;
  document_id: string;
  clause_id?: string;
  analysis_id?: string;
  comment_type: CommentType;
  risk_level?: RiskLevel;
  status: CommentStatus;
  title: string;
  content: string;
  suggested_revision?: string;
  is_ai_generated: boolean;
  confidence_score?: number;
  legal_references: LegalReference[];
  created_by?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface CommentAction {
  id: string;
  comment_id: string;
  user_id: string;
  action: 'accepted' | 'rejected' | 'modified';
  note?: string;
  created_at: string;
}

export interface LegislativeDoc {
  id: string;
  law_name: string;
  law_number?: string;
  article_number?: string;
  jurisdiction: 'romania' | 'eu';
  title: string;
  content: string;
  full_text?: string;
  effective_date?: string;
  amendment_date?: string;
  is_active: boolean;
  source_url?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export interface Embedding {
  id: string;
  legislative_doc_id?: string;
  clause_id?: string;
  content: string;
  embedding: number[];
  chunk_index?: number;
  token_count?: number;
  created_at: string;
  metadata: Record<string, any>;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  organization_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  created_at: string;
}

export interface DataRetentionPolicy {
  id: string;
  organization_id?: string;
  resource_type: string;
  retention_days: number;
  auto_delete: boolean;
  created_at: string;
  updated_at: string;
}

export interface LegislativeChange {
  id: string;
  legislative_doc_id: string;
  change_type: 'amended' | 'repealed' | 'replaced';
  change_date: string;
  description?: string;
  affected_document_ids: string[];
  notified: boolean;
  notified_at?: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Extended types with relations
export interface DocumentWithAnalysis extends Document {
  latest_analysis?: Analysis;
  comments_count?: number;
  unresolved_high_risk_count?: number;
}

export interface CommentWithDetails extends Comment {
  clause?: DocumentClause;
  created_by_user?: User;
  resolved_by_user?: User;
}

export interface AnalysisWithStats extends Analysis {
  document?: Document;
  comments?: Comment[];
}
