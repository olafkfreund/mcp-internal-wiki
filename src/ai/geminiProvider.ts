import axios from 'axios';
import { AIProvider, GeminiConfig } from './aiProvider';
import { calculateCosineSimilarity } from './utilities';

// Latest Gemini API version as of 2025
const GEMINI_API_VERSION = 'v1';

/**
 * Google Gemini implementation of AIProvider
 */
export class GeminiProvider implements AIProvider {
  private config: GeminiConfig;
  private embeddingCache: Map<string, { vector: number[], timestamp: number }> = new Map();
  private cacheTimeMs: number = 30 * 60 * 1000; // Default: 30 minutes
  private maxCacheEntries: number = 1000; // Limit cache size

  constructor(config: GeminiConfig, cacheTimeMinutes?: number) {
    this.config = config;
    
    if (cacheTimeMinutes) {
      this.cacheTimeMs = cacheTimeMinutes * 60 * 1000;
    }
  }

  /**
   * Generate embedding vector using Google Gemini API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Validate required configuration
    if (!this.config.apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    const cacheKey = `gemini-${text.substring(0, 100)}`;
    const cached = this.embeddingCache.get(cacheKey);
    
    // Return cached embedding if valid
    if (cached && (Date.now() - cached.timestamp < this.cacheTimeMs)) {
      return cached.vector;
    }
    
    try {
      const apiEndpoint = this.config.projectId 
        ? `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/projects/${this.config.projectId}/models/${this.config.embeddingModel || 'embedding-001'}:embedText`
        : `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${this.config.embeddingModel || 'embedding-001'}:embedText`;
        
      const response = await axios.post(
        apiEndpoint,
        {
          text: text
        },
        {
          params: {
            key: this.config.apiKey
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const vector = response.data.embedding.values;
      
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
      console.error('Error generating Gemini embedding:', error);
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
      console.error('Error calculating relevance with Gemini:', error);
      return 0; // Return minimum score on error
    }
  }

  /**
   * Summarize content using Gemini API
   */
  async summarizeContent(content: string, maxLength: number = 200): Promise<string> {
    // Validate required configuration
    if (!this.config.apiKey) {
      // Return truncated content if API key is missing
      return content.length > maxLength
        ? content.substring(0, maxLength - 3) + '...'
        : content;
    }
    
    try {
      const apiEndpoint = this.config.projectId 
        ? `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/projects/${this.config.projectId}/models/${this.config.summaryModel || 'gemini-2.5-pro'}:generateContent`
        : `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${this.config.summaryModel || 'gemini-2.5-pro'}:generateContent`;
        
      const response = await axios.post(
        apiEndpoint,
        {
          contents: [
            {
              parts: [
                {
                  text: `Summarize the following text concisely in no more than ${maxLength} characters: ${content}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: Math.floor(maxLength / 4),
          }
        },
        {
          params: {
            key: this.config.apiKey
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error summarizing content with Gemini:', error);
      // In case of error, return truncated original content
      return content.length > maxLength
        ? content.substring(0, maxLength - 3) + '...'
        : content;
    }
  }
}
