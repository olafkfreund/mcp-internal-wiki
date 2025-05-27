# Integrating Private Wiki Authentication into the Main MCP Project

This document provides guidance on how to integrate the authentication functionality from this POC into the main MCP project.

## 1. Update the WikiSource Class

The main change needs to be applied to the `wikiSource.ts` file in the main project:

```typescript
// src/sources/wikiSource.ts

// Add or update the WikiAuthConfig interface
interface WikiAuthConfig {
  urlPattern: string;  // Regex pattern to match URLs that need this auth
  type: 'basic' | 'token' | 'oauth' | 'custom';
  username?: string;  // For basic auth
  password?: string;  // For basic auth
  token?: string;     // For token auth
  headerName?: string; // For custom header auth (e.g., 'Authorization')
  headerValue?: string; // Value for the custom header
  oauthConfig?: {      // For OAuth
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
  };
}

// Add the authentication properties to the WikiEntry interface
interface WikiEntry {
  url: string;
  type: WikiType;
  name: string;
  auth?: {
    type: 'basic' | 'token' | 'oauth' | 'custom';
    config: any;
  };
}

export class WikiSource {
  // ... existing code ...
  
  private authConfigs: WikiAuthConfig[] = [];
  
  constructor() {
    // ... existing code ...
    
    try {
      const configPath = path.join(process.cwd(), 'mcp.config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as WikiConfig;
        
        if (config.wikiUrls && Array.isArray(config.wikiUrls)) {
          // Store auth configs for later use
          this.authConfigs = config.auth || [];
          
          // Parse each wiki URL and assign auth if applicable
          this.wikiEntries = config.wikiUrls.map(url => {
            const entry = this.parseWikiUrl(url);
            
            // Check if this wiki needs authentication
            const authConfig = this.findAuthConfigForUrl(url);
            if (authConfig) {
              entry.auth = {
                type: authConfig.type,
                config: authConfig
              };
              console.log(`Applied ${authConfig.type} authentication for ${entry.name}`);
            }
            
            return entry;
          });
        }
        // ... existing code ...
      }
    } catch (error) {
      // ... existing error handling ...
    }
  }
  
  // Add this method to find authentication config for a URL
  private findAuthConfigForUrl(url: string): WikiAuthConfig | undefined {
    return this.authConfigs.find(authConfig => {
      try {
        const pattern = new RegExp(authConfig.urlPattern);
        return pattern.test(url);
      } catch (error) {
        console.error(`Invalid URL pattern in auth config: ${authConfig.urlPattern}`, error);
        return false;
      }
    });
  }
  
  // Update the fetchWikiContent method to use authentication
  private async fetchWikiContent(entry: WikiEntry): Promise<string> {
    // ... existing caching logic ...
    
    console.log(`Fetching content from ${entry.name} (${entry.url})...`);
    
    try {
      let content = '';
      const config = this.createRequestConfig(entry);
      
      switch (entry.type) {
        case WikiType.MediaWiki:
          content = await this.fetchMediaWikiContent(entry, config);
          break;
        case WikiType.Gitbook:
          content = await this.fetchGitbookContent(entry, config);
          break;
        // ... other cases ...
        default:
          content = await this.fetchGenericContent(entry, config);
      }
      
      // ... existing caching logic ...
      
      return content;
    } catch (error) {
      // ... existing error handling ...
    }
  }
  
  // Add this method to create request configs with authentication
  private createRequestConfig(entry: WikiEntry): any {
    if (!entry.auth) {
      return {}; // No authentication needed
    }
    
    const config: any = {
      headers: {}
    };
    
    switch (entry.auth.type) {
      case 'basic':
        const { username, password } = entry.auth.config;
        if (username && password) {
          const base64Credentials = Buffer.from(`${username}:${password}`).toString('base64');
          config.headers['Authorization'] = `Basic ${base64Credentials}`;
        }
        break;
        
      case 'token':
        const { token } = entry.auth.config;
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        break;
        
      case 'custom':
        const { headerName, headerValue } = entry.auth.config;
        if (headerName && headerValue) {
          config.headers[headerName] = headerValue;
        }
        break;
        
      case 'oauth':
        // OAuth implementation would be more complex and require token management
        console.log(`OAuth authentication for ${entry.url} - token would be applied if implemented`);
        break;
    }
    
    return config;
  }
  
  // Update each fetch method to accept a config parameter
  private async fetchMediaWikiContent(entry: WikiEntry, config: any): Promise<string> {
    // ... existing code ...
    const response = await axios.get(`${apiUrl.toString()}?${params.toString()}`, config);
    // ... rest of method ...
  }
  
  // Update other fetch methods similarly
  // ...
}
```

## 2. Update the Configuration Schema

Add the authentication configuration schema to the `mcp.config.json` file:

```json
{
  "wikiUrls": ["https://example.com/wiki1", "https://example.com/wiki2"],
  "cacheTimeoutMinutes": 30,
  "auth": [
    {
      "urlPattern": "^https://example\\.com/wiki1",
      "type": "basic",
      "username": "username",
      "password": "password"
    },
    {
      "urlPattern": "^https://example\\.com/wiki2",
      "type": "token",
      "token": "your-api-token"
    }
  ]
}
```

## 3. Test Integration

To test the integration, you can use the test scripts provided in this POC, modified to work with the main project:

```bash
# Copy the test scripts
cp poc-private-wiki/test-auth-poc.js tests/auth-test-integration.js
cp poc-private-wiki/interactive-test-client.js tests/interactive-auth-test.js

# Update paths and imports as needed
```

## 4. Documentation

Update the project documentation to include information about the new authentication features:

1. How to configure authentication for private wikis
2. Supported authentication types
3. Security recommendations
4. Troubleshooting common authentication issues

## 5. Security Considerations

- Store sensitive credentials securely (consider environment variables)
- Implement credential encryption
- Add OAuth token refresh mechanisms
- Add proper error handling for authentication failures
