# Configure OpenAI for Production

**Status:** ✅ OpenAI configured locally, needs production deployment

---

## 📋 STEPS TO ENABLE REAL AI ANALYSIS

### Option 1: Configure via Vercel Dashboard (RECOMMENDED)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `contract-review-ai`

2. **Navigate to Settings:**
   - Click "Settings" tab
   - Click "Environment Variables" in sidebar

3. **Add/Update These Variables:**

   **Required:**
   ```
   Variable: AI_PROVIDER
   Value: gpt-4
   Environment: Production, Preview, Development
   ```

   ```
   Variable: OPENAI_API_KEY
   Value: sk-proj-YOUR_OPENAI_API_KEY_HERE
   Environment: Production, Preview, Development
   ```

   **⚠️ Use your actual OpenAI API key** (provided separately)

4. **Save Changes:**
   - Click "Save" for each variable
   - Vercel will automatically redeploy

5. **Wait for Redeployment:**
   - Check "Deployments" tab
   - Wait for "Ready" status (~2-3 minutes)

---

### Option 2: Configure via Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add OPENAI_API_KEY
# Paste the API key when prompted
# Select: Production, Preview, Development

vercel env add AI_PROVIDER
# Enter: gpt-4
# Select: Production, Preview, Development

# Trigger redeployment
vercel --prod
```

---

## ✅ VERIFICATION

After configuration, test the AI analysis:

### 1. **Test on Production:**
   - Go to: https://contract-review-ai.vercel.app
   - Login with: eduard@gmail.com / Mihaela77
   - Upload: "Draft contract mentenanta _ ANONOM.docx"
   - Click: "Start Analysis"
   - **Expected:** Real AI analysis in 20-40 seconds

### 2. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Functions
   - Filter logs for: `[ANALYZE] Using AI provider: gpt-4`
   - Should see: `[ANALYZE] AI analysis completed in X ms`

### 3. **Verify Analysis Quality:**
   - Analysis should show specific contract issues
   - Risk scores should be calculated (not just 0.5)
   - Comments should reference specific clauses
   - Should identify: penalties, indexation, force majeure, etc.

---

## 🔍 WHAT CHANGED

### Local Configuration (Already Done):
✅ `.env.local` updated with OpenAI API key
✅ `AI_PROVIDER` changed from `claude-sonnet-4` to `gpt-4`
✅ System will use `gpt-4-turbo` model

### Production Configuration (TODO):
⏳ Set `OPENAI_API_KEY` in Vercel environment variables
⏳ Set `AI_PROVIDER=gpt-4` in Vercel environment variables
⏳ Redeploy application

---

## 💰 COST ESTIMATES

**GPT-4 Turbo Pricing:**
- Input: $10 per 1M tokens
- Output: $30 per 1M tokens

**Estimated Costs per Analysis:**
- Small contract (10 pages, ~5K words): **~$0.05-0.10**
- Medium contract (30 pages, ~15K words): **~$0.15-0.30**
- Large contract (50 pages, ~25K words): **~$0.25-0.50**

**Monthly Estimates (based on usage):**
- 100 analyses/month: **$15-30**
- 500 analyses/month: **$75-150**
- 1000 analyses/month: **$150-300**

**Note:** Your API key will be charged by OpenAI based on actual usage.

---

## 🛡️ SECURITY NOTES

1. **API Key Security:**
   - ✅ Key stored in environment variables (not in code)
   - ✅ `.env.local` in `.gitignore` (not committed to Git)
   - ✅ Vercel environment variables are encrypted
   - ⚠️ Never expose API key in frontend code

2. **Rate Limiting:**
   - OpenAI has default rate limits (10K req/min for GPT-4)
   - Consider adding rate limiting at application level
   - Monitor usage in OpenAI dashboard

3. **Cost Control:**
   - Set up billing alerts in OpenAI dashboard
   - Monitor token usage per request
   - Consider caching common contract analyses

---

## 🔄 ROLLBACK PLAN

If OpenAI integration has issues:

### Quick Rollback to Mock:
```bash
vercel env add AI_PROVIDER
# Enter: mock
# Select: Production

vercel --prod
```

### Or via Vercel Dashboard:
1. Settings → Environment Variables
2. Edit `AI_PROVIDER`
3. Change value to: `mock`
4. Save (triggers redeployment)

---

## 📊 MONITORING RECOMMENDATIONS

### 1. OpenAI Dashboard:
- Monitor usage: https://platform.openai.com/usage
- Check API errors
- Set billing alerts

### 2. Vercel Function Logs:
- Filter for: `[ANALYZE] AI analysis`
- Monitor success/failure rates
- Check token usage per request

### 3. Database Queries:
```sql
-- AI provider usage
SELECT
  ai_provider,
  COUNT(*) as analyses_count,
  AVG(tokens_used) as avg_tokens,
  SUM(cost_usd) as total_cost
FROM analyses
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY ai_provider;

-- Failed analyses
SELECT COUNT(*)
FROM analyses
WHERE status = 'failed'
AND ai_provider = 'gpt-4';
```

---

## 🎯 EXPECTED BEHAVIOR AFTER CONFIGURATION

### Before (Mock Provider):
- Analysis returns generic placeholder issues
- Fixed risk scores (always 0.5)
- No real legal analysis
- No clause-specific comments

### After (Real OpenAI):
- **Detailed legal analysis** specific to contract content
- **Calculated risk scores** based on actual issues found
- **Clause-by-clause review** with specific references
- **Legal references** to Romanian/EU law
- **Actionable recommendations** for contract improvements

### Example Real Analysis Output:
```json
{
  "contract_type": "b2b_services",
  "overall_risk_score": 0.68,
  "compliance_score": 0.75,
  "issues": [
    {
      "title": "Asymmetric Penalty Structure",
      "description": "Article 4.8 creates unlimited liability for Beneficiary while Provider's penalties are capped...",
      "risk_level": "high",
      "legal_references": [
        {
          "law": "Romanian Civil Code",
          "article": "Art. 1541",
          "relevance_score": 0.9
        }
      ]
    }
    // ... more issues
  ]
}
```

---

## ✅ CHECKLIST

Before going live with OpenAI:

- [ ] Set `OPENAI_API_KEY` in Vercel environment variables
- [ ] Set `AI_PROVIDER=gpt-4` in Vercel environment variables
- [ ] Redeploy application via Vercel
- [ ] Test analysis on production with real contract
- [ ] Verify logs show `gpt-4` as provider
- [ ] Check analysis quality (not just placeholder data)
- [ ] Set up OpenAI billing alerts
- [ ] Monitor first 10-20 analyses for errors
- [ ] Document expected monthly costs for stakeholders

---

## 📞 TROUBLESHOOTING

### Issue: "OpenAI API key is invalid"
**Solution:**
1. Verify key in Vercel environment variables
2. Check for typos or extra spaces
3. Verify key is active in OpenAI dashboard
4. Try creating a new API key if needed

### Issue: "Rate limit exceeded"
**Solution:**
1. Check OpenAI dashboard for rate limits
2. Add exponential backoff retry logic
3. Consider upgrading OpenAI account tier
4. Implement request queuing

### Issue: "Analysis returns empty results"
**Solution:**
1. Check Vercel function logs for errors
2. Verify prompt is being sent correctly
3. Check OpenAI response format
4. Ensure `response_format: { type: 'json_object' }` is set

### Issue: "High API costs"
**Solution:**
1. Review token usage per request
2. Optimize prompts to be more concise
3. Consider caching common analyses
4. Add token usage limits per request

---

**Configuration Status:** ✅ Local ready, ⏳ Production pending

**Next Step:** Configure Vercel environment variables as described above

**Estimated Time:** 5-10 minutes

---

**Generated:** 2025-12-10
**API Key Configured:** Yes (local)
**Production Configured:** No (needs Vercel env vars)
**Ready to Deploy:** Yes (after Vercel configuration)
