import { GoogleGenAI } from '@google/genai';
import { EmbeddingService } from '../types';
import { VertexAIConfig, VertexAIError } from '../types/vertex-ai';

export class VertexAIEmbeddingService implements EmbeddingService {
  private client: GoogleGenAI;
  private model: string;
  private config: VertexAIConfig;

  constructor(config: VertexAIConfig) {
    this.config = config;
    this.model = config.embeddingModel || 'gemini-embedding-001';
    
    console.log(`🔗 Initializing Vertex AI Embedding Service`);
    console.log(`📍 Project: ${config.projectId}, Location: ${config.location}`);
    console.log(`🤖 Model: ${this.model}`);

    // Set environment variables for Vertex AI mode
    process.env.GOOGLE_CLOUD_PROJECT = config.projectId;
    process.env.GOOGLE_CLOUD_LOCATION = config.location;
    process.env.GOOGLE_GENAI_USE_VERTEXAI = 'True';

    if (config.keyFilename) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = config.keyFilename;
      console.log(`🔑 Using service account key: ${config.keyFilename}`);
    } else {
      console.log(`🔑 Using Application Default Credentials (ADC)`);
    }

    // Initialize GoogleGenAI client for Vertex AI
    this.client = new GoogleGenAI({});

    console.log(`✅ Vertex AI Embedding Service initialized (using @google/genai)`);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log(`🧠 Generating embedding via Vertex AI for text (length: ${text.length})`);
      
      const response = await this.client.models.embedContent({
        model: this.model,
        contents: text
      });

      if (!response.embeddings || !response.embeddings[0] || !response.embeddings[0].values) {
        throw new VertexAIError('No embeddings received from Vertex AI');
      }

      const embedding = response.embeddings[0].values;
      console.log(`✅ Generated embedding via Vertex AI with ${embedding.length} dimensions`);
      
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding with Vertex AI:', error);
      
      if (error instanceof Error) {
        throw new VertexAIError(
          `Vertex AI embedding failed: ${error.message}`,
          'EMBEDDING_ERROR',
          undefined,
          error
        );
      }
      
      throw new VertexAIError('Unknown error in Vertex AI embedding generation');
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (texts.length === 0) return [];
      
      // Use native batch API if available (gemini-embedding-001 supports batch processing)
      if (this.model === 'gemini-embedding-001') {
        return await this.generateEmbeddingsBatch(texts);
      }
      
      // Fallback to sequential processing for other models
      return await this.generateEmbeddingsSequential(texts);
    } catch (error) {
      console.error('Failed to generate embeddings with Vertex AI:', error);
      throw new VertexAIError(
        `Vertex AI batch embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_EMBEDDING_ERROR',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  // Native batch processing for gemini-embedding-001
  private async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const batchSize = 50; // Optimized batch size for gemini-embedding-001
    const results: number[][] = [];
    
    console.log(`🚀 Using native batch processing for ${texts.length} texts with batch size ${batchSize}`);
    
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
          const sequentialResults = await Promise.all(
            batch.map(text => this.generateEmbedding(text).catch(() => []))
          );
          results.push(...sequentialResults.filter(emb => emb.length > 0));
        } else {
          const batchEmbeddings = response.embeddings.map(emb => emb.values || []);
          results.push(...batchEmbeddings);
          console.log(`✅ Batch completed: ${batchEmbeddings.length} embeddings (${batchEmbeddings[0]?.length || 0} dims)`);
        }
        
        // Rate limiting
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.warn(`⚠️ Batch processing failed for batch ${Math.floor(i/batchSize) + 1}, falling back to sequential:`, error);
        // Fallback to sequential processing for this batch
        const sequentialResults = await Promise.all(
          batch.map(text => this.generateEmbedding(text).catch(() => []))
        );
        results.push(...sequentialResults.filter(emb => emb.length > 0));
      }
    }
    
    console.log(`🎉 Batch processing completed: ${results.length}/${texts.length} successful embeddings`);
    return results;
  }

  // Sequential processing with concurrency control
  private async generateEmbeddingsSequential(texts: string[]): Promise<number[][]> {
    const concurrency = 5; // Controlled concurrency
    const results: number[][] = [];
    
    console.log(`🔄 Using sequential processing with concurrency ${concurrency} for ${texts.length} texts`);
    
    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (text, index) => {
        try {
          const embedding = await this.generateEmbedding(text);
          return { index: i + index, embedding };
        } catch (error) {
          console.warn(`Failed embedding for text ${i + index} (length: ${text.length}):`, error);
          return { index: i + index, embedding: [] as number[] };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(result => {
        if (result.embedding.length > 0) {
          results[result.index] = result.embedding;
        }
      });

      // Progress update
      const processed = Math.min(i + concurrency, texts.length);
      if (processed % 50 === 0 || processed === texts.length) {
        console.log(`🧠 Sequential: ${processed}/${texts.length} texts processed`);
      }
      
      // Rate limiting
      if (i + concurrency < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    const validResults = results.filter(emb => emb && emb.length > 0);
    console.log(`✅ Sequential processing completed: ${validResults.length}/${texts.length} successful`);
    return validResults;
  }

  // Health check method for provider monitoring
  async healthCheck(): Promise<boolean> {
    try {
      const testText = "健康チェック用のテストテキストです。";
      const embedding = await this.generateEmbedding(testText);
      return embedding.length > 0;
    } catch (error) {
      console.error('Vertex AI embedding health check failed:', error);
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
    // Model specifications for common Vertex AI embedding models
    const modelSpecs: Record<string, { dimensions: number; maxTokens: number }> = {
      'text-embedding-004': { dimensions: 768, maxTokens: 20000 },
      'textembedding-gecko': { dimensions: 768, maxTokens: 3072 },
      'textembedding-gecko-multilingual': { dimensions: 768, maxTokens: 3072 },
      'gemini-embedding-001': { dimensions: 3072, maxTokens: 20000 },
    };

    const spec = modelSpecs[this.model] || { dimensions: 3072, maxTokens: 20000 };
    
    return {
      name: this.model,
      ...spec,
    };
  }
}

export const createVertexAIEmbeddingService = (config: VertexAIConfig): EmbeddingService => {
  return new VertexAIEmbeddingService(config);
};