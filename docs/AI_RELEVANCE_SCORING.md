# AI-Assisted Relevance Scoring

This document describes how to use the AI-assisted relevance scoring feature in the MCP Internal Wiki Server.

## Overview

AI-assisted relevance scoring improves search results by using AI models to score content based on its relevance to user queries. This helps users find the most pertinent information from their wiki sources quickly and accurately.

## Features

- **Multiple AI Provider Support**: OpenAI, Google Gemini, Azure OpenAI, and local models
- **Smart Caching**: Embedding vectors are cached to reduce API calls and improve performance
- **Content Chunking**: Large documents are automatically split for more accurate scoring
- **Relevance Threshold**: Filter out low-relevance content based on configurable thresholds
- **Content Summarization**: Generate concise summaries of relevant content
- **Mock Provider**: Test the functionality without requiring API keys

## Configuration

AI services are configured in the `mcp.config.json` file:

```json
{
  "ai": {
    "enabled": true,
    "primaryProvider": "openai",
    "minimumRelevanceScore": 0.65,
    "contentChunkSize": 1000,
    "embeddingCacheTimeMinutes": 60,
    "providers": {
      "openai": {
        "type": "openai",
        "enabled": true,
        "apiKey": "sk-your-openai-api-key",
        "embeddingModel": "text-embedding-3-small",
        "summaryModel": "gpt-4o"
      },
      "gemini": {
        "type": "gemini",
        "enabled": false,
        "apiKey": "your-gemini-api-key",
        "embeddingModel": "embedding-001",
        "summaryModel": "gemini-2.5-pro"
      },
      "azureopenai": {
        "type": "azureopenai",
        "enabled": false,
        "apiKey": "your-azure-api-key",
        "endpoint": "https://your-resource-name.openai.azure.com/",
        "embeddingDeployment": "text-embedding-ada-002",
        "summaryDeployment": "gpt-4o"
      },
      "local": {
        "type": "local",
        "enabled": false,
        "modelPath": "./models/embedding-model.onnx",
        "embeddingDimension": 384
      }
    }
  }
}
```

### Configuration Options

- **enabled**: Main switch to enable/disable all AI features
- **primaryProvider**: Default provider to use (must be one of the configured providers)
- **minimumRelevanceScore**: Threshold (0-1) for filtering results
- **contentChunkSize**: Maximum size in characters for content chunks
- **embeddingCacheTimeMinutes**: How long to cache embedding vectors
- **providers**: Configuration for each AI provider

### Environment Variables

- **MCP_ENABLE_AI**: Set to "true" or "false" to override the config file setting
- **MCP_USE_MOCK_AI**: Set to "true" to use a mock AI provider for testing without API keys

## Testing

### Testing with Actual AI Providers

```bash
# Configure your API keys in mcp.config.json
npm run test:ai
```

### Testing with the Mock Provider

```bash
npm run test:ai:mock
```

## How It Works

1. When a query is received, content is retrieved from the wiki sources
2. If AI services are enabled, each content piece is:
   - Split into more manageable chunks
   - Converted to AI embedding vectors
   - Scored against the query using cosine similarity
   - Optionally summarized
3. Results are returned sorted by relevance score
4. Results below the minimum threshold are filtered out

## Add Your Own AI Provider

To add a new AI provider, create a new class that implements the `AIProvider` interface:

```typescript
export interface AIProvider {
  generateEmbedding(text: string): Promise<number[]>;
  calculateRelevance(queryText: string, contentText: string): Promise<number>;
  summarizeContent(content: string, maxLength?: number): Promise<string>;
}
```

Then update the `aiService.ts` file to recognize and use your new provider.

## Best Practices

1. **API Keys**: Never commit API keys to source control. Use environment variables or secure storage.
2. **Rate Limiting**: Be mindful of API rate limits, especially with OpenAI and other commercial providers.
3. **Content Size**: Large content can lead to higher costs. Use chunking to optimize API usage.
4. **Error Handling**: The system will fall back to basic relevance scoring if AI scoring fails.
5. **Testing**: Use the mock provider for testing and development to avoid API costs.

## API Version Update (May 27, 2025)

The Azure OpenAI provider has been updated with the following improvements:

1. **Updated API Version**: Changed from `2023-05-15` to `2024-02-01` to ensure compatibility with newer Azure OpenAI features.

2. **Enhanced Validation**: Added validation checks for required configuration parameters like `endpoint` and `embeddingDeployment`.

3. **Improved Cache Management**: Implemented a cache size limit (1000 entries) with automatic pruning of oldest entries to prevent memory issues.

4. **Centralized Constants**: Created a dedicated constant for API version to ensure consistent versioning across the provider.

These changes ensure better stability, error handling, and memory management when using Azure OpenAI services.

## Gemini Provider Improvements (May 27, 2025)

The Google Gemini provider has been updated with the following improvements:

1. **API Version Constant**: Added a `GEMINI_API_VERSION` constant to centralize API version management.

2. **Validation Checks**: Implemented validation for the API key and other required configuration.

3. **Cache Management**: Added a maximum cache size limit (1000 entries) with automatic removal of oldest entries to prevent memory issues.

4. **Enhanced Error Handling**: Improved error handling for missing configuration parameters.

These improvements align with our Azure OpenAI provider enhancements and ensure consistent behavior across all AI providers.
