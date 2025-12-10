# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered legal contract review platform for Romanian & EU law compliance. It analyzes contracts, identifies risks, and provides compliance suggestions using Claude/OpenAI models.

**Tech Stack:** Next.js 16 + TypeScript + Supabase + Tailwind + shadcn/ui + Playwright

## Development Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build (~8s, generates 12 routes)
npm start                # Start production server

# Testing & Quality
npm test                 # Run all Playwright tests
npm run lint             # Run ESLint
npx playwright test --ui # Run tests with interactive UI
npx playwright test auth.spec.ts  # Run specific test file
npx playwright install   # Install test browsers (first time only)
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
# Supabase (required for auth/storage/database)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# AI Provider (choose one or use mock)
AI_PROVIDER=claude-sonnet-4  # Options: claude-sonnet-4, gpt-4, mock
AI_FALLBACK_PROVIDER=gpt-4   # Optional fallback provider
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-key

# Optional: Legislative database (mock in MVP)
LEGISLATIVE_DB_MODE=mock
```

## Architecture

### Multi-Provider AI System

The application uses a **provider abstraction pattern** at `lib/ai/provider.ts`:

- **Interface:** `IAIProvider` defines contract for AI providers
- **Factory:** `createAIProvider()` instantiates providers based on config
- **Implementations:** Claude (`providers/claude.ts`), OpenAI (`providers/openai.ts`), Mock (`providers/mock.ts`)
- **Usage:** `getDefaultProvider()` reads `AI_PROVIDER` from env

When adding new AI providers:
1. Implement `IAIProvider` interface
2. Add provider case to factory switch statement
3. Update `AIProvider` enum in `lib/types/database.ts`

### Document Processing Pipeline

Located in `lib/document-processing/extractor.ts`:

1. **Text Extraction:**
   - PDF: Uses `pdf-parse` library
   - DOCX: Uses `mammoth` library
   - OCR: Tesseract.js (placeholder in MVP)

2. **Structure Parsing:** `parseDocumentStructure()` identifies clauses by:
   - Numbered sections (1., 1.1, Art. 5)
   - Headings (ALL CAPS detection)
   - Paragraph grouping

3. **Contract Detection:** `detectContractType()` categorizes documents (employment, NDA, B2B, etc.)

### Database Schema

Supabase PostgreSQL schema in `supabase/schema.sql` with:

- **Core tables:** users, organizations, documents, document_clauses, analyses, comments
- **Supporting:** document_versions, legislative_docs, embeddings (pgvector), audit_logs
- **RLS policies:** Row-level security in `supabase/rls_policies.sql`

Key relationships:
- Documents → Analyses (1:many) - tracks AI analysis runs
- Documents → DocumentClauses (1:many) - parsed contract structure
- Analyses → Comments (1:many) - AI-generated issues/suggestions

### Route Structure

```
app/
├── page.tsx                              # Landing page
├── login/page.tsx, signup/page.tsx       # Authentication
├── dashboard/
│   ├── page.tsx                          # Dashboard home
│   ├── upload/page.tsx                   # Document upload UI
│   ├── documents/
│   │   ├── page.tsx                      # Document list
│   │   └── [id]/
│   │       ├── page.tsx                  # Document viewer + analysis
│   │       └── export/page.tsx           # Export options
│   └── profile/page.tsx                  # User profile
└── api/
    ├── auth/
    │   ├── login/route.ts                # Login endpoint
    │   └── logout/route.ts               # Logout endpoint
    └── documents/
        ├── upload/route.ts               # Upload + text extraction
        └── [id]/analyze/route.ts         # AI analysis endpoint
```

**Protected Routes:** `middleware.ts` uses `@supabase/ssr` to check authentication and redirects unauthenticated users from `/dashboard/*` to `/login`. The middleware refreshes sessions automatically and logs auth state for debugging.

### Type System

All types defined in `lib/types/database.ts`:

- **Enums:** UserRole, DocumentStatus, ContractType, RiskLevel, AIProvider, AnalysisStatus
- **Core entities:** User, Document, Analysis, Comment, DocumentClause
- **Extended types:** DocumentWithAnalysis, CommentWithDetails (include relations)

Types mirror database schema for type safety between frontend/backend.

## Key Patterns

### Authentication Flow

Uses `@supabase/ssr` for server-side auth:
- `lib/supabase/server.ts`: Server components/API routes
- `lib/supabase/client.ts`: Client components
- `lib/auth/utils.ts`: Helper functions (getCurrentUser, requireAuth)

Always use server-side auth for protected API routes.

### AI Analysis Flow

1. User uploads document → `api/documents/upload/route.ts`
2. Extract text → `lib/document-processing/extractor.ts`
3. Parse structure → Store in `document_clauses` table
4. User clicks "Analyze" → `api/documents/[id]/analyze/route.ts`
5. Get provider → `lib/ai/provider.ts:getDefaultProvider()`
6. Call `provider.analyze()` with prompts from `lib/ai/prompts.ts`
7. Store results in `analyses` and `comments` tables
8. Frontend polls for completion or uses real-time subscriptions

### Component Organization

- `components/ui/`: shadcn/ui components (button, card, dialog, etc.)
- `components/layout/`: App layout components (sidebar, header)
- `components/document/`: Document-specific components (document-viewer.tsx)

UI components use `lib/utils.ts:cn()` for className merging with tailwind-merge.

## Testing Strategy

Playwright tests in `tests/` directory:

- **Test suites:** `auth.spec.ts` (authentication flows), `e2e-complete.spec.ts` (full workflows)
- **Configuration:** `playwright.config.ts` - runs dev server automatically, uses Chromium
- **Run pattern:** Tests start dev server on port 3000, use `http://localhost:3000` as base URL
- **Coverage targets:** >80% for critical flows (auth, upload, analysis)

Run specific tests: `npx playwright test auth.spec.ts`
Debug mode: `npx playwright test --debug`
See `TESTING_GUIDE.md` for comprehensive testing checklist.

## Database Migrations

**Manual SQL execution** - no automated migration system in MVP:

1. Edit schema: `supabase/schema.sql` (tables, indexes, functions)
2. Edit RLS policies: `supabase/rls_policies.sql` (row-level security)
3. Run SQL in Supabase SQL Editor or via Supabase CLI
4. Update TypeScript types in `lib/types/database.ts` to match

**Important:** Multiple RLS policy files exist (`rls_policies_fix.sql`, `rls_policies_fixed.sql`, `rls_policies_idempotent.sql`) representing iterative fixes. Use `rls_policies.sql` as the canonical source. The idempotent version uses `DROP POLICY IF EXISTS` for safe re-runs.

## Performance Targets

- Document upload: <5s for 10MB files
- Text extraction: <3s for 20-page contracts
- AI analysis: <30s with mock, <60s with real providers
- Page loads: <2s

## Common Development Tasks

### Adding a New Contract Type

1. Add enum value to `contract_type` in `supabase/schema.sql`
2. Update `ContractType` in `lib/types/database.ts`
3. Add detection logic in `lib/document-processing/extractor.ts:detectContractType()`
4. Update prompts in `lib/ai/prompts.ts` for type-specific analysis

### Adding a New AI Provider

1. Create `lib/ai/providers/your-provider.ts` implementing `IAIProvider`
2. Add to factory switch in `lib/ai/provider.ts:createAIProvider()`
3. Add enum value to `AIProvider` type
4. Add API key handling in `getAPIKey()` and model mapping in `getModelName()`

### Adding Analysis Categories

Analysis results are flexible JSON. To add structured categories:

1. Extend `AnalysisIssue` or `AnalyzedClause` types in `lib/ai/provider.ts`
2. Update AI prompts in `lib/ai/prompts.ts` to return new structure
3. Update display logic in `app/dashboard/documents/[id]/page.tsx`

## Important Notes

- **AI Disclaimer:** All analysis results include disclaimers that this is NOT legal advice
- **GDPR Compliance:** Audit logging system tracks all data access (audit_logs table)
- **Multi-tenancy:** Organization support built-in but not fully activated in MVP
- **RAG System:** Embeddings table + pgvector ready for legislative database integration
- **Mock Mode:** Set `AI_PROVIDER=mock` for testing without API costs

## Debugging

### Authentication Issues

The middleware has comprehensive logging. Check console output for:
- `[Middleware v2] {pathname} - Checking auth...` - Shows which routes are checked
- `[Middleware v2] User: {email}` - Confirms user session state
- `[Middleware v2] REDIRECTING to /login` - Shows auth failures

Common auth issues in this project:
1. **Email confirmation required:** Supabase requires email verification by default. See `DISABLE_EMAIL_CONFIRMATION.md` for setup
2. **RLS policies:** Row-level security issues. Check `supabase/rls_policies.sql` and verify users can insert/read their own data
3. **Cookie issues:** Middleware manages cookies automatically via `@supabase/ssr`

### Development Server Issues

- **Port conflicts:** Dev server uses port 3000. Kill existing processes: `npx kill-port 3000`
- **Build errors:** Run `npm run build` to catch type errors before deployment
- **Cache issues:** Delete `.next` directory and rebuild

## Project Documentation

See these files for additional context:
- `DEPLOYMENT.md` - Production deployment guide
- `TESTING_GUIDE.md` - Comprehensive test checklist
- `TASKS.md` - Implementation roadmap
- `DISABLE_EMAIL_CONFIRMATION.md` - Supabase email setup
- `SESSION_SUMMARY.md` - Latest development session notes
