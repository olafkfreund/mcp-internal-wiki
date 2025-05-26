# Wiki Integration & Real-time Content Fetching

This document explains how the MCP Wiki Server integrates with external wiki sources and fetches content in real-time.

## Overview

The MCP Wiki Server can connect to multiple wiki sources and retrieve content based on user queries. The content is parsed, relevant sections are extracted, and code snippets are highlighted for easy integration with VS Code via the MCP protocol.

## Process Flow

The following sequence diagram illustrates the content fetching process:

![Sequence Diagram](images/sequence-diagram.md)

*Note: To view this diagram properly, use a Markdown viewer that supports Mermaid diagrams.*

## Supported Wiki Sources

The system currently supports the following wiki formats:

| Type | Description | Detection Method |
|------|-------------|-----------------|
| Markdown | Standard markdown documentation | URLs ending in `.md` or containing `/docs/` |
| MediaWiki | Wiki systems like Wikipedia | Hostnames ending with `wiki.org` or containing `mediawiki` |
| GitBook | GitBook documentation sites | Hostnames containing `gitbook.io` |
| Confluence | Atlassian Confluence wikis | URLs containing `confluence` |
| SharePoint | Microsoft SharePoint wikis | Hostnames containing `sharepoint` |

## Authentication for Private Wikis

The MCP Wiki Server supports authentication for accessing private wikis. You can configure different authentication methods in the `mcp.config.json` file:

### Authentication Types

| Type | Description | Required Fields |
|------|-------------|----------------|
| basic | HTTP Basic Authentication | `username`, `password` |
| token | Bearer token authentication | `token` |
| custom | Custom header authentication | `headerName`, `headerValue` |
| oauth | OAuth 2.0 authentication | `oauthConfig` (clientId, clientSecret, tokenUrl) |

### Authentication Configuration Example

```json
{
  "wikiUrls": [
    "https://public-wiki.example.org",
    "https://private-confluence.example.com/wiki",
    "https://private-github.example.com/org/repo/wiki"
  ],
  "cacheTimeoutMinutes": 30,
  "auth": [
    {
      "urlPattern": "private-confluence\\.example\\.com",
      "type": "basic",
      "username": "your-username",
      "password": "your-password"
    },
    {
      "urlPattern": "private-github\\.example\\.com",
      "type": "token",
      "token": "your-github-token"
    }
  ]
}
```

### URL Pattern Matching

The `urlPattern` field uses regular expressions to match URLs that require authentication. The system will apply the authentication configuration to any wiki URL that matches the pattern.

### Security Considerations

- Store sensitive credentials securely
- Consider using environment variables for sensitive values
- For production use, set up proper access controls for the config file
- OAuth tokens should be refreshed periodically (not yet implemented)

## Fetching Process

1. **URL Configuration**: Wiki URLs are configured in `mcp.config.json`
2. **Type Detection**: The system automatically detects the wiki type based on URL patterns
3. **Authentication**: If configured, authentication credentials are applied to requests
4. **Content Retrieval**: Content is fetched via HTTP/HTTPS requests
5. **Content Parsing**: The content is parsed based on the wiki format
6. **Content Extraction**: Relevant sections are extracted based on user queries
7. **Code Block Extraction**: Code snippets are identified and extracted

## Intelligent Caching

To improve performance and reduce load on wiki servers, the system implements an intelligent caching mechanism:

- Content is cached in memory after the first fetch
- Cache timeout is configurable via `cacheTimeoutMinutes` (default: 30 minutes)
- Search indexes are built from cached content for faster querying
- If a request fails, the system falls back to cached content even if expired

## Code Block Extraction

The system identifies and extracts code blocks using the following patterns:

- Markdown-style code blocks: ````language\ncode\n````
- HTML-style code blocks: `<pre><code>code</code></pre>`
- MediaWiki-style code blocks: `<syntaxhighlight lang="language">code</syntaxhighlight>`

## Content Relevance

When responding to queries, the system determines relevance using:

1. Exact phrase matches
2. Keyword matches (minimum 50% of keywords must appear)
3. Code block content matches
4. Section heading matches

## Fallback Mechanism

If real-time content fetching fails, the system falls back to:

1. Expired cached content (if available)
2. Simulated content based on query patterns
3. Default example content

## Configuration Example

```json
{
  "wikiUrls": [
    "https://freundcloud.gitbook.io/devops-examples-from-real-life/",
    "https://wiki.nixos.org/wiki/NixOS_Wiki"
  ],
  "cacheTimeoutMinutes": 30
}
```

## Implementation Details

The core functionality is implemented in `src/sources/wikiSource.ts` with the following key components:

- `WikiSource` class: Main class for handling wiki content
- `fetchWikiContent` method: Fetches content from wiki sources
- `extractCodeBlocks` method: Identifies and extracts code snippets
- `isContentRelevantToQuery` method: Determines content relevance
- `extractRelevantSection` method: Extracts the most relevant content section

## Future Improvements

- Authentication support for private wikis
- Rate limiting to prevent overloading wiki servers
- Custom adapters for specific wiki platforms
- Full-text search indexing
- Content transformation and formatting options
