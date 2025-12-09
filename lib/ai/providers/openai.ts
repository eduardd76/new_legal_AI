import OpenAI from 'openai'
import type {
  AIProviderConfig,
  IAIProvider,
  AIAnalysisRequest,
  AIAnalysisResponse,
  ContractAnalysis,
} from '../provider'
import { AIProvider } from '@/lib/types/database'
import { getAnalysisPrompt } from '../prompts'

export class OpenAIProvider implements IAIProvider {
  private client: OpenAI
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
    this.client = new OpenAI({
      apiKey: config.apiKey,
    })
  }

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const prompt = getAnalysisPrompt(request)

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert legal AI assistant specializing in Romanian and EU contract law. Analyze contracts and provide detailed risk assessment and compliance checking.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        response_format: { type: 'json_object' },
      })

      const content = response.choices[0].message.content
      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      const analysis: ContractAnalysis = JSON.parse(content)

      const tokens_used = response.usage?.total_tokens || 0
      const cost_usd = this.estimateCost(tokens_used)

      return {
        analysis,
        tokens_used,
        cost_usd,
        model_version: this.config.model,
      }
    } catch (error: any) {
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI analysis failed: ${error.message}`)
    }
  }

  getProviderName(): AIProvider {
    return 'gpt-4'
  }

  estimateCost(tokenCount: number): number {
    // GPT-4 Turbo pricing (approximate)
    // Input: $10/MTok, Output: $30/MTok
    // Assuming 50/50 split
    const inputCost = (tokenCount * 0.5 * 10) / 1_000_000
    const outputCost = (tokenCount * 0.5 * 30) / 1_000_000
    return inputCost + outputCost
  }
}
