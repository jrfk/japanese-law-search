import { v4 as uuidv4 } from 'uuid';
import { 
  QueryRequest, 
  QueryResponse, 
  SearchResult,
  VectorStore,
  SearchOptions,
  ConversationMessage 
} from '../types';
import { LLMProvider, ConversationManager } from './llm-service';

export class QueryProcessor {
  constructor(
    private vectorStore: VectorStore,
    private llmService: LLMProvider,
    private conversationManager: ConversationManager
  ) {}

  async processQuery(request: QueryRequest): Promise<QueryResponse> {
    const { query, conversationId, language = 'ja', filters } = request;
    
    const actualConversationId = conversationId || uuidv4();
    
    let conversation = this.conversationManager.getConversation(actualConversationId);
    if (!conversation) {
      conversation = this.conversationManager.createConversation(actualConversationId);
    }

    try {
      const searchOptions: SearchOptions = {
        limit: 10,
        threshold: 0.3,
        filters: filters?.filters
      };

      const searchResults = await this.vectorStore.search(query, searchOptions);
      
      const conversationHistory = this.conversationManager.getConversationHistory(
        actualConversationId,
        6
      );

      const answer = await this.llmService.generateResponse(
        query,
        searchResults,
        conversationHistory
      );

      const relatedQuestions = await this.llmService.generateRelatedQuestions(
        query,
        searchResults
      );

      const sources = this.conversationManager.createSourceCitations(searchResults);

      const userMessage: ConversationMessage = {
        role: 'user',
        content: query,
        timestamp: new Date()
      };

      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: answer,
        sources,
        timestamp: new Date()
      };

      this.conversationManager.addMessage(actualConversationId, userMessage);
      this.conversationManager.addMessage(actualConversationId, assistantMessage);

      return {
        answer,
        sources,
        relatedQuestions,
        conversationId: actualConversationId
      };

    } catch (error) {
      console.error('Query processing failed:', error);
      
      const errorMessage = language === 'en' 
        ? 'I apologize, but I encountered an error while processing your query. Please try again.'
        : '申し訳ございませんが、クエリの処理中にエラーが発生しました。もう一度お試しください。';

      return {
        answer: errorMessage,
        sources: [],
        relatedQuestions: [],
        conversationId: actualConversationId
      };
    }
  }

  async searchDocuments(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    return await this.vectorStore.search(query, options);
  }

  getConversationHistory(conversationId: string): ConversationMessage[] {
    return this.conversationManager.getConversationHistory(conversationId);
  }

  private preprocessQuery(query: string, language: 'ja' | 'en'): string {
    let processed = query.trim();
    
    if (language === 'ja') {
      processed = processed
        .replace(/？/g, '?')
        .replace(/！/g, '!')
        .replace(/，/g, ',')
        .replace(/．/g, '.');
    }

    processed = processed
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf?!.,、。]/g, '');

    return processed;
  }

  private shouldUseConversationContext(
    query: string, 
    conversationHistory: ConversationMessage[]
  ): boolean {
    if (conversationHistory.length === 0) return false;

    const contextIndicators = [
      /^(それ|これ|その|この)/,
      /について$/,
      /はどう/,
      /^(また|さらに|他に)/,
      /詳し[いく]/,
      /もっと/,
      /explain/i,
      /more/i,
      /detail/i
    ];

    return contextIndicators.some(pattern => pattern.test(query));
  }
}

export const createQueryProcessor = (
  vectorStore: VectorStore,
  llmService: LLMProvider,
  conversationManager: ConversationManager
): QueryProcessor => {
  return new QueryProcessor(vectorStore, llmService, conversationManager);
};