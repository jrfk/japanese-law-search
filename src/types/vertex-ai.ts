// Vertex AI specific types and configurations

export interface VertexAIConfig {
  projectId: string;
  location: string; // e.g., 'us-central1', 'asia-northeast1'
  
  // LLM Models
  textModel: string; // e.g., 'gemini-1.5-pro', 'gemini-1.5-flash'
  
  // Embedding Models  
  embeddingModel: string; // e.g., 'text-embedding-004', 'textembedding-gecko'
  
  // Generation Parameters
  generationConfig?: VertexAIGenerationConfig;
  
  // Authentication
  keyFilename?: string; // Path to service account key file
  // If not provided, will use Application Default Credentials (ADC)
}

export interface VertexAIGenerationConfig {
  temperature?: number;      // 0.0 - 2.0, controls randomness
  topP?: number;            // 0.0 - 1.0, nucleus sampling
  topK?: number;            // 1 - 40, top-k sampling
  maxOutputTokens?: number; // Maximum tokens in response
  candidateCount?: number;  // Number of response candidates
  stopSequences?: string[]; // Sequences that stop generation
}

export interface VertexAIEmbeddingRequest {
  instances: Array<{
    content: string;
    task_type?: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' | 'SEMANTIC_SIMILARITY' | 'CLASSIFICATION' | 'CLUSTERING';
  }>;
}

export interface VertexAIEmbeddingResponse {
  predictions: Array<{
    embeddings: {
      statistics: {
        truncated: boolean;
        token_count: number;
      };
      values: number[];
    };
  }>;
}

export interface VertexAITextRequest {
  instances: Array<{
    content: string;
  }>;
  parameters?: VertexAIGenerationConfig;
}

export interface VertexAITextResponse {
  predictions: Array<{
    content: string;
    citationMetadata?: {
      citations: Array<{
        startIndex?: number;
        endIndex?: number;
        url?: string;
        title?: string;
        license?: string;
        publicationDate?: string;
      }>;
    };
    safetyAttributes?: {
      categories: string[];
      scores: number[];
      blocked: boolean;
    };
  }>;
}

// Provider configuration for multi-provider support
export type AIProvider = 'openai' | 'vertexai' | 'anthropic' | 'local';

export interface ProviderConfig {
  primary: AIProvider;
  fallback: AIProvider[];
  
  // Health check configuration
  healthCheckInterval: number; // milliseconds
  healthCheckTimeout: number;  // milliseconds
  
  // Cost optimization
  costOptimization: boolean;
  budgetLimit?: number; // monthly budget in USD
  
  // Regional routing
  preferredRegion?: string;
  
  // Provider-specific configurations
  openai?: {
    apiKey: string;
    organization?: string;
    model?: string;
    embeddingModel?: string;
  };
  
  vertexai?: VertexAIConfig;
  
  anthropic?: {
    apiKey: string;
    model?: string;
  };
  
  local?: {
    baseUrl: string;
    model?: string;
    embeddingModel?: string;
  };
}

export interface ProviderHealthStatus {
  provider: AIProvider;
  healthy: boolean;
  lastCheck: Date;
  latency?: number; // milliseconds
  errorCount: number;
  errorRate: number; // percentage
  lastError?: string;
}

export interface CostTracker {
  provider: AIProvider;
  operation: 'embedding' | 'generation';
  inputTokens: number;
  outputTokens?: number;
  cost: number; // USD
  timestamp: Date;
}

// Error types for better error handling
export class VertexAIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'VertexAIError';
  }
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}