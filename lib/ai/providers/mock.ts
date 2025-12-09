import type {
  AIProviderConfig,
  IAIProvider,
  AIAnalysisRequest,
  AIAnalysisResponse,
  ContractAnalysis,
} from '../provider'
import { AIProvider } from '@/lib/types/database'

export class MockProvider implements IAIProvider {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    const mockAnalysis: ContractAnalysis = {
      contract_type: request.contractType || 'b2b_services',
      overall_risk_score: 0.65,
      compliance_score: 0.75,
      issues: [
        {
          title: 'Unlimited Liability Clause',
          description: 'The contract contains an unlimited liability clause which exposes your organization to significant financial risk. Romanian Civil Code Art. 1350 requires balanced obligations.',
          risk_level: 'high',
          category: 'liability',
          legal_references: [
            {
              law: 'Romanian Civil Code',
              article: 'Art. 1350',
              relevance_score: 0.95,
            },
          ],
          suggested_revision: 'Consider adding: "Liability shall be limited to the total value of services provided under this agreement, except in cases of gross negligence or willful misconduct."',
          confidence: 0.88,
        },
        {
          title: 'Missing Data Protection Clause',
          description: 'No explicit data protection or GDPR compliance clause found. This is required for any contract involving personal data processing.',
          risk_level: 'critical',
          category: 'data_protection',
          legal_references: [
            {
              law: 'GDPR',
              article: 'Art. 28',
              relevance_score: 0.92,
            },
          ],
          suggested_revision: 'Add a comprehensive data protection clause compliant with GDPR Art. 28 requirements for data processors.',
          confidence: 0.95,
        },
        {
          title: 'Vague Termination Conditions',
          description: 'Termination conditions are not clearly defined, which may lead to disputes.',
          risk_level: 'medium',
          category: 'termination',
          legal_references: [
            {
              law: 'Romanian Civil Code',
              article: 'Art. 1271',
              relevance_score: 0.78,
            },
          ],
          suggested_revision: 'Specify exact conditions, notice periods, and consequences of termination for both parties.',
          confidence: 0.82,
        },
      ],
      clauses: [
        {
          clause_type: 'liability',
          content: 'Party A shall be liable for all damages...',
          risk_level: 'high',
          comments: [
            {
              type: 'warning',
              title: 'Unlimited liability',
              content: 'This clause creates unlimited financial risk.',
              confidence: 0.90,
            },
          ],
        },
      ],
    }

    return {
      analysis: mockAnalysis,
      tokens_used: 2500,
      cost_usd: 0.05,
      model_version: 'mock-v1',
    }
  }

  getProviderName(): AIProvider {
    return 'mock'
  }

  estimateCost(tokenCount: number): number {
    return 0.01 // Mock costs
  }
}
