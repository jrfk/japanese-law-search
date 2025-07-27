import { create } from 'zustand';
import { api } from '@/lib/api';
import { Message, SearchFilters } from '@/lib/types';

interface ChatState {
  messages: Message[];
  currentConversationId: string | null;
  isLoading: boolean;
  filters: SearchFilters;
  
  // Actions
  sendMessage: (query: string) => Promise<void>;
  setFilters: (filters: SearchFilters) => void;
  clearChat: () => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentConversationId: null,
  isLoading: false,
  filters: {},

  sendMessage: async (query: string) => {
    const { filters, currentConversationId } = get();
    
    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
    }));

    try {
      const response = await api.search({
        query,
        conversationId: currentConversationId || undefined,
        language: 'ja',
        filters,
      });

      if (response.success) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.data.answer,
          timestamp: new Date(),
          sources: response.data.sources,
          relatedQuestions: response.data.relatedQuestions,
        };

        set((state) => ({
          messages: [...state.messages, assistantMessage],
          currentConversationId: response.data.conversationId,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('Search error:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '申し訳ございません。検索中にエラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
      };

      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
      }));
    }
  },

  setFilters: (filters: SearchFilters) => {
    set({ filters });
  },

  clearChat: () => {
    set({
      messages: [],
      currentConversationId: null,
      isLoading: false,
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));