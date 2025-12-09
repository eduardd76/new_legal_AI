import Anthropic from '@anthropic-ai/sdk'
import type {
  AIProviderConfig,
  IAIProvider,
  AIAnalysisRequest,
  AIAnalysisResponse,
  ContractAnalysis,
} from '../provider'
import { AIProvider } from '@/lib/types/database'
import { getAnalysisPrompt } from '../prompts'

export class ClaudeProvider implements IAIProvider {
  private client: Anthropic
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
    this.client = new Anthropic({
      apiKey: config.apiKey,
    })
  }

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const prompt = getAnalysisPrompt(request)

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 4000,
        temperature: this.config.temperature || 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const content = response.content[0]
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude')
      }

      // Parse JSON response
      const analysis: ContractAnalysis = JSON.parse(content.text)

      // Calculate cost (approximate for Claude Sonnet 4)
      const inputTokens = response.usage.input_tokens
      const outputTokens = response.usage.output_tokens
      const cost_usd = this.estimateCost(inputTokens + outputTokens)

      return {
        analysis,
        tokens_used: inputTokens + outputTokens,
        cost_usd,
        model_version: this.config.model,
      }
    } catch (error: any) {
      console.error('Claude API error:', error)
      throw new Error(`Claude analysis failed: ${error.message}`)
    }
  }

  getProviderName(): AIProvider {
    return 'claude-sonnet-4'
  }

  estimateCost(tokenCount: number): number {
    // Claude Sonnet 4 pricing (approximate)
    // Input: $3/MTok, Output: $15/MTok
    // Assuming 50/50 split for estimation
    const inputCost = (tokenCount * 0.5 * 3) / 1_000_000
    const outputCost = (tokenCount * 0.5 * 15) / 1_000_000
    return inputCost + outputCost
  }
}
