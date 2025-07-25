import { GoogleGenAI } from '@google/genai';
import { EmbeddingService } from '../types';
import { VertexAIError } from '../types/vertex-ai';

export interface GeminiEmbeddingConfig {
  apiKey: string;
  model?: string;
}

export class GeminiEmbeddingService implements EmbeddingService {
  private client: GoogleGenAI;
  private model: string;
  private config: GeminiEmbeddingConfig;

  constructor(config: GeminiEmbeddingConfig) {
    this.config = config;
    this.model = config.model || 'gemini-embedding-001';
    
    console.log(`🔗 Initializing Gemini Embedding Service`);
    console.log(`🤖 Model: ${this.model}`);

    // Initialize Gemini client
    this.client = new GoogleGenAI({
      apiKey: config.apiKey,
    });

    console.log(`✅ Gemini Embedding Service initialized`);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log(`🧠 Generating embedding for text (length: ${text.length})`);
      
      const response = await this.client.models.embedContent({
        model: this.model,
        contents: text
      });

      if (!response.embeddings || !response.embeddings[0] || !response.embeddings[0].values) {
        throw new VertexAIError('No embeddings received from Gemini API');
      }

      const embedding = response.embeddings[0].values;
      console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
      
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding with Gemini API:', error);
      
      if (error instanceof Error) {
        throw new VertexAIError(
          `Gemini embedding failed: ${error.message}`,
          'EMBEDDING_ERROR',
          undefined,
          error
        );
      }
      
      throw new VertexAIError('Unknown error in Gemini embedding generation');
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const batchSize = 100; // Gemini recommended batch size
      const results: number[][] = [];

      // Process in parallel with concurrency limit
      const concurrency = 5; // Conservative concurrency for Gemini API
      const batches: string[][] = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        batches.push(texts.slice(i, i + batchSize));
      }

      console.log(`🧠 Generating embeddings for ${texts.length} texts using ${batches.length} batches`);

      for (let i = 0; i < batches.length; i += concurrency) {
        const concurrentBatches = batches.slice(i, i + concurrency);
        
        const batchPromises = concurrentBatches.map(async (batch) => {
          const batchResults: number[][] = [];
          
          // Process each text in the batch sequentially for better reliability
          for (const text of batch) {
            try {
              const embedding = await this.generateEmbedding(text);
              batchResults.push(embedding);
            } catch (error) {
              console.warn(`Failed to generate embedding for text (length: ${text.length}):`, error);
              // Generate empty embedding as fallback
              batchResults.push([]);
            }
          }
          
          return batchResults;
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(batchEmbeddings => {
          results.push(...batchEmbeddings);
        });

        // Show progress
        const processedBatches = Math.min(i + concurrency, batches.length);
        console.log(`🧠 Gemini: Generated embeddings for ${processedBatches}/${batches.length} batches`);
      }

      // Filter out empty embeddings
      const validResults = results.filter(embedding => embedding.length > 0);
      
      if (validResults.length < texts.length) {
        console.warn(`⚠️ Some embeddings failed: ${validResults.length}/${texts.length} successful`);
      }

      return validResults;
    } catch (error) {
      console.error('Failed to generate embeddings with Gemini API:', error);
      
      if (error instanceof Error) {
        throw new VertexAIError(
          `Gemini batch embedding failed: ${error.message}`,
          'BATCH_EMBEDDING_ERROR',
          undefined,
          error
        );
      }
      
      throw new VertexAIError('Unknown error in Gemini batch embedding generation');
    }
  }

  // Health check method for provider monitoring
  async healthCheck(): Promise<boolean> {
    try {
      const testText = "健康チェック用のテストテキストです。";
      const embedding = await this.generateEmbedding(testText);
      return embedding.length > 0;
    } catch (error) {
      console.error('Gemini embedding health check failed:', error);
      return false;
    }
  }

  // Get embedding dimensions for this model
  async getEmbeddingDimensions(): Promise<number> {
    try {
      const testText = "test";
      const embedding = await this.generateEmbedding(testText);
      return embedding.length;
    } catch (error) {
      console.error('Failed to get embedding dimensions:', error);
      // Return default dimension for gemini-embedding-001
      return 3072;
    }
  }

  // Get model information
  getModelInfo(): { name: string; dimensions: number; maxTokens: number } {
    // Model specifications for Gemini embedding models
    const modelSpecs: Record<string, { dimensions: number; maxTokens: number }> = {
      'gemini-embedding-001': { dimensions: 3072, maxTokens: 2048 },
    };

    const spec = modelSpecs[this.model] || { dimensions: 3072, maxTokens: 2048 };
    
    return {
      name: this.model,
      ...spec,
    };
  }
}

export const createGeminiEmbeddingService = (config: GeminiEmbeddingConfig): EmbeddingService => {
  return new GeminiEmbeddingService(config);
};