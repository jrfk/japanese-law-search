import { Request, Response } from 'express';
import { QueryProcessor } from '../services/query-processor';
import { QueryRequest, SearchOptions } from '../types';

export class SearchController {
  constructor(private queryProcessor: QueryProcessor) {}

  async search(req: Request, res: Response): Promise<void> {
    try {
      const { query, conversationId, language, filters } = req.body as QueryRequest;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
          error: 'Query is required and must be a non-empty string'
        });
        return;
      }

      const request: QueryRequest = {
        query: query.trim(),
        conversationId,
        language: language || 'ja',
        filters
      };

      const response = await this.queryProcessor.processQuery(request);

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async searchDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, limit, threshold, category, era, lawNumber } = req.query;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
          error: 'Query parameter "q" is required'
        });
        return;
      }

      const options: SearchOptions = {
        limit: limit ? parseInt(limit as string, 10) : 10,
        threshold: threshold ? parseFloat(threshold as string) : 0.3,
        filters: {
          category: category as string,
          era: era as string,
          lawNumber: lawNumber as string
        }
      };

      Object.keys(options.filters!).forEach(key => {
        if (!options.filters![key as keyof typeof options.filters]) {
          delete options.filters![key as keyof typeof options.filters];
        }
      });

      const results = await this.queryProcessor.searchDocuments(query.trim(), options);

      res.json({
        success: true,
        data: {
          results,
          query: query.trim(),
          count: results.length
        }
      });
    } catch (error) {
      console.error('Document search error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;

      if (!conversationId) {
        res.status(400).json({
          error: 'Conversation ID is required'
        });
        return;
      }

      const history = this.queryProcessor.getConversationHistory(conversationId);

      res.json({
        success: true,
        data: {
          conversationId,
          messages: history
        }
      });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const createSearchController = (queryProcessor: QueryProcessor): SearchController => {
  return new SearchController(queryProcessor);
};