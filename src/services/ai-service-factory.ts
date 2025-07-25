import { ProviderConfig, AIProvider, VertexAIConfig } from '../types/vertex-ai';
import { EmbeddingService } from '../types';
import { LLMProvider } from './llm-service';
import { ProviderFactory } from './provider-factory';

export class AIServiceFactory {
  private providerFactory: ProviderFactory;
  private static instance: AIServiceFactory;

  private constructor(providerConfig: ProviderConfig) {
    this.providerFactory = new ProviderFactory(providerConfig);
  }

  static initialize(providerConfig?: ProviderConfig): AIServiceFactory {
    if (!AIServiceFactory.instance) {
      const config = providerConfig || AIServiceFactory.createDefaultConfig();
      AIServiceFactory.instance = new AIServiceFactory(config);
    }
    return AIServiceFactory.instance;
  }

  static getInstance(): AIServiceFactory {
    if (!AIServiceFactory.instance) {
      throw new Error('AIServiceFactory not initialized. Call initialize() first.');
    }
    return AIServiceFactory.instance;
  }

  async createEmbeddingService(): Promise<EmbeddingService> {
    return await this.providerFactory.createEmbeddingService();
  }

  async createLLMService(): Promise<LLMProvider> {
    return await this.providerFactory.createLLMService();
  }

  getHealthStatus() {
    return this.providerFactory.getHealthStatus();
  }

  getCostSummary() {
    return this.providerFactory.getCostSummary();
  }

  private static createDefaultConfig(): ProviderConfig {
    const primary = (process.env.AI_PROVIDER_PRIMARY as AIProvider) || 'openai';
    const fallbackList = process.env.AI_PROVIDER_FALLBACK?.split(',') || ['vertexai'];
    const fallback = fallbackList.filter(p => p !== primary) as AIProvider[];

    const config: ProviderConfig = {
      primary,
      fallback,
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '300000'),
      healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '10000'),
      costOptimization: process.env.COST_OPTIMIZATION_ENABLED === 'true',
      budgetLimit: parseFloat(process.env.MONTHLY_BUDGET_LIMIT || '100'),
      preferredRegion: process.env.VERTEX_AI_LOCATION || 'asia-northeast1',
    };

    console.log(`🔧 AI Provider Configuration:`);
    console.log(`   Primary: ${primary}`);
    console.log(`   Fallback: ${fallback.join(', ') || 'none'}`);
    console.log(`   Cost optimization: ${config.costOptimization ? 'enabled' : 'disabled'}`);
    console.log(`   Budget limit: $${config.budgetLimit}/month`);

    // Configure OpenAI
    if (process.env.OPENAI_API_KEY) {
      config.openai = {
        apiKey: process.env.OPENAI_API_KEY,
        organization: process.env.OPENAI_ORGANIZATION,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      };
      console.log(`   ✅ OpenAI configured (model: ${config.openai.model})`);
    } else if (primary === 'openai' || fallback.includes('openai')) {
      console.warn(`   ⚠️  OpenAI requested but OPENAI_API_KEY not found`);
    }

    // Configure Vertex AI
    if (process.env.VERTEX_AI_PROJECT_ID) {
      const vertexConfig: VertexAIConfig = {
        projectId: process.env.VERTEX_AI_PROJECT_ID,
        location: process.env.VERTEX_AI_LOCATION || 'asia-northeast1',
        textModel: process.env.VERTEX_AI_TEXT_MODEL || 'gemini-1.5-pro',
        embeddingModel: process.env.VERTEX_AI_EMBEDDING_MODEL || 'text-embedding-004',
      };

      if (process.env.VERTEX_AI_KEY_FILENAME) {
        vertexConfig.keyFilename = process.env.VERTEX_AI_KEY_FILENAME;
      }

      config.vertexai = vertexConfig;
      console.log(`   ✅ Vertex AI configured (project: ${vertexConfig.projectId}, region: ${vertexConfig.location})`);
    } else if (primary === 'vertexai' || fallback.includes('vertexai')) {
      console.warn(`   ⚠️  Vertex AI requested but VERTEX_AI_PROJECT_ID not found`);
    }

    // Validate configuration
    const hasValidPrimary = (primary === 'openai' && config.openai) || 
                           (primary === 'vertexai' && config.vertexai);
    
    if (!hasValidPrimary) {
      throw new Error(`Primary provider '${primary}' is not properly configured. Please check your environment variables.`);
    }

    return config;
  }

  dispose(): void {
    this.providerFactory.dispose();
  }
}

// Factory functions for backward compatibility
export const createEmbeddingService = async (apiKey?: string, model?: string): Promise<EmbeddingService> => {
  const factory = AIServiceFactory.getInstance();
  return await factory.createEmbeddingService();
};

export const createLLMService = async (apiKey?: string, model?: string): Promise<LLMProvider> => {
  const factory = AIServiceFactory.getInstance();
  return await factory.createLLMService();
};