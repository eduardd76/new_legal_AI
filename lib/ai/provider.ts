import { AIProvider } from '@/lib/types/database'

export interface AIProviderConfig {
  provider: AIProvider
  apiKey: string
  model: string
  maxTokens?: number
  temperature?: number
}

export interface AIAnalysisRequest {
  documentText: string
  contractType?: string
  legalContext?: string[]
}

export interface AIAnalysisResponse {
  analysis: ContractAnalysis
  tokens_used: number
  cost_usd: number
  model_version: string
}

export interface ContractAnalysis {
  contract_type: string
  overall_risk_score: number // 0-1
  compliance_score: number // 0-1
  issues: AnalysisIssue[]
  clauses: AnalyzedClause[]
}

export interface AnalysisIssue {
  title: string
  description: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  category: string
  legal_references?: LegalReference[]
  suggested_revision?: string
  confidence: number // 0-1
}

export interface AnalyzedClause {
  clause_id?: string
  clause_type: string
  content: string
  risk_level?: 'low' | 'medium' | 'high' | 'critical'
  comments: ClauseComment[]
}

export interface ClauseComment {
  type: 'info' | 'warning' | 'suggestion' | 'revision'
  title: string
  content: string
  confidence: number
}

export interface LegalReference {
  law: string
  article: string
  url?: string
  relevance_score: number
}

/**
 * Abstract AI Provider Interface
 */
export interface IAIProvider {
  analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse>
  getProviderName(): AIProvider
  estimateCost(tokenCount: number): number
}

/**
 * Factory to create AI providers
 */
export function createAIProvider(config: AIProviderConfig): IAIProvider {
  switch (config.provider) {
    case 'claude-sonnet-4':
      return new ClaudeProvider(config)
    case 'gpt-4':
      return new OpenAIProvider(config)
    case 'mock':
      return new MockProvider(config)
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`)
  }
}

/**
 * Get AI provider from environment
 */
export function getDefaultProvider(): IAIProvider {
  const provider = (process.env.AI_PROVIDER || 'claude-sonnet-4') as AIProvider
  const config: AIProviderConfig = {
    provider,
    apiKey: getAPIKey(provider),
    model: getModelName(provider),
    maxTokens: 4000,
    temperature: 0.3,
  }
  return createAIProvider(config)
}

function getAPIKey(provider: AIProvider): string {
  switch (provider) {
    case 'claude-sonnet-4':
      return process.env.ANTHROPIC_API_KEY || 'mock-key'
    case 'gpt-4':
      return process.env.OPENAI_API_KEY || 'mock-key'
    default:
      return 'mock-key'
  }
}

function getModelName(provider: AIProvider): string {
  switch (provider) {
    case 'claude-sonnet-4':
      return 'claude-sonnet-4-20250514'
    case 'gpt-4':
      return 'gpt-4-turbo'
    default:
      return 'mock-model'
  }
}

// Provider implementations
import { ClaudeProvider } from './providers/claude'
import { OpenAIProvider } from './providers/openai'
import { MockProvider } from './providers/mock'
