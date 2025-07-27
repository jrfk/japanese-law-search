#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { createDocumentIndexer } from '../utils/document-indexer';
import { createVectorStore } from '../services/vector-store';
import { AIServiceFactory } from '../services/ai-service-factory';

config();

async function main() {
  const documentsPath = process.env.DOCUMENTS_PATH || './markdown';
  
  console.log('🚀 Initializing AI services...');
  
  try {
    // Initialize AI Service Factory
    const aiServiceFactory = AIServiceFactory.initialize();
    
    // Log provider configuration
    const healthStatus = aiServiceFactory.getHealthStatus();
    console.log('🏥 Available providers:');
    for (const [provider] of healthStatus) {
      console.log(`   📡 ${provider}`);
    }
    
    console.log('🔧 Creating embedding service...');
    const embeddingService = await aiServiceFactory.createEmbeddingService();
    
    // Log which provider is actually being used
    const providerName = (embeddingService as any).providerName;
    if (providerName) {
      console.log(`   📡 Active embedding provider: ${providerName}`);
    }
    
    console.log('🗃️ Setting up vector store...');
    const vectorStore = createVectorStore(embeddingService, {
      host: process.env.CHROMA_HOST || 'localhost',
      port: parseInt(process.env.CHROMA_PORT || '8000'),
      collectionName: 'japanese-law-documents'
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
    
    console.log('\n🎯 Indexing Summary:');
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📄 Documents processed: ${statsAfter.totalDocuments}`);
    console.log(`💾 Total embeddings: ${statsAfter.totalEmbeddings}`);
    console.log(`📈 New embeddings: ${statsAfter.totalEmbeddings - statsBefore.totalEmbeddings}`);
    
    // Show cost summary
    const costSummary = aiServiceFactory.getCostSummary();
    if (costSummary.total > 0) {
      console.log(`💰 Total API cost: $${costSummary.total.toFixed(4)}`);
      console.log('💳 Cost by provider:');
      for (const [provider, cost] of Object.entries(costSummary.byProvider)) {
        if (cost > 0) {
          console.log(`   ${provider}: $${cost.toFixed(4)}`);
        }
      }
    }
    
    // Clean up
    aiServiceFactory.dispose();
    
  } catch (error) {
    console.error('❌ Indexing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}