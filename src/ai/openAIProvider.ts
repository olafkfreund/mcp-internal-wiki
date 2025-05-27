import axios from 'axios';
import { AIProvider, OpenAIConfig } from './aiProvider';
import { calculateCosineSimilarity } from './utilities';

/**
 * OpenAI implementation of AIProvider
 */
export class OpenAIProvider implements AIProvider {
  private config: OpenAIConfig;
  private embeddingCache: Map<string, { vector: number[], timestamp: number }> = new Map();
  private cacheTimeMs: number = 30 * 60 * 1000; // Default: 30 minutes
  private maxCacheEntries: number = 1000; // Limit cache size

  constructor(config: OpenAIConfig, cacheTimeMinutes?: number) {
    this.config = config;
    
    if (cacheTimeMinutes) {
      this.cacheTimeMs = cacheTimeMinutes * 60 * 1000;
    }
  }

  /**
   * Generate embedding vector using OpenAI API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = `openai-${text.substring(0, 100)}`;
    const cached = this.embeddingCache.get(cacheKey);
    
    // Return cached embedding if valid
    if (cached && (Date.now() - cached.timestamp < this.cacheTimeMs)) {
      return cached.vector;
    }
    
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: text,
          model: this.config.embeddingModel || 'text-embedding-3-small'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
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
      console.error('Error generating OpenAI embedding:', error);
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
      console.error('Error calculating relevance with OpenAI:', error);
      return 0; // Return minimum score on error
    }
  }

  /**
   * Summarize content using OpenAI API
   */
  async summarizeContent(content: string, maxLength: number = 200): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.config.summaryModel || 'gpt-4o',
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
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error summarizing content with OpenAI:', error);
      // In case of error, return truncated original content
      return content.length > maxLength
        ? content.substring(0, maxLength - 3) + '...'
        : content;
    }
  }
}
