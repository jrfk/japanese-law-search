import { EmbeddingService, VectorStore } from '../types';
import { 
  AIProvider, 
  ProviderConfig, 
  ProviderHealthStatus, 
  ProviderError,
  CostTracker,
  VertexAIConfig 
} from '../types/vertex-ai';
import { LLMProvider } from './llm-service';
import { OpenAIEmbeddingService } from './embedding-service';
import { OpenAILLMService } from './llm-service';
import { VertexAIEmbeddingService } from './vertex-ai-embedding';
import { VertexAILLMService } from './vertex-ai-llm';
import { GeminiEmbeddingService } from './gemini-embedding';

export class ProviderFactory {
  private config: ProviderConfig;
  private healthStatus: Map<AIProvider, ProviderHealthStatus> = new Map();
  private costTracking: CostTracker[] = [];
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.initializeHealthChecks();
    console.log(`🏭 Provider Factory initialized with primary: ${config.primary}`);
    console.log(`🔄 Fallback providers: ${config.fallback.join(', ')}`);
  }

  // Create embedding service with automatic provider selection
  async createEmbeddingService(): Promise<EmbeddingService & { providerName: string }> {
    const providers = [this.config.primary, ...this.config.fallback];
    
    for (const provider of providers) {
      try {
        const service = await this.createEmbeddingServiceForProvider(provider);
        
        // Test the service
        if (await this.testEmbeddingService(service, provider)) {
          console.log(`✅ Using ${provider} for embedding service`);
          const wrappedService = this.wrapEmbeddingService(service, provider);
          // Add provider name to the service
          (wrappedService as any).providerName = provider;
          return wrappedService as EmbeddingService & { providerName: string };
        }
      } catch (error) {
        console.warn(`⚠️ Failed to create embedding service for ${provider}:`, error);
        this.updateHealthStatus(provider, false, error);
      }
    }
    
    throw new ProviderError('No healthy embedding providers available', this.config.primary);
  }

  // Create LLM service with automatic provider selection
  async createLLMService(): Promise<LLMProvider & { providerName: string }> {
    const providers = [this.config.primary, ...this.config.fallback];
    
    for (const provider of providers) {
      try {
        const service = await this.createLLMServiceForProvider(provider);
        
        // Test the service
        if (await this.testLLMService(service, provider)) {
          console.log(`✅ Using ${provider} for LLM service`);
          const wrappedService = this.wrapLLMService(service, provider);
          // Add provider name to the service
          (wrappedService as any).providerName = provider;
          return wrappedService as LLMProvider & { providerName: string };
        }
      } catch (error) {
        console.warn(`⚠️ Failed to create LLM service for ${provider}:`, error);
        this.updateHealthStatus(provider, false, error);
      }
    }
    
    throw new ProviderError('No healthy LLM providers available', this.config.primary);
  }

  private async createEmbeddingServiceForProvider(provider: AIProvider): Promise<EmbeddingService> {
    switch (provider) {
      case 'openai':
        if (!this.config.openai?.apiKey) {
          throw new Error('OpenAI API key not configured');
        }
        return new OpenAIEmbeddingService(
          this.config.openai.apiKey,
          this.config.openai.embeddingModel
        );

      case 'vertexai':
        if (!this.config.vertexai) {
          throw new Error('Vertex AI configuration not provided');
        }
        return new VertexAIEmbeddingService(this.config.vertexai);

      case 'gemini':
        if (!this.config.gemini?.apiKey) {
          throw new Error('Gemini API key not configured');
        }
        return new GeminiEmbeddingService({
          apiKey: this.config.gemini.apiKey,
          model: this.config.gemini.model || 'gemini-embedding-001'
        });

      case 'anthropic':
        throw new Error('Anthropic embedding service not yet implemented');

      case 'local':
        throw new Error('Local embedding service not yet implemented');

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async createLLMServiceForProvider(provider: AIProvider): Promise<LLMProvider> {
    switch (provider) {
      case 'openai':
        if (!this.config.openai?.apiKey) {
          throw new Error('OpenAI API key not configured');
        }
        return new OpenAILLMService(
          this.config.openai.apiKey,
          this.config.openai.model
        );

      case 'vertexai':
        if (!this.config.vertexai) {
          throw new Error('Vertex AI configuration not provided');
        }
        return new VertexAILLMService(this.config.vertexai);

      case 'gemini':
        // For now, Gemini API only supports embeddings, not chat/text generation
        // We would need to implement a separate Gemini LLM service for this
        throw new Error('Gemini LLM service not yet implemented - use Vertex AI for Gemini models');

      case 'anthropic':
        throw new Error('Anthropic LLM service not yet implemented');

      case 'local':
        throw new Error('Local LLM service not yet implemented');

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async testEmbeddingService(service: EmbeddingService, provider: AIProvider): Promise<boolean> {
    try {
      const start = Date.now();
      const testText = "健康チェック用のテストテキストです。";
      
      // Check if service has healthCheck method
      if ('healthCheck' in service && typeof (service as any).healthCheck === 'function') {
        const healthy = await (service as any).healthCheck();
        const latency = Date.now() - start;
        
        this.updateHealthStatus(provider, healthy, undefined, latency);
        return healthy;
      }
      
      // Fallback: try to generate an embedding
      const embedding = await service.generateEmbedding(testText);
      const latency = Date.now() - start;
      const healthy = Array.isArray(embedding) && embedding.length > 0;
      
      this.updateHealthStatus(provider, healthy, undefined, latency);
      return healthy;
    } catch (error) {
      this.updateHealthStatus(provider, false, error);
      return false;
    }
  }

  private async testLLMService(service: LLMProvider, provider: AIProvider): Promise<boolean> {
    try {
      const start = Date.now();
      
      // Check if service has healthCheck method
      if ('healthCheck' in service && typeof (service as any).healthCheck === 'function') {
        const healthy = await (service as any).healthCheck();
        const latency = Date.now() - start;
        
        this.updateHealthStatus(provider, healthy, undefined, latency);
        return healthy;
      }
      
      // Fallback: try to generate a simple response
      const response = await service.generateResponse(
        "健康チェック用のテストです。「OK」と回答してください。",
        []
      );
      const latency = Date.now() - start;
      const healthy = typeof response === 'string' && response.length > 0;
      
      this.updateHealthStatus(provider, healthy, undefined, latency);
      return healthy;
    } catch (error) {
      this.updateHealthStatus(provider, false, error);
      return false;
    }
  }

  private wrapEmbeddingService(service: EmbeddingService, provider: AIProvider): EmbeddingService {
    const factoryInstance = this; // Capture 'this' context
    
    return {
      async generateEmbedding(text: string): Promise<number[]> {
        const start = Date.now();
        try {
          const result = await service.generateEmbedding(text);
          
          // Track cost (simplified estimation)
          if (provider === 'openai' || provider === 'vertexai' || provider === 'gemini') {
            factoryInstance.trackCost(provider, 'embedding', text.length / 4, 0); // Rough token estimation
          }
          
          return result;
        } catch (error) {
          console.error(`${provider} embedding error:`, error);
          throw new ProviderError(`${provider} embedding failed`, provider, error as Error);
        }
      },

      async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const start = Date.now();
        try {
          const result = await service.generateEmbeddings(texts);
          
          // Track cost
          if (provider === 'openai' || provider === 'vertexai' || provider === 'gemini') {
            const totalTokens = texts.reduce((sum, text) => sum + text.length / 4, 0);
            factoryInstance.trackCost(provider, 'embedding', totalTokens, 0);
          }
          
          return result;
        } catch (error) {
          console.error(`${provider} batch embedding error:`, error);
          throw new ProviderError(`${provider} batch embedding failed`, provider, error as Error);
        }
      }
    };
  }

  private wrapLLMService(service: LLMProvider, provider: AIProvider): LLMProvider {
    const factoryInstance = this; // Capture 'this' context
    
    return {
      async generateResponse(prompt: string, context: any[], conversation?: any[]): Promise<string> {
        const start = Date.now();
        try {
          const result = await service.generateResponse(prompt, context, conversation);
          
          // Track cost (simplified estimation)
          if (provider === 'openai' || provider === 'vertexai' || provider === 'gemini') {
            const inputTokens = (prompt + JSON.stringify(context)).length / 4;
            const outputTokens = result.length / 4;
            factoryInstance.trackCost(provider, 'generation', inputTokens, outputTokens);
          }
          
          return result;
        } catch (error) {
          console.error(`${provider} LLM error:`, error);
          throw new ProviderError(`${provider} LLM generation failed`, provider, error as Error);
        }
      },

      async generateRelatedQuestions(query: string, context: any[]): Promise<string[]> {
        try {
          return await service.generateRelatedQuestions(query, context);
        } catch (error) {
          console.error(`${provider} related questions error:`, error);
          return []; // Return empty array on error
        }
      }
    };
  }

  private updateHealthStatus(
    provider: AIProvider, 
    healthy: boolean, 
    error?: any, 
    latency?: number
  ): void {
    const current = this.healthStatus.get(provider) || {
      provider,
      healthy: true,
      lastCheck: new Date(),
      errorCount: 0,
      errorRate: 0,
    };

    const newStatus: ProviderHealthStatus = {
      ...current,
      healthy,
      lastCheck: new Date(),
      latency,
      errorCount: healthy ? current.errorCount : current.errorCount + 1,
      lastError: error ? String(error) : current.lastError,
    };

    // Calculate error rate (last 100 checks)
    newStatus.errorRate = Math.min(newStatus.errorCount / 100 * 100, 100);

    this.healthStatus.set(provider, newStatus);
  }

  private trackCost(
    provider: AIProvider,
    operation: 'embedding' | 'generation',
    inputTokens: number,
    outputTokens: number
  ): void {
    // Simplified cost calculation
    let cost = 0;
    
    if (provider === 'openai') {
      if (operation === 'embedding') {
        cost = inputTokens * 0.00002 / 1000; // text-embedding-3-small pricing
      } else {
        cost = inputTokens * 0.0005 / 1000 + outputTokens * 0.0015 / 1000; // GPT-3.5-turbo pricing
      }
    } else if (provider === 'vertexai') {
      if (operation === 'embedding') {
        cost = inputTokens * 0.00015 / 1000; // gemini-embedding-001 pricing: $0.15 per 1M tokens
      } else {
        cost = inputTokens * 0.0025 / 1000 + outputTokens * 0.0075 / 1000; // Gemini Pro pricing
      }
    } else if (provider === 'gemini') {
      if (operation === 'embedding') {
        cost = inputTokens * 0.00015 / 1000; // gemini-embedding-001 pricing: $0.15 per 1M tokens
      } else {
        cost = inputTokens * 0.0025 / 1000 + outputTokens * 0.0075 / 1000; // Gemini Pro pricing (if LLM implemented)
      }
    }

    this.costTracking.push({
      provider,
      operation,
      inputTokens,
      outputTokens,
      cost,
      timestamp: new Date(),
    });

    // Keep only recent cost data (last 1000 records)
    if (this.costTracking.length > 1000) {
      this.costTracking = this.costTracking.slice(-1000);
    }
  }

  private initializeHealthChecks(): void {
    if (this.config.healthCheckInterval > 0) {
      this.healthCheckInterval = setInterval(async () => {
        await this.performHealthChecks();
      }, this.config.healthCheckInterval);
      
      console.log(`🏥 Health checks scheduled every ${this.config.healthCheckInterval}ms`);
    }
  }

  private async performHealthChecks(): Promise<void> {
    const providers = [this.config.primary, ...this.config.fallback];
    
    for (const provider of providers) {
      try {
        // Simple health check - try to create and test services
        const embeddingService = await this.createEmbeddingServiceForProvider(provider);
        const llmService = await this.createLLMServiceForProvider(provider);
        
        const embeddingHealthy = await this.testEmbeddingService(embeddingService, provider);
        const llmHealthy = await this.testLLMService(llmService, provider);
        
        this.updateHealthStatus(provider, embeddingHealthy && llmHealthy);
      } catch (error) {
        this.updateHealthStatus(provider, false, error);
      }
    }
  }

  // Public methods for monitoring
  getHealthStatus(): Map<AIProvider, ProviderHealthStatus> {
    return new Map(this.healthStatus);
  }

  getCostSummary(): { total: number; byProvider: Record<AIProvider, number> } {
    const total = this.costTracking.reduce((sum, record) => sum + record.cost, 0);
    const byProvider: Record<AIProvider, number> = {} as Record<AIProvider, number>;
    
    for (const record of this.costTracking) {
      byProvider[record.provider] = (byProvider[record.provider] || 0) + record.cost;
    }
    
    return { total, byProvider };
  }

  // Cleanup
  dispose(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export const createProviderFactory = (config: ProviderConfig): ProviderFactory => {
  return new ProviderFactory(config);
};