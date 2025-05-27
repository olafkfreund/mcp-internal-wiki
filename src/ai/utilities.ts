/**
 * Calculate cosine similarity between two vectors
 * Returns a value from -1 to 1, where 1 means identical vectors
 * 
 * @param vec1 First vector
 * @param vec2 Second vector
 * @returns Cosine similarity score
 */
export function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }
  
  // Calculate dot product
  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  
  // Calculate magnitudes
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  
  // Avoid division by zero
  if (mag1 === 0 || mag2 === 0) return 0;
  
  // Calculate cosine similarity
  return dotProduct / (mag1 * mag2);
}

/**
 * Split content into smaller chunks for more accurate relevance scoring
 * @param content Original text content
 * @param maxChunkSize Maximum chunk size in characters
 * @returns Array of content chunks
 */
export function chunkContent(content: string, maxChunkSize: number = 1000): string[] {
  if (content.length <= maxChunkSize) {
    return [content];
  }
  
  const chunks: string[] = [];
  let remainingContent = content;
  
  while (remainingContent.length > 0) {
    // Find a good break point (paragraph or sentence)
    let breakPoint = Math.min(maxChunkSize, remainingContent.length);
    
    if (breakPoint < remainingContent.length) {
      // Try to break at paragraph
      const paragraphBreak = remainingContent.lastIndexOf('\n\n', breakPoint);
      if (paragraphBreak > maxChunkSize / 2) {
        breakPoint = paragraphBreak + 2;
      } else {
        // Try to break at sentence
        const sentenceBreak = remainingContent.lastIndexOf('. ', breakPoint);
        if (sentenceBreak > maxChunkSize / 2) {
          breakPoint = sentenceBreak + 2;
        }
      }
    }
    
    chunks.push(remainingContent.substring(0, breakPoint).trim());
    remainingContent = remainingContent.substring(breakPoint).trim();
  }
  
  return chunks;
}
