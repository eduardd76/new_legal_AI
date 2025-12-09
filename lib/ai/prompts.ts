import type { AIAnalysisRequest } from './provider'

export function getAnalysisPrompt(request: AIAnalysisRequest): string {
  const { documentText, contractType, legalContext } = request

  return `You are an expert legal AI assistant specializing in Romanian and EU contract law. Analyze the following contract and provide a comprehensive risk assessment.

CONTRACT TEXT:
${documentText.substring(0, 50000)} ${documentText.length > 50000 ? '...(truncated)' : ''}

${contractType ? `DETECTED CONTRACT TYPE: ${contractType}` : ''}

${legalContext && legalContext.length > 0 ? `RELEVANT LEGAL CONTEXT:\n${legalContext.join('\n\n')}` : ''}

ANALYSIS REQUIREMENTS:

1. **Contract Type Classification**
   - Identify the type of contract (B2B, B2C, employment, NDA, etc.)

2. **Risk Assessment**
   - Overall risk score (0.0 to 1.0, where 1.0 is highest risk)
   - Identify specific risk areas: liability, termination, payment, data protection, IP rights

3. **Compliance Checking**
   - Romanian Civil Code compliance
   - EU GDPR compliance (if personal data involved)
   - Other relevant Romanian/EU regulations
   - Compliance score (0.0 to 1.0)

4. **Issue Identification**
   For each issue found, provide:
   - Title (brief, specific)
   - Description (clear explanation of the problem)
   - Risk level: low, medium, high, or critical
   - Category (e.g., liability, data_protection, termination, payment, ip_rights)
   - Legal references (law name, article number, relevance score)
   - Suggested revision (concrete alternative wording)
   - Confidence score (0.0 to 1.0)

5. **Key Clauses Analysis**
   Identify and analyze critical clauses:
   - Liability and limitation of liability
   - Data protection / GDPR compliance
   - Intellectual property
   - Termination conditions
   - Payment terms
   - Non-compete / confidentiality

FOCUS AREAS FOR ROMANIAN/EU LAW:

**Romanian Civil Code:**
- Art. 1270 (Freedom of contract)
- Art. 1271 (Binding force of contracts)
- Art. 1350 (Unfair terms in B2C contracts)
- Commercial law provisions

**EU Regulations:**
- GDPR Art. 6 (Lawfulness of processing)
- GDPR Art. 17 (Right to erasure)
- GDPR Art. 28 (Processor obligations)
- GDPR Art. 32 (Security of processing)
- Consumer protection directives

**Risk Indicators:**
- Unlimited liability clauses
- Missing or vague data protection provisions
- One-sided termination rights
- Unclear payment terms or excessive penalties
- Missing jurisdiction/governing law clauses
- Intellectual property ambiguities
- Missing force majeure clauses

IMPORTANT:
- Be specific and actionable in your suggestions
- Reference actual legal provisions where possible
- Flag missing clauses that should be present
- Consider both parties' interests
- Distinguish between mandatory vs. recommended changes
- Use confidence scores to indicate certainty

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "contract_type": "string",
  "overall_risk_score": 0.0-1.0,
  "compliance_score": 0.0-1.0,
  "issues": [
    {
      "title": "string",
      "description": "string",
      "risk_level": "low|medium|high|critical",
      "category": "string",
      "legal_references": [
        {
          "law": "string",
          "article": "string",
          "relevance_score": 0.0-1.0
        }
      ],
      "suggested_revision": "string",
      "confidence": 0.0-1.0
    }
  ],
  "clauses": [
    {
      "clause_type": "string",
      "content": "string (first 200 chars)",
      "risk_level": "low|medium|high|critical",
      "comments": [
        {
          "type": "info|warning|suggestion|revision",
          "title": "string",
          "content": "string",
          "confidence": 0.0-1.0
        }
      ]
    }
  ]
}

Analyze now and return only valid JSON.`
}

export function getLegalContextPrompt(topic: string): string {
  return `Provide relevant Romanian and EU legal provisions for: ${topic}`
}
