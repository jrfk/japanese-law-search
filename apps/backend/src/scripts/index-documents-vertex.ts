#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { createDocumentIndexer } from '../utils/document-indexer';
import { createVectorStore } from '../services/vector-store';
import { VertexAIEmbeddingService } from '../services/vertex-ai-embedding';
import { VertexAIConfig } from '../types/vertex-ai';

config();

async function main() {
  const documentsPath = process.env.DOCUMENTS_PATH || './markdown';
  
  console.log('🚀 Initializing Vertex AI services directly...');
  
  // Validate Vertex AI configuration
  if (!process.env.VERTEX_AI_PROJECT_ID) {
    console.error('❌ VERTEX_AI_PROJECT_ID environment variable is required');
    process.exit(1);
  }
  
  try {
    // Create Vertex AI configuration
    const vertexConfig: VertexAIConfig = {
      projectId: process.env.VERTEX_AI_PROJECT_ID,
      location: process.env.VERTEX_AI_LOCATION || 'asia-northeast1',
      textModel: process.env.VERTEX_AI_TEXT_MODEL || 'gemini-1.5-pro',
      embeddingModel: process.env.VERTEX_AI_EMBEDDING_MODEL || 'text-embedding-004',
    };

    if (process.env.VERTEX_AI_KEY_FILENAME) {
      vertexConfig.keyFilename = process.env.VERTEX_AI_KEY_FILENAME;
    }

    console.log('🔧 Creating Vertex AI embedding service...');
    console.log(`   📍 Project: ${vertexConfig.projectId}`);
    console.log(`   🌍 Region: ${vertexConfig.location}`);
    console.log(`   🤖 Model: ${vertexConfig.embeddingModel}`);
    
    const embeddingService = new VertexAIEmbeddingService(vertexConfig);
    
    // Test the service
    console.log('🏥 Testing Vertex AI connection...');
    const isHealthy = await embeddingService.healthCheck();
    if (!isHealthy) {
      console.error('❌ Vertex AI health check failed');
      process.exit(1);
    }
    console.log('✅ Vertex AI connection successful');
    
    console.log('🗃️ Setting up vector store...');
    const vectorStore = createVectorStore(embeddingService, {
      host: process.env.CHROMA_HOST || 'localhost',
      port: parseInt(process.env.CHROMA_PORT || '8000'),
      collectionName: 'japanese-law-documents-vertex'  // Different collection for Vertex AI
    });
    
    const indexer = createDocumentIndexer(vectorStore, documentsPath);
    
    console.log('📊 Getting current stats...');
    const statsBefore = await indexer.getIndexingStats();
    console.log(`📄 Documents to process: ${statsBefore.totalDocuments}`);
    console.log(`💾 Current embeddings: ${statsBefore.totalEmbeddings}`);
    
    const startTime = Date.now();
    await indexer.indexAllDocuments();
    const endTime = Date.now();
    
    const statsAfter = await indexer.getIndexingStats();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n🎯 Vertex AI Indexing Summary:');
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📄 Documents processed: ${statsAfter.totalDocuments}`);
    console.log(`💾 Total embeddings: ${statsAfter.totalEmbeddings}`);
    console.log(`📈 New embeddings: ${statsAfter.totalEmbeddings - statsBefore.totalEmbeddings}`);
    console.log(`🌍 Region: ${vertexConfig.location}`);
    console.log(`🤖 Model: ${vertexConfig.embeddingModel}`);
    
    // Get embedding dimensions for information
    const dimensions = await embeddingService.getEmbeddingDimensions();
    console.log(`📐 Embedding dimensions: ${dimensions}`);
    
  } catch (error) {
    console.error('❌ Vertex AI indexing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}