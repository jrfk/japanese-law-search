import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentParser } from '../services/document-parser';
import { VectorStore } from '../types';
import glob from 'glob';

export class DocumentIndexer {
  constructor(
    private vectorStore: VectorStore,
    private documentParser: DocumentParser,
    private documentsPath: string
  ) {}

  async indexAllDocuments(): Promise<void> {
    console.log(`📚 Starting document indexing from: ${this.documentsPath}`);
    
    try {
      const markdownFiles = await this.findMarkdownFiles();
      console.log(`📄 Found ${markdownFiles.length} markdown files`);
      
      let processed = 0;
      const batchSize = 5; // Reduced batch size for large documents
      
      for (let i = 0; i < markdownFiles.length; i += batchSize) {
        const batch = markdownFiles.slice(i, i + batchSize);
        await this.processBatch(batch);
        processed += batch.length;
        
        const percentage = ((processed / markdownFiles.length) * 100).toFixed(1);
        console.log(`✅ Processed ${processed}/${markdownFiles.length} documents (${percentage}%)`);
      }
      
      const totalCount = await this.vectorStore.getEmbeddingCount();
      console.log(`🎉 Indexing completed! Total embeddings in store: ${totalCount}`);
      
    } catch (error) {
      console.error('❌ Indexing failed:', error);
      throw error;
    }
  }

  private async findMarkdownFiles(): Promise<string[]> {
    const pattern = path.join(this.documentsPath, '**/*.md');
    return new Promise((resolve, reject) => {
      glob(pattern, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files.sort());
        }
      });
    });
  }

  private async processBatch(filePaths: string[]): Promise<void> {
    const promises = filePaths.map(async (filePath) => {
      try {
        return await this.processDocument(filePath);
      } catch (error) {
        console.warn(`⚠️  Failed to process ${filePath}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const allChunks = results
      .filter(chunks => chunks !== null)
      .flat();

    if (allChunks.length > 0) {
      await this.vectorStore.addEmbeddings(allChunks);
    }
  }

  private async processDocument(filePath: string) {
    const document = await this.documentParser.parseMarkdownFile(filePath);
    
    // Use smaller chunk sizes for better performance and to avoid payload limits
    const chunkSize = parseInt(process.env.CHUNK_SIZE || '500');
    const overlap = parseInt(process.env.CHUNK_OVERLAP || '100');
    
    const chunks = this.documentParser.createChunks(document, chunkSize, overlap);
    
    return chunks;
  }

  async indexIncrementalChanges(changedFiles: string[]): Promise<void> {
    console.log(`🔄 Processing ${changedFiles.length} changed files`);
    
    for (const filePath of changedFiles) {
      try {
        const chunks = await this.processDocument(filePath);
        
        const existingChunkIds = chunks.map(chunk => `${filePath}:${chunk.chunkIndex}`);
        await this.vectorStore.deleteEmbeddings(existingChunkIds);
        
        await this.vectorStore.addEmbeddings(chunks);
        
        console.log(`✅ Updated: ${path.basename(filePath)}`);
      } catch (error) {
        console.warn(`⚠️  Failed to update ${filePath}:`, error);
      }
    }
  }

  async getIndexingStats(): Promise<{
    totalDocuments: number;
    totalEmbeddings: number;
    lastIndexed?: Date;
  }> {
    const totalEmbeddings = await this.vectorStore.getEmbeddingCount();
    const markdownFiles = await this.findMarkdownFiles();
    
    return {
      totalDocuments: markdownFiles.length,
      totalEmbeddings,
      lastIndexed: new Date()
    };
  }
}

export const createDocumentIndexer = (
  vectorStore: VectorStore,
  documentsPath: string = './markdown'
) => {
  const documentParser = new DocumentParser();
  return new DocumentIndexer(vectorStore, documentParser, documentsPath);
};