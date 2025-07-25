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
    
    console.log(`🔗 Connecting to ChromaDB at http://${host}:${port}`);
    
    this.client = new ChromaClient({
      path: `http://${host}:${port}`
    });
    this.embeddingService = embeddingService;
    this.collectionName = collectionName;
    
    console.log(`✅ ChromaDB client initialized for collection: ${collectionName}`);
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
    
    // Process in optimized batches to balance speed and payload limits
    const chromaBatchSize = 100; // Optimized batch size for ChromaDB
    
    for (let i = 0; i < chunks.length; i += chromaBatchSize) {
      const batchChunks = chunks.slice(i, i + chromaBatchSize);
      
      const ids = batchChunks.map(chunk => chunk.id);
      const documents = batchChunks.map(chunk => chunk.content);
      const metadatas = batchChunks.map(chunk => ({
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
      
      if (batchChunks.some(chunk => chunk.embedding)) {
        embeddings = batchChunks.map(chunk => chunk.embedding || []);
      } else {
        embeddings = await this.embeddingService.generateEmbeddings(documents);
      }

      try {
        await collection.add({
          ids,
          embeddings,
          documents,
          metadatas
        });
        
        if (i % 500 === 0 || i + chromaBatchSize >= chunks.length) {
          console.log(`💾 Stored ${Math.min(i + chromaBatchSize, chunks.length)}/${chunks.length} chunks to ChromaDB`);
        }
      } catch (error) {
        console.warn(`Failed to add batch ${Math.floor(i/chromaBatchSize) + 1}, retrying with smaller chunks...`);
        
        // If batch still fails, process individually
        for (let j = 0; j < batchChunks.length; j++) {
          const chunk = batchChunks[j];
          const metadata = metadatas[j];
          if (!chunk || !metadata) continue;
          
          try {
            const embedding = embeddings[j] || await this.embeddingService.generateEmbedding(chunk.content);
            
            await collection.add({
              ids: [chunk.id],
              embeddings: [embedding],
              documents: [chunk.content],
              metadatas: [metadata]
            });
          } catch (individualError) {
            console.error(`Failed to add individual chunk ${chunk.id}:`, individualError);
          }
        }
      }
    }
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