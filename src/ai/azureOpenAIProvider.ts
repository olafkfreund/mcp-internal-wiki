import axios from 'axios';
import { AIProvider, AzureOpenAIConfig } from './aiProvider';
import { calculateCosineSimilarity } from './utilities';

// Latest Azure OpenAI API version as of 2025
const AZURE_OPENAI_API_VERSION = '2024-02-01';

/**
 * Azure OpenAI implementation of AIProvider
 */
export class AzureOpenAIProvider implements AIProvider {
  private config: AzureOpenAIConfig;
  private embeddingCache: Map<string, { vector: number[], timestamp: number }> = new Map();
  private cacheTimeMs: number = 30 * 60 * 1000; // Default: 30 minutes
  private maxCacheEntries: number = 1000; // Limit cache size

  constructor(config: AzureOpenAIConfig, cacheTimeMinutes?: number) {
    this.config = config;
    
    if (cacheTimeMinutes) {
      this.cacheTimeMs = cacheTimeMinutes * 60 * 1000;
    }
  }

  /**
   * Generate embedding vector using Azure OpenAI API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Validate required configuration
    if (!this.config.endpoint || !this.config.embeddingDeployment) {
      throw new Error('Azure OpenAI endpoint and embeddingDeployment are required');
    }
    
    const cacheKey = `azure-${text.substring(0, 100)}`;
    const cached = this.embeddingCache.get(cacheKey);
    
    // Return cached embedding if valid
    if (cached && (Date.now() - cached.timestamp < this.cacheTimeMs)) {
      return cached.vector;
    }
    
    try {
      // Azure OpenAI requires a specific endpoint format
      const response = await axios.post(
        `${this.config.endpoint}/openai/deployments/${this.config.embeddingDeployment}/embeddings?api-version=${AZURE_OPENAI_API_VERSION}`,
        {
          input: text
        },
        {
          headers: {
            'api-key': this.config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const vector = response.data.data[0].embedding;
      
      // Cache the result
      this.embeddingCache.set(cacheKey, {
        vector,
        timestamp: Date.now()
      });
      
      // Manage cache size by removing oldest entries when needed
      if (this.embeddingCache.size > this.maxCacheEntries) {
        const oldest = [...this.embeddingCache.entries()]
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
        this.embeddingCache.delete(oldest);
      }
      
      return vector;
    } catch (error) {
      console.error('Error generating Azure OpenAI embedding:', error);
      throw error;
    }
  }

  /**
   * Calculate relevance score using embeddings and cosine similarity
   */
  async calculateRelevance(queryText: string, contentText: string): Promise<number> {
    try {
      const queryEmbedding = await this.generateEmbedding(queryText);
      const contentEmbedding = await this.generateEmbedding(contentText);
      
      return calculateCosineSimilarity(queryEmbedding, contentEmbedding);
    } catch (error) {
      console.error('Error calculating relevance with Azure OpenAI:', error);
      return 0; // Return minimum score on error
    }
  }

  /**
   * Summarize content using Azure OpenAI API
   */
  async summarizeContent(content: string, maxLength: number = 200): Promise<string> {
    // Validate required configuration
    if (!this.config.summaryDeployment || !this.config.endpoint) {
      // If no summary model is configured, return truncated content
      return content.length > maxLength
        ? content.substring(0, maxLength - 3) + '...'
        : content;
    }
    
    try {
      const response = await axios.post(
        `${this.config.endpoint}/openai/deployments/${this.config.summaryDeployment}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`,
        {
          messages: [
            {
              role: 'system',
              content: `Summarize the following text in no more than ${maxLength} characters. Focus on key information only.`
            },
            {
              role: 'user',
              content: content
            }
          ],
          max_tokens: Math.floor(maxLength / 4),
          temperature: 0.3
        },
        {
          headers: {
            'api-key': this.config.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error summarizing content with Azure OpenAI:', error);
      // In case of error, return truncated original content
      return content.length > maxLength
        ? content.substring(0, maxLength - 3) + '...'
        : content;
    }
  }
}
