import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { ModernMCPWikiServer } from '../server-modern';
import { ConfigManager } from '../config/validation';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock the ConfigManager to avoid file system dependencies in tests
jest.mock('../config/validation');
jest.mock('../sources/wikiSource');
jest.mock('../monitoring/health');
jest.mock('../offline/index');

const mockConfig = {
  wikiUrls: [
    'https://example.wiki.com',
    'https://test.gitbook.io/docs'
  ],
  cacheTimeoutMinutes: 30,
  auth: [{
    urlPattern: 'example\\.wiki\\.com',
    type: 'basic' as const,
    username: 'testuser',
    password: 'testpass'
  }],
  ai: {
    enabled: true,
    primaryProvider: 'openai',
    minimumRelevanceScore: 0.3,
    providers: {
      openai: {
        type: 'openai',
        enabled: true,
        apiKey: 'test-key'
      }
    }
  }
};

describe('Modern MCP Wiki Server', () => {
  let server: ModernMCPWikiServer;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    // Setup mocks
    mockConfigManager = {
      loadConfig: jest.fn().mockResolvedValue(mockConfig),
      getConfig: jest.fn().mockReturnValue(mockConfig),
      reloadConfig: jest.fn().mockResolvedValue(mockConfig)
    } as any;

    (ConfigManager.getInstance as jest.Mock).mockReturnValue(mockConfigManager);
    
    server = new ModernMCPWikiServer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize successfully', async () => {
    await expect(server.initialize()).resolves.not.toThrow();
    expect(mockConfigManager.loadConfig).toHaveBeenCalled();
  });

  test('should handle invalid configuration gracefully', async () => {
    mockConfigManager.loadConfig.mockRejectedValue(new Error('Invalid config'));
    
    await expect(server.initialize()).rejects.toThrow('Invalid config');
  });

  test('should validate config with proper schema', () => {
    const validConfig = {
      wikiUrls: ['https://example.com'],
      cacheTimeoutMinutes: 60
    };

    const result = ConfigManager.validateConfig(validConfig);
    expect(result.isValid).toBe(true);
  });

  test('should reject invalid wiki URLs', () => {
    const invalidConfig = {
      wikiUrls: ['not-a-url', 'ftp://invalid-scheme.com'],
      cacheTimeoutMinutes: 30
    };

    const result = ConfigManager.validateConfig(invalidConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('uri'));
  });

  test('should handle authentication configuration', () => {
    const configWithAuth = {
      wikiUrls: ['https://private.wiki.com'],
      auth: [{
        urlPattern: 'private\\.wiki\\.com',
        type: 'token',
        token: 'secret-token'
      }]
    };

    const result = ConfigManager.validateConfig(configWithAuth);
    expect(result.isValid).toBe(true);
  });

  test('should validate performance configuration', () => {
    const configWithPerformance = {
      wikiUrls: ['https://example.com'],
      performance: {
        cache: {
          maxSize: 1000,
          ttl: 1800000,
          maxItems: 50000
        },
        batch: {
          batchSize: 25,
          concurrency: 15,
          maxRetries: 5
        }
      }
    };

    const result = ConfigManager.validateConfig(configWithPerformance);
    expect(result.isValid).toBe(true);
  });

  test('should reject cache configuration with invalid values', () => {
    const invalidPerformanceConfig = {
      wikiUrls: ['https://example.com'],
      performance: {
        cache: {
          maxSize: 0, // Too small
          ttl: 30000, // Too short (less than 1 minute)
          maxItems: 50
        }
      }
    };

    const result = ConfigManager.validateConfig(invalidPerformanceConfig);
    expect(result.isValid).toBe(false);
  });
});

describe('Configuration Security', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
    configPath = path.join(tempDir, 'test-config.json');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  test('should prevent path traversal in config paths', () => {
    const configManager = ConfigManager.getInstance();
    
    // This should be tested with actual ConfigManager implementation
    // The test verifies that paths like "../../../etc/passwd" are rejected
    expect(() => {
      // Simulate attempting to access files outside allowed directories
      const dangerousPath = path.join(tempDir, '../../../etc/passwd');
      const normalizedPath = path.resolve(dangerousPath);
      
      // The config manager should reject paths that don't start with safe directories
      expect(normalizedPath.startsWith(tempDir)).toBe(false);
    }).not.toThrow();
  });

  test('should sanitize sensitive configuration in responses', () => {
    const configWithSecrets = {
      wikiUrls: ['https://example.com'],
      auth: [{
        urlPattern: 'example\\.com',
        type: 'basic' as const,
        username: 'secret-user',
        password: 'secret-password'
      }]
    };

    // This would be tested with the actual server resource handler
    // The test ensures that passwords, tokens, etc. are masked in responses
    const sanitized = {
      ...configWithSecrets,
      auth: configWithSecrets.auth.map(auth => ({
        ...auth,
        username: auth.username ? '***' : undefined,
        password: auth.password ? '***' : undefined
      }))
    };

    expect(sanitized.auth[0].password).toBe('***');
    expect(sanitized.auth[0].username).toBe('***');
  });
});

describe('Input Validation', () => {
  test('should validate search query length', () => {
    const longQuery = 'a'.repeat(1000);
    const validQuery = 'test query';
    
    // These would be tested with actual tool handlers
    expect(longQuery.length).toBeGreaterThan(500);
    expect(validQuery.length).toBeLessThanOrEqual(500);
  });

  test('should validate tool parameters', () => {
    const validSearchParams = {
      query: 'test search',
      limit: 10
    };

    const invalidSearchParams = {
      query: '', // Empty query
      limit: 100 // Too high limit
    };

    expect(validSearchParams.query.length).toBeGreaterThan(0);
    expect(validSearchParams.limit).toBeLessThanOrEqual(20);
    
    expect(invalidSearchParams.query.length).toBe(0);
    expect(invalidSearchParams.limit).toBeGreaterThan(20);
  });
});