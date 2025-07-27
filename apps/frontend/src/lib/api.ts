// API functions for Japanese Law Search
export interface SearchRequest {
  query: string;
  conversationId?: string;
  language: string;
  filters?: {
    category?: string;
    era?: string;
  };
}

export interface SearchResponse {
  success: boolean;
  data: {
    answer: string;
    conversationId: string;
    sources: Array<{
      title: string;
      excerpt: string;
      score: number;
      lawNumber?: string;
      category?: string;
    }>;
    relatedQuestions?: string[];
  };
}

export interface ConversationResponse {
  success: boolean;
  data: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: string;
      sources?: Array<{
        title: string;
        excerpt: string;
        score: number;
      }>;
    }>;
  };
}

export const api = {
  async search(request: SearchRequest): Promise<SearchResponse> {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async getConversation(conversationId: string): Promise<ConversationResponse> {
    const response = await fetch(`/api/conversations/${conversationId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch('/health');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};