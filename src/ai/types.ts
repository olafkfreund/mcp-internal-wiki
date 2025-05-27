/**
 * AI-enhanced wiki content with relevance scores and summaries
 */
export interface AIEnhancedWikiContent {
  title: string;
  content: string;
  url?: string;
  source: string;
  type?: string;
  relevanceScore?: number;
  summary?: string;
}
