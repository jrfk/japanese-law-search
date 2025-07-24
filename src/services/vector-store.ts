import { ChromaClient, Collection } from 'chromadb';
import { VectorStore, EmbeddingService } from '../types';
import { DocumentChunk, SearchResult, SearchOptions } from '../types';

export class ChromaVectorStore implements VectorStore {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private embeddingService: EmbeddingService;
  private collectionName: string;

  constructor(embeddingService: EmbeddingService, options?: {
    host?: string;
    port?: number;
    collectionName?: string;
  }) {
    const { host = 'localhost', port = 8000, collectionName = 'japanese-law-documents' } = options || {};
    
    this.client = new ChromaClient({
      path: `http://${host}:${port}`
    });
    this.embeddingService = embeddingService;
    this.collectionName = collectionName;
  }

  private async getCollection(): Promise<Collection> {
    if (!this.collection) {
      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName
        } as any);
      } catch (error) {
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: {
            description: 'Japanese legal document embeddings for semantic search'
          }
        } as any);
      }
    }
    return this.collection;
  }

  async addEmbeddings(chunks: DocumentChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const collection = await this.getCollection();
    
    const ids = chunks.map(chunk => chunk.id);
    const documents = chunks.map(chunk => chunk.content);
    const metadatas = chunks.map(chunk => ({
      documentPath: chunk.documentPath,
      title: chunk.title,
      chunkIndex: chunk.chunkIndex,
      startPosition: chunk.startPosition,
      endPosition: chunk.endPosition,
      category: chunk.metadata.category,
      lawNumber: chunk.metadata.lawNumber || '',
      fileName: chunk.metadata.fileName,
      date: chunk.metadata.date?.toISOString() || '',
      era: chunk.metadata.era || ''
    }));

    let embeddings: number[][];
    
    if (chunks.some(chunk => chunk.embedding)) {
      embeddings = chunks.map(chunk => chunk.embedding || []);
    } else {
      embeddings = await this.embeddingService.generateEmbeddings(documents);
    }

    await collection.add({
      ids,
      embeddings,
      documents,
      metadatas
    });
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    return this.searchByEmbedding(queryEmbedding, options);
  }

  async searchByEmbedding(embedding: number[], options: SearchOptions = {}): Promise<SearchResult[]> {
    const collection = await this.getCollection();
    const { limit = 10, threshold = 0.0, filters } = options;

    let whereClause: Record<string, unknown> = {};
    
    if (filters) {
      if (filters.category) {
        whereClause.category = filters.category;
      }
      if (filters.lawNumber) {
        whereClause.lawNumber = filters.lawNumber;
      }
      if (filters.era) {
        whereClause.era = filters.era;
      }
    }

    const queryParams: any = {
      queryEmbeddings: [embedding],
      nResults: limit
    };
    
    if (Object.keys(whereClause).length > 0) {
      queryParams.where = whereClause;
    }

    const results = await collection.query(queryParams);

    const searchResults: SearchResult[] = [];

    if (results.ids && results.distances && results.documents && results.metadatas) {
      for (let i = 0; i < results.ids[0]!.length; i++) {
        const id = results.ids[0]![i]!;
        const distance = results.distances[0]![i]!;
        const document = results.documents[0]![i]!;
        const metadata = results.metadatas[0]![i]!;
        
        const similarity = 1 - distance;
        
        if (similarity >= threshold) {
          const chunk: DocumentChunk = {
            id,
            documentPath: metadata.documentPath as string,
            title: metadata.title as string,
            content: document,
            metadata: {
              category: metadata.category as string,
              lawNumber: metadata.lawNumber as string || undefined,
              fileName: metadata.fileName as string,
              filePath: metadata.documentPath as string,
              date: metadata.date ? new Date(metadata.date as string) : undefined,
              era: metadata.era as string || undefined,
              lastModified: new Date()
            },
            chunkIndex: metadata.chunkIndex as number,
            startPosition: metadata.startPosition as number,
            endPosition: metadata.endPosition as number
          };

          searchResults.push({
            chunk,
            score: similarity,
            highlights: this.extractHighlights(document, 100)
          });
        }
      }
    }

    return searchResults.sort((a, b) => b.score - a.score);
  }

  private extractHighlights(content: string, maxLength: number = 100): string[] {
    const sentences = content.split(/[。！？\n]/);
    const highlights: string[] = [];
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 0) {
        if (trimmed.length <= maxLength) {
          highlights.push(trimmed);
        } else {
          highlights.push(trimmed.substring(0, maxLength) + '...');
        }
        
        if (highlights.length >= 3) break;
      }
    }
    
    return highlights;
  }

  async updateEmbedding(chunkId: string, embedding: number[]): Promise<void> {
    const collection = await this.getCollection();
    
    await collection.update({
      ids: [chunkId],
      embeddings: [embedding]
    });
  }

  async deleteEmbeddings(chunkIds: string[]): Promise<void> {
    if (chunkIds.length === 0) return;
    
    const collection = await this.getCollection();
    
    await collection.delete({
      ids: chunkIds
    });
  }

  async getEmbeddingCount(): Promise<number> {
    const collection = await this.getCollection();
    const result = await collection.count();
    return result;
  }
}

export const createVectorStore = (
  embeddingService: EmbeddingService,
  options?: {
    host?: string;
    port?: number;
    collectionName?: string;
  }
): VectorStore => {
  return new ChromaVectorStore(embeddingService, options);
};