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
      const batchSize = 100;
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
        });

        const embeddings = response.data.map(item => item.embedding);
        results.push(...embeddings);
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