# AI Contract Review MVP - Deployment Guide

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

### 1. Clone & Install
```bash
cd contract-review-ai
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure the following variables in `.env.local`:

#### Supabase Configuration
1. Go to https://supabase.com
2. Create a new project
3. Get your project URL and anon key from Project Settings > API
4. Get your service role key from the same page (keep this secret!)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

#### AI Provider Keys
Get API keys from:
- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/api-keys

```env
ANTHROPIC_API_KEY=sk-ant-your-key
OPENAI_API_KEY=sk-your-key

# Primary provider (claude-sonnet-4 or gpt-4 or mock)
AI_PROVIDER=mock  # Use mock for testing without API keys
AI_FALLBACK_PROVIDER=claude-sonnet-4
```

### 3. Database Setup

Run the SQL scripts in Supabase SQL Editor:

1. Open Supabase dashboard
2. Go to SQL Editor
3. Run `supabase/schema.sql` - Creates all tables
4. Run `supabase/rls_policies.sql` - Sets up security

Or use Supabase CLI:
```bash
npm install -g supabase
supabase link --project-ref your-project-ref
supabase db push
```

### 4. Run Development Server
```bash
npm run dev
```

Visit http://localhost:3000

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 📦 Production Deployment (Vercel)

### Method 1: GitHub Integration (Recommended)

1. Push code to GitHub
2. Go to https://vercel.com
3. Click "New Project"
4. Import your GitHub repository
5. Configure environment variables (same as .env.local)
6. Deploy!

### Method 2: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Required Environment Variables on Vercel

Set these in Vercel Dashboard > Project Settings > Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
AI_PROVIDER
AI_FALLBACK_PROVIDER
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

---

## 🧪 Testing

### Run Playwright Tests
```bash
# Install browsers (first time only)
npx playwright install

# Run tests
npm test

# Run tests in UI mode
npx playwright test --ui

# Run specific test file
npx playwright test tests/auth.spec.ts
```

### Manual Testing Checklist

#### 1. Authentication
- [ ] Sign up with new account
- [ ] Login with credentials
- [ ] Role selection works (Legal Pro vs Business User)
- [ ] Logout works
- [ ] Protected routes redirect to login

#### 2. Document Upload
- [ ] Upload PDF file
- [ ] Upload DOCX file
- [ ] File validation works (reject invalid types)
- [ ] Progress indicator shows
- [ ] Document appears in list

#### 3. Document Analysis
- [ ] Click "Start Analysis" button
- [ ] Analysis completes successfully
- [ ] Comments appear in side panel
- [ ] Risk scores display correctly
- [ ] Legal references show

#### 4. Document Viewer
- [ ] Document text displays
- [ ] Clauses are structured correctly
- [ ] Comments panel shows AI suggestions
- [ ] Risk badges display (Low/Medium/High/Critical)
- [ ] Accept/Reject buttons visible

#### 5. Export
- [ ] Export page loads
- [ ] Risk summary displays
- [ ] Stats show correctly

---

## 🔧 Troubleshooting

### Build Errors

**Error: "Cannot find module '@supabase/supabase-js'"**
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Error: "pdf-parse import issues"**
- This is handled in the code with `* as pdfParse`

**TypeScript errors**
```bash
npm run build  # Will show specific errors
```

### Runtime Errors

**Supabase Auth Issues**
- Check that RLS policies are applied
- Verify anon key and service role key are correct
- Check Supabase project is active

**AI Analysis Fails**
- Verify AI_PROVIDER is set correctly
- Use "mock" for testing without API keys
- Check API keys are valid
- Check rate limits on AI provider accounts

**File Upload Issues**
- Check Supabase Storage buckets exist (documents, exports)
- Verify storage policies are set
- Check file size limits (50MB default)

---

## 📊 Monitoring

### Vercel Dashboard
- Monitor build logs
- Check function logs
- View analytics

### Supabase Dashboard
- Monitor database queries
- Check storage usage
- View auth events
- Review logs

### AI Usage Tracking
- Track in `analyses` table
- Monitor `tokens_used` and `cost_usd`
- Set up alerts for cost thresholds

---

## 🔐 Security Checklist

- [ ] Environment variables secured (not in code)
- [ ] Supabase RLS policies enabled
- [ ] Service role key kept secret
- [ ] HTTPS enforced (Vercel does this)
- [ ] Rate limiting configured
- [ ] File size limits enforced
- [ ] Input validation on all endpoints
- [ ] GDPR compliance features active

---

## 📈 Scaling Considerations

### Performance Optimization
- Enable Vercel Edge Functions for faster response
- Use Supabase connection pooling
- Implement Redis caching for frequent queries
- Use CDN for static assets

### Cost Management
- Monitor AI API usage (can get expensive)
- Set budget alerts on AI provider dashboards
- Use "mock" provider for development
- Consider batch processing for documents

### Feature Flags
Already configured in .env:
- `ENABLE_OCR` - Toggle OCR processing
- `ENABLE_BACKGROUND_JOBS` - Queue heavy tasks
- `ENABLE_RATE_LIMITING` - Protect against abuse

---

## 🎯 Post-MVP Enhancements

### High Priority
1. Real DOCX export with track changes
2. PDF export with annotations
3. Full OCR implementation
4. Real-time collaboration
5. Email notifications

### Medium Priority
1. Advanced analytics dashboard
2. Multi-language support (English UI)
3. API access for integrations
4. Webhook support
5. Template library

### Low Priority
1. Mobile app
2. White-label solution
3. Advanced workflow automation
4. Machine learning fine-tuning
5. Integration with DMS systems

---

## 📞 Support

For issues:
1. Check troubleshooting section above
2. Review Supabase logs
3. Check Vercel function logs
4. Review browser console for errors

For feature requests, see the project roadmap in `TASKS.md`.

---

## ✅ MVP Completion Checklist

- [x] User authentication with roles
- [x] Document upload (PDF, DOCX)
- [x] Text extraction & parsing
- [x] AI analysis with Claude/OpenAI
- [x] Comment system UI
- [x] Risk scoring
- [x] Legal compliance checking
- [x] Document viewer
- [ ] Export functionality (placeholder implemented)
- [x] Basic tests
- [x] Deployment guide

**Status**: MVP Ready for Testing & Feedback 🎉
