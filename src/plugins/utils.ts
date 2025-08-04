import { WikiSourcePlugin, PluginConfigSchema } from './types.js';

/**
 * Plugin Development Utilities
 * 
 * Provides utilities for developing and validating wiki source adapter plugins.
 */

/**
 * Create a plugin template for development
 */
export function createPluginTemplate(pluginId: string, pluginName: string): string {
  return `import { WikiSourcePlugin, WikiFetchOptions, WikiContent } from '@mcp-internal-wiki/plugin-types';
import { logger } from './logger'; // You'll need to provide your own logger

export class ${toPascalCase(pluginId)}Plugin implements WikiSourcePlugin {
  id = '${pluginId}';
  name = '${pluginName}';
  version = '1.0.0';
  description = 'Custom wiki adapter for ${pluginName}';
  supportedTypes = ['${pluginId}'];

  private initialized = false;
  private config: any = {};

  async initialize(config: any): Promise<void> {
    this.config = { ...config };
    this.initialized = true;
    logger.info(\`\${this.name} plugin initialized\`);
  }

  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      // TODO: Implement your URL detection logic here
      return urlObj.hostname.includes('your-wiki-domain.com');
    } catch (error) {
      logger.debug(\`\${this.id} plugin canHandle error for \${url}:\`, error);
      return false;
    }
  }

  async fetchContent(url: string, options?: WikiFetchOptions): Promise<WikiContent> {
    if (!this.initialized) {
      throw new Error(\`\${this.name} plugin not initialized\`);
    }

    try {
      logger.debug(\`\${this.name} plugin fetching content from: \${url}\`);

      // TODO: Implement your content fetching logic here
      const response = await fetch(url);
      const html = await response.text();
      
      // TODO: Parse and clean the content according to your wiki's structure
      const content = this.parseContent(html, url);
      
      logger.debug(\`\${this.name} plugin successfully fetched content from: \${url}\`);
      return content;
      
    } catch (error) {
      logger.error(\`\${this.name} plugin failed to fetch content from \${url}:\`, error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.initialized = false;
    logger.debug(\`\${this.name} plugin cleaned up\`);
  }

  private parseContent(html: string, url: string): WikiContent {
    // TODO: Implement your HTML parsing logic here
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\\/title>/i);
    const title = titleMatch?.[1]?.trim() || 'Wiki Page';

    // Basic content extraction - customize for your wiki format
    const content = html
      .replace(/<script[^>]*>[\\s\\S]*?<\\/script>/gi, '')
      .replace(/<style[^>]*>[\\s\\S]*?<\\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    return {
      url,
      title,
      content,
      lastModified: new Date(),
      metadata: {
        source: this.id,
        plugin: this.id
      }
    };
  }
}

export default ${toPascalCase(pluginId)}Plugin;
`;
}

/**
 * Validate a plugin package.json structure
 */
export function validatePluginPackage(packageJson: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!packageJson.name) {
    errors.push('Package must have a name');
  }

  if (!packageJson.version) {
    errors.push('Package must have a version');
  }

  if (!packageJson.mcpWikiPlugin) {
    errors.push('Package must have mcpWikiPlugin configuration');
  } else {
    const pluginConfig = packageJson.mcpWikiPlugin;
    
    if (!pluginConfig.className) {
      errors.push('mcpWikiPlugin.className must be specified');
    }

    if (pluginConfig.configSchema && typeof pluginConfig.configSchema !== 'object') {
      errors.push('mcpWikiPlugin.configSchema must be an object');
    }
  }

  // Check for MCP wiki plugin dependencies
  const deps = { ...packageJson.dependencies, ...packageJson.peerDependencies };
  if (!deps['@mcp-internal-wiki/plugin-types'] && !deps['mcp-internal-wiki']) {
    errors.push('Plugin must depend on @mcp-internal-wiki/plugin-types or mcp-internal-wiki');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a complete plugin package structure
 */
export function createPluginPackage(pluginId: string, pluginName: string, options: PluginPackageOptions = {}): PluginPackageStructure {
  const packageName = options.packageName || `mcp-wiki-${pluginId}-plugin`;
  
  return {
    'package.json': JSON.stringify({
      name: packageName,
      version: '1.0.0',
      description: `MCP Wiki plugin for ${pluginName}`,
      main: 'index.js',
      types: 'index.d.ts',
      scripts: {
        build: 'tsc',
        test: 'npm run build && node test.js'
      },
      mcpWikiPlugin: {
        className: `${toPascalCase(pluginId)}Plugin`,
        configSchema: options.configSchema || {
          type: 'object',
          properties: {},
          required: []
        }
      },
      peerDependencies: {
        '@mcp-internal-wiki/plugin-types': '^1.0.0'
      },
      devDependencies: {
        'typescript': '^5.0.0',
        '@types/node': '^20.0.0'
      },
      keywords: ['mcp', 'wiki', 'plugin', pluginId],
      author: options.author || '',
      license: options.license || 'MIT'
    }, null, 2),
    
    'index.ts': createPluginTemplate(pluginId, pluginName),
    
    'README.md': createPluginReadme(pluginId, pluginName, packageName),
    
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        outDir: './dist'
      },
      include: ['index.ts'],
      exclude: ['node_modules', 'dist']
    }, null, 2),
    
    'test.js': createPluginTest(pluginId, pluginName)
  };
}

interface PluginPackageOptions {
  packageName?: string;
  author?: string;
  license?: string;
  configSchema?: PluginConfigSchema;
}

interface PluginPackageStructure {
  [filename: string]: string;
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function createPluginReadme(pluginId: string, pluginName: string, packageName: string): string {
  return `# ${pluginName} Plugin for MCP Internal Wiki Server

A custom wiki adapter plugin for the MCP Internal Wiki Server that provides support for ${pluginName}.

## Installation

\`\`\`bash
npm install ${packageName}
\`\`\`

## Usage

The plugin will be automatically discovered by the MCP Internal Wiki Server when installed.

### Configuration

Add your wiki URLs to the MCP configuration:

\`\`\`json
{
  "wikiUrls": [
    "https://your-${pluginId}-wiki.com/docs"
  ]
}
\`\`\`

### Plugin-Specific Configuration

This plugin supports the following configuration options:

\`\`\`json
{
  "plugins": {
    "${pluginId}": {
      // Plugin-specific configuration goes here
    }
  }
}
\`\`\`

## Development

To build the plugin:

\`\`\`bash
npm run build
\`\`\`

To test the plugin:

\`\`\`bash
npm test
\`\`\`

## API

This plugin implements the \`WikiSourcePlugin\` interface and supports:

- Content fetching from ${pluginName} URLs
- Automatic content parsing and cleaning
- Section extraction
- Metadata extraction

## License

MIT
`;
}

function createPluginTest(pluginId: string, pluginName: string): string {
  return `const { ${toPascalCase(pluginId)}Plugin } = require('./dist/index.js');

async function testPlugin() {
  const plugin = new ${toPascalCase(pluginId)}Plugin();
  
  try {
    console.log('Testing ${pluginName} plugin...');
    
    // Initialize plugin
    await plugin.initialize({});
    console.log('✓ Plugin initialized');
    
    // Test URL handling
    const testUrl = 'https://example.com'; // Update with a real test URL
    const canHandle = plugin.canHandle(testUrl);
    console.log(\`✓ Can handle test URL: \${canHandle}\`);
    
    // Test basic properties
    console.log(\`✓ Plugin ID: \${plugin.id}\`);
    console.log(\`✓ Plugin Name: \${plugin.name}\`);
    console.log(\`✓ Plugin Version: \${plugin.version}\`);
    console.log(\`✓ Supported Types: \${plugin.supportedTypes.join(', ')}\`);
    
    // Cleanup
    await plugin.cleanup();
    console.log('✓ Plugin cleaned up');
    
    console.log('\\n${pluginName} plugin test completed successfully!');
  } catch (error) {
    console.error('Plugin test failed:', error);
    process.exit(1);
  }
}

testPlugin();
`;
}
