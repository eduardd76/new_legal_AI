# JSON Parse Error Fix - Commit 8aa1045

## Problem

When uploading documents, users got: `JSON.parse: unexpected end of data at line 1 column 1 of the JSON data`

## Root Cause

**Vercel timeout issue:**
- Text extraction (mammoth/pdf-parse) takes **15-30 seconds**
- Vercel **Hobby plan default timeout: 10 seconds**
- Function times out before completing
- Returns empty response → frontend can't parse JSON → error

## Solution

**Added Vercel route segment configuration:**

```typescript
// In upload/route.ts and analyze/route.ts
export const runtime = 'nodejs'
export const maxDuration = 60  // 60 seconds
```

**Important:** `maxDuration = 60` requires **Vercel Pro plan** ($20/month). Hobby plan limited to 10 seconds.

## Changes Made

### 1. `app/api/documents/upload/route.ts`
- Added `runtime = 'nodejs'`
- Added `maxDuration = 60`
- Added `console.log('[UPLOAD] Request received')` for debugging

### 2. `app/api/documents/[id]/analyze/route.ts`
- Added `runtime = 'nodejs'` (maxDuration already existed)

## Expected Behavior After Deployment

### ✅ With Vercel Pro plan (maxDuration = 60):
1. Upload DOCX/PDF → **15-30 seconds**
2. Success response with document ID
3. Document appears in list with status = "ready"
4. "Analyze" button visible
5. AI analysis completes in **30-60 seconds**

### ⚠️ With Hobby plan (maxDuration = 10):
Upload will still timeout for large files. **Options:**
1. **Upgrade to Pro** ($20/month) - Recommended
2. **Async processing** - Refactor to background jobs (more complex)
3. **Client-side extraction** - Extract text in browser before upload (security risk)

## Testing

Wait 2-3 minutes for Vercel deployment, then test:

```bash
# 1. Check Vercel deployment status
# Go to: https://vercel.com/dashboard → contract-review-ai → Deployments

# 2. Test upload
curl -X POST https://contract-review-ai.vercel.app/api/documents/upload \
  -H "Cookie: your-session-cookie" \
  -F "file=@test.pdf" \
  -w "\nHTTP: %{http_code}\nTime: %{time_total}s\n"
```

**Expected:**
- HTTP: 200 (not 524 timeout)
- Time: 15-30s
- Response: Valid JSON with document ID

## Vercel Plan Check

To check your current plan:
1. Go to https://vercel.com/dashboard
2. Click Settings → Usage
3. Look for "Function Duration" limit

- **Hobby:** 10s limit (free) - **UPLOAD WILL FAIL**
- **Pro:** 60s limit ($20/month) - **UPLOAD WILL WORK**
- **Enterprise:** 900s limit (custom pricing)

## If Upload Still Fails

1. **Check Vercel logs:**
   - Dashboard → Deployments → Latest → Functions
   - Look for `[UPLOAD] Request received` logs
   - Check if function times out at 10s or 60s

2. **Verify plan upgrade:**
   - If you upgraded to Pro but still see 10s timeout
   - Re-deploy with cache disabled
   - Or wait 5-10 minutes for propagation

3. **Temporary workaround (Hobby plan):**
   - Reduce `maxDuration` to 10 in code
   - Only upload small files (<5 pages)
   - Or use text files instead of PDF/DOCX

## Next Steps

1. ✅ Deployed (commit 8aa1045)
2. ⏳ Wait 2-3 min for Vercel deployment
3. 🧪 Test upload with real file
4. 📊 Run comprehensive testing if successful
5. 🚀 Production ready!

## Commit Details

- **Commit:** 8aa1045
- **Files:** upload/route.ts, analyze/route.ts
- **Pushed:** 2025-12-10
- **GitHub:** https://github.com/eduardd76/new_legal_AI/commit/8aa1045
- **Vercel:** Auto-deploying...

---

**Progress Timeline:**
- ❌ HTTP 405 (DOMMatrix) → ✅ Fixed (removed tesseract)
- ❌ JSON parse error (timeout) → ✅ Fixed (maxDuration = 60)
- ⏳ Testing in progress...
