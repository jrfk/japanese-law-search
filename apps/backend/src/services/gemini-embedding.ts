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
      if (texts.length === 0) return [];
      
      // Use native batch processing for gemini-embedding-001
      return await this.generateEmbeddingsBatch(texts);
    } catch (error) {
      console.error('Failed to generate embeddings with Gemini API:', error);
      throw new VertexAIError(
        `Gemini batch embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_EMBEDDING_ERROR',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  // Native batch processing for gemini-embedding-001
  private async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const batchSize = 100; // Gemini API supports larger batches
    const results: number[][] = [];
    
    console.log(`🚀 Gemini API batch processing for ${texts.length} texts with batch size ${batchSize}`);
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      try {
        console.log(`🧠 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(texts.length/batchSize)} (${batch.length} texts)`);
        
        // Use batch API call with multiple contents
        const response = await this.client.models.embedContent({
          model: this.model,
          contents: batch
        });

        if (!response.embeddings || response.embeddings.length !== batch.length) {
          console.warn(`⚠️ Batch response mismatch: expected ${batch.length}, got ${response.embeddings?.length || 0}`);
          // Fallback to sequential processing for this batch
          const sequentialResults = await this.processSequentialBatch(batch);
          results.push(...sequentialResults);
        } else {
          const batchEmbeddings = response.embeddings.map(emb => emb.values || []);
          results.push(...batchEmbeddings);
          console.log(`✅ Batch completed: ${batchEmbeddings.length} embeddings (${batchEmbeddings[0]?.length || 0} dims)`);
        }
        
        // Rate limiting for API compliance
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error) {
        console.warn(`⚠️ Batch processing failed for batch ${Math.floor(i/batchSize) + 1}, falling back to sequential:`, error);
        // Fallback to sequential processing for this batch
        const sequentialResults = await this.processSequentialBatch(batch);
        results.push(...sequentialResults);
      }
    }
    
    console.log(`🎉 Gemini batch processing completed: ${results.length}/${texts.length} successful embeddings`);
    return results;
  }

  // Sequential processing fallback
  private async processSequentialBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    const concurrency = 10; // Higher concurrency for Gemini API
    
    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (text) => {
        try {
          return await this.generateEmbedding(text);
        } catch (error) {
          console.warn(`Failed embedding for text (length: ${text.length}):`, error);
          return [] as number[];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(emb => emb.length > 0));
      
      // Rate limiting
      if (i + concurrency < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
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