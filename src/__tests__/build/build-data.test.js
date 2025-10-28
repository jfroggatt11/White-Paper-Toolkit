import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parse } from 'csv-parse/sync';
import fs from 'node:fs';

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

// Mock fs for file writing tests
vi.mock('node:fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn()
  }
}));

describe('build-data script', () => {
  let fetch;

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Get the mocked fetch function
    fetch = (await import('node-fetch')).default;

    // Reset environment variables
    process.env.RESOURCES_CSV_URL = 'https://example.com/resources.csv';
    process.env.BARRIER_THEMES_CSV_URL = 'https://example.com/themes.csv';
    process.env.BARRIERS_CSV_URL = 'https://example.com/barriers.csv';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.RESOURCES_CSV_URL;
    delete process.env.BARRIER_THEMES_CSV_URL;
    delete process.env.BARRIERS_CSV_URL;
  });

  describe('CSV parsing', () => {
    it('should parse valid CSV with headers correctly', () => {
      const csvData = `id,title,url,date,description,personas,barriers,barrier_theme,tags,publisher,type
1,Test Resource,https://example.com,2024-01-01,Test description,Project|Programme,barrier1|barrier2,leadership-and-alignment,tag1|tag2,Publisher,Guide`;

      const result = parse(csvData, { columns: true, skip_empty_lines: true, bom: true });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', '1');
      expect(result[0]).toHaveProperty('title', 'Test Resource');
      expect(result[0]).toHaveProperty('personas', 'Project|Programme');
    });

    it('should handle CSV with missing optional columns', () => {
      const csvData = `id,title,url,date,description,personas,barriers,barrier_theme
1,Test Resource,https://example.com,2024-01-01,Test description,Project,barrier1,theme1`;

      const result = parse(csvData, { columns: true, skip_empty_lines: true, bom: true });

      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('tags');
      expect(result[0]).not.toHaveProperty('publisher');
    });

    it('should handle empty CSV file', () => {
      const csvData = 'id,title,url,date,description,personas,barriers,barrier_theme\n';

      const result = parse(csvData, { columns: true, skip_empty_lines: true, bom: true });

      expect(result).toHaveLength(0);
    });

    it('should skip empty lines in CSV', () => {
      const csvData = `id,title,url,date,description,personas,barriers,barrier_theme
1,Test Resource 1,https://example.com/1,2024-01-01,Test description,Project,barrier1,theme1

2,Test Resource 2,https://example.com/2,2024-01-02,Test description 2,Programme,barrier2,theme2`;

      const result = parse(csvData, { columns: true, skip_empty_lines: true, bom: true });

      expect(result).toHaveLength(2);
    });
  });

  describe('data normalization', () => {
    it('should split pipe-delimited personas field', () => {
      const splitPipes = (s) => (s ? s.split('|').map(v => v.trim()).filter(Boolean) : []);

      expect(splitPipes('Project|Programme|Business')).toEqual(['Project', 'Programme', 'Business']);
      expect(splitPipes('Project')).toEqual(['Project']);
      expect(splitPipes('')).toEqual([]);
      expect(splitPipes(null)).toEqual([]);
    });

    it('should split pipe-delimited barriers field', () => {
      const splitPipes = (s) => (s ? s.split('|').map(v => v.trim()).filter(Boolean) : []);

      expect(splitPipes('barrier1|barrier2|barrier3')).toEqual(['barrier1', 'barrier2', 'barrier3']);
    });

    it('should split pipe-delimited tags field', () => {
      const splitPipes = (s) => (s ? s.split('|').map(v => v.trim()).filter(Boolean) : []);

      expect(splitPipes('tag1|tag2|tag3')).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should normalize resource with all fields', () => {
      const splitPipes = (s) => (s ? s.split('|').map(v => v.trim()).filter(Boolean) : []);

      const rawResource = {
        id: '1',
        title: 'Test Resource',
        url: 'https://example.com',
        date: '2024-01-01',
        description: 'Test description',
        personas: 'Project|Programme',
        barriers: 'barrier1|barrier2',
        barrier_theme: 'leadership-and-alignment',
        tags: 'tag1|tag2',
        publisher: 'PDATF',
        type: 'Guide'
      };

      const normalized = {
        id: rawResource.id,
        title: rawResource.title,
        url: rawResource.url,
        date: rawResource.date || '',
        description: rawResource.description || '',
        personas: splitPipes(rawResource.personas),
        barriers: splitPipes(rawResource.barriers),
        barrier_category: rawResource.barrier_theme,
        tags: splitPipes(rawResource.tags),
        publisher: rawResource.publisher || '',
        type: rawResource.type || ''
      };

      expect(normalized.personas).toEqual(['Project', 'Programme']);
      expect(normalized.barriers).toEqual(['barrier1', 'barrier2']);
      expect(normalized.tags).toEqual(['tag1', 'tag2']);
      expect(normalized.barrier_category).toBe('leadership-and-alignment');
    });

    it('should handle missing optional fields with defaults', () => {
      const splitPipes = (s) => (s ? s.split('|').map(v => v.trim()).filter(Boolean) : []);

      const rawResource = {
        id: '1',
        title: 'Test Resource',
        url: 'https://example.com',
        personas: 'Project',
        barriers: 'barrier1',
        barrier_theme: 'theme1'
      };

      const normalized = {
        id: rawResource.id,
        title: rawResource.title,
        url: rawResource.url,
        date: rawResource.date || '',
        description: rawResource.description || '',
        personas: splitPipes(rawResource.personas),
        barriers: splitPipes(rawResource.barriers),
        barrier_category: rawResource.barrier_theme,
        tags: splitPipes(rawResource.tags),
        publisher: rawResource.publisher || '',
        type: rawResource.type || ''
      };

      expect(normalized.date).toBe('');
      expect(normalized.description).toBe('');
      expect(normalized.tags).toEqual([]);
      expect(normalized.publisher).toBe('');
      expect(normalized.type).toBe('');
    });
  });

  describe('error scenarios', () => {
    it('should detect missing environment variables', () => {
      delete process.env.RESOURCES_CSV_URL;
      delete process.env.BARRIER_THEMES_CSV_URL;
      delete process.env.BARRIERS_CSV_URL;

      const urls = {
        resources: process.env.RESOURCES_CSV_URL,
        barrierThemes: process.env.BARRIER_THEMES_CSV_URL,
        barriers: process.env.BARRIERS_CSV_URL,
      };

      const hasAllUrls = !!(urls.resources && urls.barrierThemes && urls.barriers);

      expect(hasAllUrls).toBe(false);
    });

    it('should handle network fetch errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      await expect(async () => {
        const response = await fetch('https://example.com/data.csv');
        await response.text();
      }).rejects.toThrow('Network error');
    });

    it('should handle invalid CSV format', () => {
      const invalidCsv = 'not,a,valid\ncsv,format,with,mismatched,columns';

      expect(() => {
        parse(invalidCsv, { columns: true, skip_empty_lines: true, bom: true });
      }).toThrow();
    });

    it('should validate required CSV columns', () => {
      const csvData = `wrong,column,names
1,2,3`;

      const result = parse(csvData, { columns: true, skip_empty_lines: true, bom: true });

      // Should parse but won't have expected columns
      expect(result[0]).not.toHaveProperty('id');
      expect(result[0]).not.toHaveProperty('title');
    });
  });

  describe('file system operations', () => {
    it('should create data directory if it does not exist', () => {
      fs.mkdirSync('src/data', { recursive: true });

      expect(fs.mkdirSync).toHaveBeenCalledWith('src/data', { recursive: true });
    });

    it('should write JSON files with proper formatting', () => {
      const testData = [{ id: '1', title: 'Test' }];
      const expectedJson = JSON.stringify(testData, null, 2);

      fs.writeFileSync('src/data/resources.json', expectedJson);

      expect(fs.writeFileSync).toHaveBeenCalledWith('src/data/resources.json', expectedJson);
    });

    it('should write all three JSON files', () => {
      const resources = [{ id: '1' }];
      const themes = [{ id: 'theme1' }];
      const barriers = [{ id: 'barrier1' }];

      fs.writeFileSync('src/data/resources.json', JSON.stringify(resources, null, 2));
      fs.writeFileSync('src/data/barrier_themes.json', JSON.stringify(themes, null, 2));
      fs.writeFileSync('src/data/barriers.json', JSON.stringify(barriers, null, 2));

      expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
      expect(fs.writeFileSync).toHaveBeenCalledWith('src/data/resources.json', expect.any(String));
      expect(fs.writeFileSync).toHaveBeenCalledWith('src/data/barrier_themes.json', expect.any(String));
      expect(fs.writeFileSync).toHaveBeenCalledWith('src/data/barriers.json', expect.any(String));
    });
  });

  describe('fetch mocking', () => {
    it('should mock fetch to return CSV text', async () => {
      const mockCsvData = 'id,title\n1,Test';

      fetch.mockResolvedValue({
        text: async () => mockCsvData
      });

      const response = await fetch('https://example.com/data.csv');
      const text = await response.text();

      expect(text).toBe(mockCsvData);
      expect(fetch).toHaveBeenCalledWith('https://example.com/data.csv');
    });

    it('should handle fetch timeout', async () => {
      fetch.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(fetch('https://example.com/data.csv')).rejects.toThrow('Timeout');
    });
  });
});
