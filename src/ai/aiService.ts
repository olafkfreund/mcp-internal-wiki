import { AIProvider, AIConfig, ProviderConfig } from './aiProvider';
import { OpenAIProvider } from './openAIProvider';
import { GeminiProvider } from './geminiProvider';
import { AzureOpenAIProvider } from './azureOpenAIProvider';
import { MockProvider } from './mockProvider';

/**
 * AI Service for managing various AI providers
 */
export class AIService {
  private providers: Map<string, AIProvider> = new Map();
  private config: AIConfig;
  private primaryProvider: string;
  private minimumRelevanceScore: number = 0.5;
  private contentChunkSize: number = 1000;

  /**
   * Initialize AI service with configuration
   */
  constructor(config: AIConfig) {
    this.config = config;
    this.primaryProvider = config.primaryProvider;
    
    if (config.minimumRelevanceScore !== undefined) {
      this.minimumRelevanceScore = config.minimumRelevanceScore;
    }
    
    if (config.contentChunkSize !== undefined) {
      this.contentChunkSize = config.contentChunkSize;
    }
    
    // Initialize providers
    this.initializeProviders();
  }

  /**
   * Initialize available AI providers from config
   */
  private initializeProviders(): void {
    // Check environment variable override
    const enableAI = process.env.MCP_ENABLE_AI;
    if (enableAI === 'false') {
      console.log('AI features disabled via environment variable');
      return;
    }
    
    // Check for mock provider environment variable
    const useMockProvider = process.env.MCP_USE_MOCK_AI === 'true';
    if (useMockProvider) {
      console.log('Using mock AI provider for testing');
      this.providers.set('mock', new MockProvider());
      this.primaryProvider = 'mock';
      return;
    }

    // Only initialize if enabled
    if (!this.config.enabled) {
      console.log('AI features disabled in configuration');
      return;
    }
    
    const cacheTime = this.config.embeddingCacheTimeMinutes || 30;
    
    // Initialize each configured provider
    for (const [key, providerConfig] of Object.entries(this.config.providers)) {
      if (!providerConfig.enabled) continue;
      
      try {
        switch (providerConfig.type) {
          case 'openai':
            this.providers.set(key, new OpenAIProvider(providerConfig as any, cacheTime));
            break;
          case 'gemini':
            this.providers.set(key, new GeminiProvider(providerConfig as any, cacheTime));
            break;
          case 'azureopenai':
            this.providers.set(key, new AzureOpenAIProvider(providerConfig as any, cacheTime));
            break;
          // Add other provider types as they're implemented
          default:
            console.warn(`Unknown provider type: ${providerConfig.type}`);
        }
      } catch (error) {
        console.error(`Failed to initialize AI provider '${key}':`, error);
      }
    }

    // Make sure we have at least one provider
    if (this.providers.size === 0) {
      console.warn('No AI providers were successfully initialized');
    }
    
    // Check if primary provider was initialized
    if (!this.providers.has(this.primaryProvider)) {
      // Fall back to first available provider
      const firstProvider = this.providers.keys().next().value;
      if (firstProvider) {
        console.warn(`Primary provider '${this.primaryProvider}' not available, using '${firstProvider}' instead`);
        this.primaryProvider = firstProvider;
      }
    }
  }

  /**
   * Get the primary provider
   */
  public getPrimaryProvider(): AIProvider | undefined {
    return this.providers.get(this.primaryProvider);
  }

  /**
   * Get provider by name
   */
  public getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Check if AI features are available
   */
  public isAvailable(): boolean {
    return this.providers.size > 0;
  }

  /**
   * Get the minimum relevance score threshold
   */
  public getMinimumRelevanceScore(): number {
    return this.minimumRelevanceScore;
  }

  /**
   * Get the content chunk size
   */
  public getContentChunkSize(): number {
    return this.contentChunkSize;
  }
}
