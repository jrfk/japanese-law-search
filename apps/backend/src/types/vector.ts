import { DocumentChunk, SearchResult, SearchOptions } from './document';

export interface VectorStore {
  addEmbeddings(chunks: DocumentChunk[]): Promise<void>;
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  searchByEmbedding(embedding: number[], options: SearchOptions): Promise<SearchResult[]>;
  updateEmbedding(chunkId: string, embedding: number[]): Promise<void>;
  deleteEmbeddings(chunkIds: string[]): Promise<void>;
  getEmbeddingCount(): Promise<number>;
}

export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

export interface DocumentIndex {
  documents: Map<string, DocumentRecord>;
  chunks: Map<string, DocumentChunk>;
  vectorStore: VectorStore;
}

interface DocumentRecord {
  path: string;
  title: string;
  lastModified: Date;
  metadata: import('./document').DocumentMetadata;
  chunkIds: string[];
}