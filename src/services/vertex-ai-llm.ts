import { VertexAI } from '@google-cloud/vertexai';
import { VertexAIConfig, VertexAIGenerationConfig, VertexAIError } from '../types/vertex-ai';
import { SearchResult, ConversationMessage } from '../types';
import { LLMProvider } from './llm-service';

export class VertexAILLMService implements LLMProvider {
  private vertexAI: VertexAI;
  private model: string;
  private config: VertexAIConfig;
  private generationConfig: VertexAIGenerationConfig;

  constructor(config: VertexAIConfig) {
    this.config = config;
    this.model = config.textModel || 'gemini-1.5-pro';
    this.generationConfig = {
      temperature: 0.1,
      topP: 0.95,
      topK: 32,
      maxOutputTokens: 2048,
      ...config.generationConfig,
    };
    
    console.log(`🔗 Initializing Vertex AI LLM Service`);
    console.log(`📍 Project: ${config.projectId}, Location: ${config.location}`);
    console.log(`🤖 Model: ${this.model}`);

    // Initialize Vertex AI client
    const authOptions: any = {
      projectId: config.projectId,
    };

    if (config.keyFilename) {
      authOptions.keyFilename = config.keyFilename;
      console.log(`🔑 Using service account key: ${config.keyFilename}`);
    } else {
      console.log(`🔑 Using Application Default Credentials (ADC)`);
    }

    this.vertexAI = new VertexAI({
      project: config.projectId,
      location: config.location,
      googleAuthOptions: authOptions,
    });

    console.log(`✅ Vertex AI LLM Service initialized`);
  }

  async generateResponse(
    prompt: string, 
    context: SearchResult[], 
    conversation?: ConversationMessage[]
  ): Promise<string> {
    try {
      const model = this.vertexAI.getGenerativeModel({
        model: this.model,
        generationConfig: this.generationConfig,
      });

      const systemPrompt = this.buildSystemPrompt();
      const contextPrompt = this.buildContextPrompt(context);
      const conversationHistory = this.buildConversationHistory(conversation || []);
      
      const fullPrompt = `${systemPrompt}

${contextPrompt}

${conversationHistory}

ユーザーの質問: ${prompt}

回答:`;

      const result = await model.generateContent(fullPrompt);
      
      if (!result.response) {
        throw new VertexAIError('No response received from Vertex AI');
      }

      const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text available';
      
      if (!responseText) {
        throw new VertexAIError('Empty response from Vertex AI');
      }

      return responseText;
    } catch (error) {
      console.error('Failed to generate response with Vertex AI:', error);
      
      if (error instanceof Error) {
        throw new VertexAIError(
          `Vertex AI response generation failed: ${error.message}`,
          'GENERATION_ERROR',
          undefined,
          error
        );
      }
      
      throw new VertexAIError('Unknown error in Vertex AI response generation');
    }
  }

  async generateRelatedQuestions(query: string, context: SearchResult[]): Promise<string[]> {
    try {
      const model = this.vertexAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          ...this.generationConfig,
          temperature: 0.3, // Slightly higher temperature for creativity
          maxOutputTokens: 1024,
        },
      });

      const contextSummary = context
        .slice(0, 3) // Use top 3 results
        .map(result => result.chunk.content.substring(0, 200))
        .join('\n\n');

      const prompt = `以下のコンテキストとユーザーの質問に基づいて、関連する質問を3つ生成してください。

コンテキスト:
${contextSummary}

ユーザーの質問: ${query}

関連する質問を3つ、以下の形式で生成してください:
1. [質問1]
2. [質問2] 
3. [質問3]

回答:`;

      const result = await model.generateContent(prompt);
      
      if (!result.response) {
        return [];
      }

      const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse the numbered list format
      const questions = responseText
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => /^\d+\./.test(line))
        .map((line: string) => line.replace(/^\d+\.\s*/, ''))
        .filter((question: string) => question.length > 0)
        .slice(0, 3); // Ensure we only return 3 questions

      return questions;
    } catch (error) {
      console.error('Failed to generate related questions with Vertex AI:', error);
      return []; // Return empty array on error
    }
  }

  private buildSystemPrompt(): string {
    return `あなたは日本の法律文書に特化した専門的なアシスタントです。以下のガイドラインに従って回答してください:

1. 提供されたコンテキストの情報のみを使用して回答してください
2. 正確で具体的な情報を提供し、曖昧な表現は避けてください
3. 法律用語は適切に使用し、必要に応じて説明を加えてください
4. 回答の根拠となる文書や条文を明示してください
5. 情報が不十分な場合は、その旨を明確に述べてください
6. 日本語で丁寧かつ専門的な語調で回答してください
7. 法的アドバイスではなく情報提供であることを適切に伝えてください`;
  }

  private buildContextPrompt(context: SearchResult[]): string {
    if (context.length === 0) {
      return 'コンテキスト: 関連する文書が見つかりませんでした。';
    }

    const contextText = context
      .map((result, index) => {
        const source = `【文書${index + 1}】${result.chunk.title} (${result.chunk.documentPath})`;
        const content = result.chunk.content;
        const relevanceScore = `関連度: ${(result.score * 100).toFixed(1)}%`;
        
        return `${source}
${relevanceScore}

${content}

---`;
      })
      .join('\n\n');

    return `コンテキスト (関連する法律文書):

${contextText}`;
  }

  private buildConversationHistory(conversation: ConversationMessage[]): string {
    if (conversation.length === 0) {
      return '';
    }

    const history = conversation
      .slice(-6) // Keep last 6 messages for context
      .map(msg => {
        const role = msg.role === 'user' ? 'ユーザー' : 'アシスタント';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    return `会話履歴:
${history}

---`;
  }

  // Health check method for provider monitoring
  async healthCheck(): Promise<boolean> {
    try {
      const model = this.vertexAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 10,
        },
      });

      const result = await model.generateContent('健康チェック用のテストです。「OK」と回答してください。');
      
      return !!(result.response && result.response.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch (error) {
      console.error('Vertex AI LLM health check failed:', error);
      return false;
    }
  }

  // Get model information
  getModelInfo(): { name: string; maxTokens: number; supportsStreaming: boolean } {
    // Model specifications for common Vertex AI text models
    const modelSpecs: Record<string, { maxTokens: number; supportsStreaming: boolean }> = {
      'gemini-1.5-pro': { maxTokens: 2048, supportsStreaming: true },
      'gemini-1.5-flash': { maxTokens: 8192, supportsStreaming: true },
      'gemini-pro': { maxTokens: 2048, supportsStreaming: true },
    };

    const spec = modelSpecs[this.model] || { maxTokens: 2048, supportsStreaming: true };
    
    return {
      name: this.model,
      ...spec,
    };
  }

  // Estimate token usage for cost tracking
  estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 0.75 words for Japanese
    // This is a simplification; actual tokenization varies by model
    const words = text.split(/\s+/).length;
    const japaneseChars = (text.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
    
    // Estimate tokens considering both words and Japanese characters
    return Math.ceil(words * 0.75 + japaneseChars * 0.5);
  }
}

export const createVertexAILLMService = (config: VertexAIConfig): LLMProvider => {
  return new VertexAILLMService(config);
};