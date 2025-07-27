import { DocumentParser } from '../services/document-parser';
import * as fs from 'fs/promises';
import * as path from 'path';

jest.mock('fs/promises');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('DocumentParser', () => {
  let parser: DocumentParser;

  beforeEach(() => {
    parser = new DocumentParser();
    jest.resetAllMocks();
  });

  describe('parseMarkdownFile', () => {
    it('should parse a basic markdown file', async () => {
      const testContent = `# Test Document

This is a test document content.

## Section 1

Some content here.`;

      const mockStats = { mtime: new Date('2023-01-01') };
      
      mockFs.readFile.mockResolvedValue(testContent);
      mockFs.stat.mockResolvedValue(mockStats as any);

      const result = await parser.parseMarkdownFile('/test/path/test.md');

      expect(result.title).toBe('Test Document');
      expect(result.fullContent).toBe(testContent);
      expect(result.metadata.fileName).toBe('test.md');
      expect(result.path).toBe('/test/path/test.md');
    });

    it('should extract law number from filename', async () => {
      const testContent = '# Test Law';
      const mockStats = { mtime: new Date('2023-01-01') };
      
      mockFs.readFile.mockResolvedValue(testContent);
      mockFs.stat.mockResolvedValue(mockStats as any);

      const result = await parser.parseMarkdownFile('/test/321AC0000000001_19470503_000000000000000.md');

      expect(result.metadata.lawNumber).toBe('321AC0000000001');
    });

    it('should extract date from filename', async () => {
      const testContent = '# Test Law';
      const mockStats = { mtime: new Date('2023-01-01') };
      
      mockFs.readFile.mockResolvedValue(testContent);
      mockFs.stat.mockResolvedValue(mockStats as any);

      const result = await parser.parseMarkdownFile('/test/law_19470503_test.md');

      expect(result.metadata.date).toEqual(new Date(1947, 4, 3));
    });
  });

  describe('createChunks', () => {
    it('should create single chunk for short content', () => {
      const document = {
        path: '/test/path',
        title: 'Test',
        lastModified: new Date(),
        metadata: {
          category: 'test',
          fileName: 'test.md',
          filePath: '/test/path',
          lastModified: new Date()
        },
        chunkIds: [],
        fullContent: 'Short content'
      };

      const chunks = parser.createChunks(document, 1000, 200);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]?.content).toBe('Short content');
      expect(chunks[0]?.chunkIndex).toBe(0);
    });

    it('should create multiple chunks for long content', () => {
      const longContent = 'A'.repeat(2500);
      const document = {
        path: '/test/path',
        title: 'Test',
        lastModified: new Date(),
        metadata: {
          category: 'test',
          fileName: 'test.md',
          filePath: '/test/path',
          lastModified: new Date()
        },
        chunkIds: [],
        fullContent: longContent
      };

      const chunks = parser.createChunks(document, 1000, 200);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]?.chunkIndex).toBe(0);
      expect(chunks[1]?.chunkIndex).toBe(1);
    });
  });
});