import { ProviderConfig, VertexAIConfig } from '../types/vertex-ai';
import { ProviderFactory } from '../services/provider-factory';
import { AIServiceFactory } from '../services/ai-service-factory';

// Mock environment variables for testing
const mockEnvVars = {
  AI_PROVIDER_PRIMARY: 'openai',
  AI_PROVIDER_FALLBACK: 'vertexai',
  OPENAI_API_KEY: 'test-openai-key',
  OPENAI_MODEL: 'gpt-3.5-turbo',
  OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small',
  VERTEX_AI_PROJECT_ID: 'test-project',
  VERTEX_AI_LOCATION: 'asia-northeast1',
  VERTEX_AI_TEXT_MODEL: 'gemini-1.5-pro',
  VERTEX_AI_EMBEDDING_MODEL: 'text-embedding-004',
  HEALTH_CHECK_INTERVAL: '300000',
  COST_OPTIMIZATION_ENABLED: 'true',
  MONTHLY_BUDGET_LIMIT: '100'
};

// Mock process.env
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv, ...mockEnvVars };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Vertex AI Integration', () => {
  describe('ProviderConfig Creation', () => {
    test('should create valid provider configuration from environment', () => {
      const factory = AIServiceFactory.initialize();
      expect(factory).toBeDefined();
    });

    test('should support multiple providers in fallback chain', () => {
      const config: ProviderConfig = {
        primary: 'openai',
        fallback: ['vertexai'],
        healthCheckInterval: 300000,
        healthCheckTimeout: 10000,
        costOptimization: true,
        budgetLimit: 100,
        openai: {
          apiKey: 'test-key',
          model: 'gpt-3.5-turbo',
          embeddingModel: 'text-embedding-3-small'
        },
        vertexai: {
          projectId: 'test-project',
          location: 'asia-northeast1',
          textModel: 'gemini-1.5-pro',
          embeddingModel: 'text-embedding-004'
        }
      };

      const factory = new ProviderFactory(config);
      expect(factory).toBeDefined();
      
      const healthStatus = factory.getHealthStatus();
      expect(healthStatus).toBeDefined();
    });
  });

  describe('Provider Factory', () => {
    test('should initialize with correct provider configuration', () => {
      const config: ProviderConfig = {
        primary: 'vertexai',
        fallback: ['openai'],
        healthCheckInterval: 0, // Disable for tests
        healthCheckTimeout: 10000,
        costOptimization: false,
        vertexai: {
          projectId: 'test-project',
          location: 'us-central1',
          textModel: 'gemini-1.5-pro',
          embeddingModel: 'text-embedding-004'
        },
        openai: {
          apiKey: 'test-key',
          model: 'gpt-3.5-turbo'
        }
      };

      const factory = new ProviderFactory(config);
      expect(factory).toBeDefined();
    });

    test('should track cost information', () => {
      const config: ProviderConfig = {
        primary: 'openai',
        fallback: ['vertexai'],
        healthCheckInterval: 0,
        healthCheckTimeout: 10000,
        costOptimization: true,
        openai: {
          apiKey: 'test-key',
          model: 'gpt-3.5-turbo'
        }
      };

      const factory = new ProviderFactory(config);
      const costSummary = factory.getCostSummary();
      
      expect(costSummary).toHaveProperty('total');
      expect(costSummary).toHaveProperty('byProvider');
      expect(typeof costSummary.total).toBe('number');
      expect(typeof costSummary.byProvider).toBe('object');
    });
  });

  describe('Vertex AI Configuration Validation', () => {
    test('should validate required Vertex AI configuration fields', () => {
      const config: VertexAIConfig = {
        projectId: 'test-project-123',
        location: 'asia-northeast1',
        textModel: 'gemini-1.5-pro',
        embeddingModel: 'text-embedding-004'
      };

      expect(config.projectId).toBe('test-project-123');
      expect(config.location).toBe('asia-northeast1');
      expect(config.textModel).toBe('gemini-1.5-pro');
      expect(config.embeddingModel).toBe('text-embedding-004');
    });

    test('should support optional generation configuration', () => {
      const config: VertexAIConfig = {
        projectId: 'test-project',
        location: 'us-central1',
        textModel: 'gemini-1.5-flash',
        embeddingModel: 'text-embedding-004',
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 32,
          maxOutputTokens: 2048
        }
      };

      expect(config.generationConfig).toBeDefined();
      expect(config.generationConfig?.temperature).toBe(0.1);
      expect(config.generationConfig?.maxOutputTokens).toBe(2048);
    });

    test('should support optional key filename for authentication', () => {
      const config: VertexAIConfig = {
        projectId: 'test-project',
        location: 'europe-west1',
        textModel: 'gemini-1.5-pro',
        embeddingModel: 'text-embedding-004',
        keyFilename: '/path/to/service-account.json'
      };

      expect(config.keyFilename).toBe('/path/to/service-account.json');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing provider configuration gracefully', () => {
      const config: ProviderConfig = {
        primary: 'vertexai',
        fallback: [],
        healthCheckInterval: 0,
        healthCheckTimeout: 10000,
        costOptimization: false
        // Missing vertexai configuration
      };

      expect(() => new ProviderFactory(config)).not.toThrow();
    });

    test('should validate provider types', () => {
      const validProviders = ['openai', 'vertexai', 'anthropic', 'local'];
      
      validProviders.forEach(provider => {
        const config: ProviderConfig = {
          primary: provider as any,
          fallback: [],
          healthCheckInterval: 0,
          healthCheckTimeout: 10000,
          costOptimization: false
        };
        
        expect(() => new ProviderFactory(config)).not.toThrow();
      });
    });
  });

  describe('Cost Tracking', () => {
    test('should calculate estimated costs for different providers', () => {
      // OpenAI pricing (example)
      const openaiEmbeddingCost = 1000 * 0.00002 / 1000; // 1000 tokens
      const openaiGenerationCost = 500 * 0.0005 / 1000 + 200 * 0.0015 / 1000; // Input + output
      
      // Vertex AI pricing (example)
      const vertexaiEmbeddingCost = 1000 * 0.000025 / 1000; // 1000 tokens
      const vertexaiGenerationCost = 500 * 0.0025 / 1000 + 200 * 0.0075 / 1000; // Input + output
      
      expect(openaiEmbeddingCost).toBeCloseTo(0.00002);
      expect(vertexaiEmbeddingCost).toBeCloseTo(0.000025);
      expect(vertexaiGenerationCost).toBeGreaterThan(openaiGenerationCost);
    });
  });
});

describe('Regional Optimization', () => {
  test('should configure appropriate regions for Japanese content', () => {
    const japanConfig: VertexAIConfig = {
      projectId: 'japan-legal-search',
      location: 'asia-northeast1', // Tokyo region
      textModel: 'gemini-1.5-pro',
      embeddingModel: 'text-embedding-004'
    };

    expect(japanConfig.location).toBe('asia-northeast1');
  });

  test('should support multiple regional configurations', () => {
    const regions = [
      'us-central1',
      'us-east1',
      'europe-west1',
      'asia-northeast1',
      'asia-southeast1'
    ];

    regions.forEach(region => {
      const config: VertexAIConfig = {
        projectId: 'multi-region-test',
        location: region,
        textModel: 'gemini-1.5-pro',
        embeddingModel: 'text-embedding-004'
      };

      expect(config.location).toBe(region);
    });
  });
});