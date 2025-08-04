import Joi from 'joi';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface WikiConfig {
  wikiUrls: string[];
  cacheTimeoutMinutes?: number;
  auth?: WikiAuthConfig[];
  ai?: AIConfig;
  performance?: PerformanceConfig;
}

export interface WikiAuthConfig {
  urlPattern: string;
  type: 'basic' | 'token' | 'oauth' | 'custom';
  username?: string;
  password?: string;
  token?: string;
  headerName?: string;
  headerValue?: string;
  oauthConfig?: {
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
  };
}

export interface AIConfig {
  enabled: boolean;
  primaryProvider: string;
  minimumRelevanceScore?: number;
  contentChunkSize?: number;
  embeddingCacheTimeMinutes?: number;
  providers: {
    [key: string]: {
      type: string;
      enabled: boolean;
      [key: string]: any;
    };
  };
}

export interface PerformanceConfig {
  cache?: {
    maxSize: number;
    ttl: number;
    maxItems: number;
    enablePersistence?: boolean;
  };
  indexing?: {
    enabled: boolean;
    rebuildInterval: number;
    backgroundSync?: boolean;
  };
  batch?: {
    batchSize: number;
    concurrency: number;
    maxRetries: number;
  };
  pool?: {
    maxConnections: number;
    acquireTimeout: number;
    idleTimeout: number;
  };
}

const authConfigSchema = Joi.object({
  urlPattern: Joi.string().required(),
  type: Joi.string().valid('basic', 'token', 'oauth', 'custom').required(),
  username: Joi.string().when('type', { is: 'basic', then: Joi.required() }),
  password: Joi.string().when('type', { is: 'basic', then: Joi.required() }),
  token: Joi.string().when('type', { is: 'token', then: Joi.required() }),
  headerName: Joi.string().when('type', { is: 'custom', then: Joi.required() }),
  headerValue: Joi.string().when('type', { is: 'custom', then: Joi.required() }),
  oauthConfig: Joi.object({
    clientId: Joi.string().required(),
    clientSecret: Joi.string().required(),
    tokenUrl: Joi.string().uri().required()
  }).when('type', { is: 'oauth', then: Joi.required() })
});

const aiProviderSchema = Joi.object({
  type: Joi.string().required(),
  enabled: Joi.boolean().required()
}).unknown(true);

const configSchema = Joi.object({
  wikiUrls: Joi.array()
    .items(Joi.string().uri({ scheme: ['http', 'https'] }))
    .min(1)
    .required(),
  cacheTimeoutMinutes: Joi.number().min(1).max(1440).default(30),
  auth: Joi.array().items(authConfigSchema).optional(),
  ai: Joi.object({
    enabled: Joi.boolean().required(),
    primaryProvider: Joi.string().required(),
    minimumRelevanceScore: Joi.number().min(0).max(1).default(0.3),
    contentChunkSize: Joi.number().min(100).max(10000).default(2000),
    embeddingCacheTimeMinutes: Joi.number().min(1).max(1440).default(60),
    providers: Joi.object().pattern(
      Joi.string(),
      aiProviderSchema
    ).required()
  }).optional(),
  performance: Joi.object({
    cache: Joi.object({
      maxSize: Joi.number().min(10).max(10000).default(500),
      ttl: Joi.number().min(60000).max(86400000).default(1800000), // 30 minutes
      maxItems: Joi.number().min(100).max(100000).default(10000),
      enablePersistence: Joi.boolean().default(false)
    }).optional(),
    indexing: Joi.object({
      enabled: Joi.boolean().default(true),
      rebuildInterval: Joi.number().min(60000).max(3600000).default(300000), // 5 minutes
      backgroundSync: Joi.boolean().default(true)
    }).optional(),
    batch: Joi.object({
      batchSize: Joi.number().min(1).max(100).default(20),
      concurrency: Joi.number().min(1).max(50).default(10),
      maxRetries: Joi.number().min(0).max(10).default(3)
    }).optional(),
    pool: Joi.object({
      maxConnections: Joi.number().min(1).max(200).default(50),
      acquireTimeout: Joi.number().min(1000).max(60000).default(10000),
      idleTimeout: Joi.number().min(1000).max(300000).default(60000)
    }).optional()
  }).optional()
});

export class ConfigManager {
  private static instance: ConfigManager;
  private config: WikiConfig | null = null;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get secure configuration file paths
   */
  private getConfigPaths(): string[] {
    const basePaths = [
      process.env.MCP_CONFIG_PATH,
      path.join(process.cwd(), 'mcp.config.json'),
      path.join(os.homedir(), '.config', 'mcp-internal-wiki', 'config.json'),
      path.join(__dirname, '..', '..', 'mcp.config.json')
    ].filter(Boolean);

    // Normalize and validate paths to prevent path traversal
    return basePaths
      .map(p => path.normalize(p!))
      .filter(p => {
        // Basic path traversal protection
        const resolved = path.resolve(p);
        return resolved === p || p.startsWith(process.cwd()) || p.startsWith(os.homedir());
      });
  }

  /**
   * Load and validate configuration
   */
  async loadConfig(): Promise<WikiConfig> {
    if (this.config) {
      return this.config;
    }

    const configPaths = this.getConfigPaths();
    let rawConfig: any = null;
    let configPath = '';

    // Try each config path
    for (const testPath of configPaths) {
      try {
        if (fs.existsSync(testPath)) {
          configPath = testPath;
          const configContent = fs.readFileSync(testPath, 'utf8');
          rawConfig = JSON.parse(configContent);
          console.error(`[CONFIG] Loaded config from: ${configPath}`);
          break;
        }
      } catch (error) {
        console.error(`[CONFIG] Error reading config from ${testPath}:`, error);
        continue;
      }
    }

    if (!rawConfig) {
      throw new Error(`Configuration file not found. Searched paths: ${configPaths.join(', ')}`);
    }

    // Validate configuration
    const { error, value } = configSchema.validate(rawConfig, {
      stripUnknown: true,
      abortEarly: false
    });

    if (error) {
      const errorDetails = error.details.map(d => `${d.path.join('.')}: ${d.message}`).join('\n');
      throw new Error(`Configuration validation failed:\n${errorDetails}`);
    }

    this.config = value as WikiConfig;
    console.error(`[CONFIG] Configuration validated successfully`);
    
    return this.config;
  }

  /**
   * Get current configuration (throws if not loaded)
   */
  getConfig(): WikiConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Reload configuration
   */
  async reloadConfig(): Promise<WikiConfig> {
    this.config = null;
    return this.loadConfig();
  }

  /**
   * Validate a configuration object without loading from file
   */
  static validateConfig(config: any): { isValid: boolean; errors?: string[]; validatedConfig?: WikiConfig } {
    const { error, value } = configSchema.validate(config, {
      stripUnknown: true,
      abortEarly: false
    });

    if (error) {
      return {
        isValid: false,
        errors: error.details.map(d => `${d.path.join('.')}: ${d.message}`)
      };
    }

    return {
      isValid: true,
      validatedConfig: value as WikiConfig
    };
  }
}