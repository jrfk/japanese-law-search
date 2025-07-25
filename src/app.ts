import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from 'dotenv';
import { createSearchController } from './controllers/search-controller';
import { createQueryProcessor } from './services/query-processor';
import { createVectorStore } from './services/vector-store';
import { conversationManager } from './services/llm-service';
import { AIServiceFactory } from './services/ai-service-factory';

config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

const initializeServices = async () => {
  // Initialize AI Service Factory
  const aiServiceFactory = AIServiceFactory.initialize();
  
  console.log('🔧 Creating AI services...');
  const embeddingService = await aiServiceFactory.createEmbeddingService();
  const llmService = await aiServiceFactory.createLLMService();
  
  console.log('🗃️ Setting up vector store...');
  const vectorStore = createVectorStore(embeddingService, {
    host: process.env.CHROMA_HOST,
    port: parseInt(process.env.CHROMA_PORT || '8000'),
    collectionName: 'japanese-law-documents'
  });
  
  console.log('⚙️ Creating query processor...');
  const queryProcessor = createQueryProcessor(vectorStore, llmService, conversationManager);
  const searchController = createSearchController(queryProcessor);

  return { searchController, queryProcessor, vectorStore, aiServiceFactory };
};

const setupRoutes = (searchController: ReturnType<typeof createSearchController>) => {
  app.get('/health', searchController.healthCheck.bind(searchController));
  
  app.post('/api/search', searchController.search.bind(searchController));
  
  app.get('/api/documents/search', searchController.searchDocuments.bind(searchController));
  
  app.get('/api/conversations/:conversationId', searchController.getConversation.bind(searchController));
  
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  app.get('/api', (req, res) => {
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
    console.log('🔄 Initializing services...');
    const { searchController, aiServiceFactory } = await initializeServices();
    console.log('✅ Services initialized successfully');
    
    setupRoutes(searchController);
    console.log('✅ Routes setup completed');
    
    // Log provider health status
    const healthStatus = aiServiceFactory.getHealthStatus();
    console.log('🏥 Provider health status:');
    for (const [provider, status] of healthStatus) {
      const statusIcon = status.healthy ? '✅' : '❌';
      console.log(`   ${statusIcon} ${provider}: ${status.healthy ? 'healthy' : 'unhealthy'}`);
    }
    
    const port = parseInt(process.env.PORT || '3000');
    
    app.listen(port, () => {
      console.log(`🚀 Japanese Law Search API is running on port ${port}`);
      console.log(`📖 API Documentation: http://localhost:${port}`);
      console.log(`🏥 Health Check: http://localhost:${port}/health`);
      
      // Log cost summary
      const costSummary = aiServiceFactory.getCostSummary();
      if (costSummary.total > 0) {
        console.log(`💰 Total API cost: $${costSummary.total.toFixed(4)}`);
      }
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      aiServiceFactory.dispose();
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      aiServiceFactory.dispose();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Error details:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export { app, initializeServices };
export default app;