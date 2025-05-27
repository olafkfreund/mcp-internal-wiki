import { AIProvider } from './aiProvider';

/**
 * Mock implementation of AIProvider for testing without real AI APIs
 */
export class MockProvider implements AIProvider {
  /**
   * Generate a mock embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Generate a deterministic pseudo-random vector based on text content
    const vector: number[] = [];
    const seed = this.hashString(text);
    
    // Generate a 384-dimensional vector (common embedding size)
    for (let i = 0; i < 384; i++) {
      // Generate a value between -1 and 1
      const val = (Math.sin(seed * i) + 1) / 2;
      vector.push(val);
    }
    
    return vector;
  }

  /**
   * Calculate mock relevance based on text similarity
   */
  async calculateRelevance(queryText: string, contentText: string): Promise<number> {
    // Simple implementation that checks for query terms in content
    const queryTerms = queryText.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    const contentLower = contentText.toLowerCase();
    
    if (queryTerms.length === 0) return 0.5; // Default relevance
    
    // Count how many query terms appear in the content
    const matchingTerms = queryTerms.filter(term => contentLower.includes(term));
    
    // Calculate relevance score based on matches
    return matchingTerms.length / queryTerms.length;
  }

  /**
   * Generate a simple summary by extracting key sentences
   */
  async summarizeContent(content: string, maxLength: number = 200): Promise<string> {
    if (content.length <= maxLength) {
      return content;
    }
    
    // Split into sentences
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    
    // If no complete sentences, just truncate
    if (sentences.length === 0) {
      return content.substring(0, maxLength - 3) + '...';
    }
    
    // Take first few sentences that fit within maxLength
    let summary = '';
    for (const sentence of sentences) {
      if ((summary + sentence).length <= maxLength) {
        summary += sentence;
      } else {
        break;
      }
    }
    
    return summary;
  }

  /**
   * Simple hash function for strings
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}