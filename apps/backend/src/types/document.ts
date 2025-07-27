export interface DocumentMetadata {
  lawNumber?: string;
  date?: Date;
  category: string;
  era?: string;
  fileName: string;
  filePath: string;
  lastModified: Date;
}

export interface DocumentChunk {
  id: string;
  documentPath: string;
  title: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
  chunkIndex: number;
  startPosition: number;
  endPosition: number;
}

export interface DocumentRecord {
  path: string;
  title: string;
  lastModified: Date;
  metadata: DocumentMetadata;
  chunkIds: string[];
  fullContent: string;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  highlights: string[];
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  filters?: MetadataFilter;
}

export interface MetadataFilter {
  category?: string;
  lawNumber?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  era?: string;
}

export interface SourceCitation {
  documentPath: string;
  title: string;
  excerpt: string;
  score: number;
  chunkId: string;
}

export interface QueryRequest {
  query: string;
  conversationId?: string;
  language?: 'ja' | 'en';
  filters?: SearchOptions;
}

export interface QueryResponse {
  answer: string;
  sources: SourceCitation[];
  relatedQuestions: string[];
  conversationId: string;
}

export interface Conversation {
  id: string;
  messages: ConversationMessage[];
  createdAt: Date;
  lastActivity: Date;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  timestamp: Date;
}