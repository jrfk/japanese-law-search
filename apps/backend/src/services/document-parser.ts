import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { DocumentChunk, DocumentMetadata, DocumentRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class DocumentParser {
  
  async parseMarkdownFile(filePath: string): Promise<DocumentRecord> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      
      const parsed = matter(content);
      const frontMatter = parsed.data;
      const markdownContent = parsed.content;
      
      const fileName = path.basename(filePath);
      const metadata = this.extractMetadataFromPath(filePath, frontMatter);
      
      const title = this.extractTitle(markdownContent) || fileName;
      
      const document: DocumentRecord = {
        path: filePath,
        title,
        lastModified: stats.mtime,
        metadata: {
          ...metadata,
          fileName,
          filePath,
          lastModified: stats.mtime
        },
        chunkIds: [],
        fullContent: markdownContent
      };
      
      return document;
    } catch (error) {
      throw new Error(`Failed to parse document ${filePath}: ${error}`);
    }
  }
  
  private extractTitle(content: string): string | null {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        return trimmed.replace(/^#+\s*/, '').trim();
      }
      if (trimmed && !trimmed.startsWith('---')) {
        return trimmed;
      }
    }
    
    return null;
  }
  
  private extractMetadataFromPath(filePath: string, frontMatter: Record<string, unknown>): DocumentMetadata {
    const fileName = path.basename(filePath, '.md');
    const category = this.extractCategoryFromPath(filePath);
    
    const lawNumber = this.extractLawNumber(fileName);
    const date = this.extractDate(fileName);
    const era = this.extractEra(fileName);
    
    return {
      lawNumber,
      date,
      category,
      era,
      fileName,
      filePath,
      lastModified: new Date(),
      ...frontMatter
    };
  }
  
  private extractCategoryFromPath(filePath: string): string {
    const pathParts = filePath.split(path.sep);
    const markdownIndex = pathParts.findIndex(part => part === 'markdown');
    
    if (markdownIndex !== -1 && markdownIndex + 1 < pathParts.length) {
      return pathParts[markdownIndex + 1] || 'unknown';
    }
    
    return 'unknown';
  }
  
  private extractLawNumber(fileName: string): string | undefined {
    const patterns = [
      /^(\d{3}[A-Z]{2}\d{7})/,
      /^(\d{3}[A-Z]+\d+)/,
      /(\d{3}[A-Z]+)/
    ];
    
    for (const pattern of patterns) {
      const match = fileName.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return undefined;
  }
  
  private extractDate(fileName: string): Date | undefined {
    const datePattern = /(\d{8})/;
    const match = fileName.match(datePattern);
    
    if (match) {
      const dateStr = match[1];
      if (dateStr && dateStr !== '00000000') {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6));
        const day = parseInt(dateStr.substring(6, 8));
        
        if (year > 1800 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return new Date(year, month - 1, day);
        }
      }
    }
    
    return undefined;
  }
  
  private extractEra(fileName: string): string | undefined {
    if (fileName.includes('明治') || fileName.includes('MEIJI')) return '明治';
    if (fileName.includes('大正') || fileName.includes('TAISHO')) return '大正';
    if (fileName.includes('昭和') || fileName.includes('SHOWA')) return '昭和';
    if (fileName.includes('平成') || fileName.includes('HEISEI')) return '平成';
    if (fileName.includes('令和') || fileName.includes('REIWA')) return '令和';
    
    return undefined;
  }
  
  createChunks(document: DocumentRecord, chunkSize: number = 1000, overlap: number = 200): DocumentChunk[] {
    const content = document.fullContent;
    const chunks: DocumentChunk[] = [];
    
    if (content.length <= chunkSize) {
      const chunk: DocumentChunk = {
        id: uuidv4(),
        documentPath: document.path,
        title: document.title,
        content: content.trim(),
        metadata: document.metadata,
        chunkIndex: 0,
        startPosition: 0,
        endPosition: content.length
      };
      chunks.push(chunk);
      return chunks;
    }
    
    let startPos = 0;
    let chunkIndex = 0;
    
    while (startPos < content.length) {
      const endPos = Math.min(startPos + chunkSize, content.length);
      let actualEndPos = endPos;
      
      if (endPos < content.length) {
        const nextBreak = this.findBestBreakPoint(content, startPos, endPos);
        if (nextBreak > startPos) {
          actualEndPos = nextBreak;
        }
      }
      
      const chunkContent = content.substring(startPos, actualEndPos).trim();
      
      if (chunkContent.length > 0) {
        const chunk: DocumentChunk = {
          id: uuidv4(),
          documentPath: document.path,
          title: document.title,
          content: chunkContent,
          metadata: document.metadata,
          chunkIndex,
          startPosition: startPos,
          endPosition: actualEndPos
        };
        chunks.push(chunk);
        chunkIndex++;
      }
      
      startPos = Math.max(actualEndPos - overlap, startPos + 1);
      
      if (startPos >= actualEndPos) {
        break;
      }
    }
    
    return chunks;
  }
  
  private findBestBreakPoint(content: string, start: number, end: number): number {
    const searchArea = content.substring(start, end + 100);
    
    const patterns = [
      /\n\n/g,
      /。/g,
      /\n/g,
      /、/g,
      /\s/g
    ];
    
    for (const pattern of patterns) {
      let match;
      let lastMatch = -1;
      
      while ((match = pattern.exec(searchArea)) !== null) {
        const position = start + match.index;
        if (position <= end) {
          lastMatch = position + match[0].length;
        } else {
          break;
        }
      }
      
      if (lastMatch > start) {
        return lastMatch;
      }
    }
    
    return end;
  }
}

export const documentParser = new DocumentParser();