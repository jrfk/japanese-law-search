import OpenAI from 'openai';
import { EmbeddingService } from '../types';

export class OpenAIEmbeddingService implements EmbeddingService {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'text-embedding-3-small') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0]?.embedding ?? [];
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const batchSize = 500; // Increased batch size for better throughput
      const results: number[][] = [];

      // Process batches in parallel with concurrency limit
      const concurrency = 5;
      const batches: string[][] = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        batches.push(texts.slice(i, i + batchSize));
      }

      for (let i = 0; i < batches.length; i += concurrency) {
        const concurrentBatches = batches.slice(i, i + concurrency);
        
        const batchPromises = concurrentBatches.map(async (batch) => {
          const response = await this.client.embeddings.create({
            model: this.model,
            input: batch,
          });
          return response.data.map(item => item.embedding);
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(batchEmbeddings => {
          results.push(...batchEmbeddings);
        });

        // Show progress
        const processedBatches = Math.min(i + concurrency, batches.length);
        console.log(`🧠 Generated embeddings for ${processedBatches}/${batches.length} batches`);
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }
}

export const createEmbeddingService = (apiKey: string, model?: string): EmbeddingService => {
  return new OpenAIEmbeddingService(apiKey, model);
};