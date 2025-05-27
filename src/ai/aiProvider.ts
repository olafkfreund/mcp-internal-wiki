/**
 * Base interface for AI model providers
 * Allows for multiple AI service integrations (OpenAI, Google Gemini, etc.)
 */
export interface AIProvider {
  /**
   * Generate an embedding vector for text
   * @param text Text to embed
   * @returns Promise with embedding vector
   */
  generateEmbedding(text: string): Promise<number[]>;
  
  /**
   * Calculate relevance score between query and content
   * @param queryText The user query
   * @param contentText The content to compare against
   * @returns Score from 0-1 with 1 being most relevant
   */
  calculateRelevance(queryText: string, contentText: string): Promise<number>;
  
  /**
   * Summarize content
   * @param content Text to summarize
   * @param maxLength Optional maximum length of summary
   * @returns Summarized text
   */
  summarizeContent(content: string, maxLength?: number): Promise<string>;
}

/**
 * Configuration options for AI providers
 */
export interface AIConfig {
  enabled: boolean;
  primaryProvider: string; // made required, not optional
  embeddingCacheTimeMinutes?: number;
  minimumRelevanceScore?: number;
  contentChunkSize?: number;
  providers: {
    [key: string]: ProviderConfig;
  };
}

/**
 * Base configuration for any provider
 */
export interface ProviderConfig {
  type: string;
  enabled: boolean;
  priority?: number;
  [key: string]: any;
}

/**
 * OpenAI provider configuration
 */
export interface OpenAIConfig extends ProviderConfig {
  type: 'openai';
  apiKey: string;
  embeddingModel?: string;
  summaryModel?: string;
}

/**
 * Google Gemini provider configuration
 */
export interface GeminiConfig extends ProviderConfig {
  type: 'gemini';
  apiKey: string;
  embeddingModel?: string;
  summaryModel?: string;
  projectId?: string;
}

/**
 * Azure OpenAI provider configuration
 */
export interface AzureOpenAIConfig extends ProviderConfig {
  type: 'azureopenai';
  apiKey: string;
  endpoint: string;
  embeddingDeployment: string;
  summaryDeployment?: string;
}

/**
 * Local model provider configuration
 */
export interface LocalModelConfig extends ProviderConfig {
  type: 'local';
  modelPath: string;
  embeddingDimension?: number;
}
