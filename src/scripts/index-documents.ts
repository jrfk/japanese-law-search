#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { createDocumentIndexer } from '../utils/document-indexer';
import { createVectorStore } from '../services/vector-store';
import { createEmbeddingService } from '../services/embedding-service';

config();

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  const documentsPath = process.env.DOCUMENTS_PATH || './markdown';
  
  console.log('🚀 Initializing services...');
  
  try {
    const embeddingService = createEmbeddingService(apiKey, process.env.EMBEDDING_MODEL);
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
    
  } catch (error) {
    console.error('❌ Indexing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}