import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { createSearchController } from './controllers/search-controller';
import { createQueryProcessor } from './services/query-processor';
import { createVectorStore } from './services/vector-store';
import { createEmbeddingService } from './services/embedding-service';
import { createLLMService, conversationManager } from './services/llm-service';

config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const initializeServices = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const embeddingService = createEmbeddingService(apiKey, process.env.EMBEDDING_MODEL);
  const vectorStore = createVectorStore(embeddingService, {
    host: process.env.CHROMA_HOST,
    port: parseInt(process.env.CHROMA_PORT || '8000'),
    collectionName: 'japanese-law-documents'
  });
  
  const llmService = createLLMService(apiKey, process.env.OPENAI_MODEL);
  const queryProcessor = createQueryProcessor(vectorStore, llmService, conversationManager);
  const searchController = createSearchController(queryProcessor);

  return { searchController, queryProcessor, vectorStore };
};

const setupRoutes = (searchController: ReturnType<typeof createSearchController>) => {
  app.get('/health', searchController.healthCheck.bind(searchController));
  
  app.post('/api/search', searchController.search.bind(searchController));
  
  app.get('/api/documents/search', searchController.searchDocuments.bind(searchController));
  
  app.get('/api/conversations/:conversationId', searchController.getConversation.bind(searchController));
  
  app.get('/', (req, res) => {
    res.json({
      name: 'Japanese Law Search API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: 'GET /health',
        search: 'POST /api/search',
        documentSearch: 'GET /api/documents/search',
        conversation: 'GET /api/conversations/:conversationId'
      }
    });
  });

  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      availableEndpoints: {
        health: 'GET /health',
        search: 'POST /api/search',
        documentSearch: 'GET /api/documents/search',
        conversation: 'GET /api/conversations/:conversationId'
      }
    });
  });
};

const startServer = async () => {
  try {
    const { searchController } = initializeServices();
    setupRoutes(searchController);
    
    const port = parseInt(process.env.PORT || '3000');
    
    app.listen(port, () => {
      console.log(`🚀 Japanese Law Search API is running on port ${port}`);
      console.log(`📖 API Documentation: http://localhost:${port}`);
      console.log(`🏥 Health Check: http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export { app, initializeServices };
export default app;