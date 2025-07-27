// Type definitions for Japanese Law Search

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];
  relatedQuestions?: string[];
}

export interface Source {
  title: string;
  excerpt: string;
  score: number;
  lawNumber?: string;
  category?: string;
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  messages: Message[];
}

export interface SearchFilters {
  category?: string;
  era?: string;
}

export interface ChatState {
  messages: Message[];
  currentConversationId: string | null;
  isLoading: boolean;
  filters: SearchFilters;
}

export interface ConversationState {
  conversations: Conversation[];
  currentConversation: string | null;
}

// Law categories mapping
export const LAW_CATEGORIES = {
  '321': '憲法',
  '322': '民法', 
  '323': '刑法',
  '324': '商法',
  '325': '民事訴訟法',
} as const;

// Era mapping
export const ERAS = {
  '明治': '明治',
  '大正': '大正', 
  '昭和': '昭和',
  '平成': '平成',
  '令和': '令和',
} as const;