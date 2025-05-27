
import { 
  Template, 
  CodePattern, 
  PatternVariable,
  TemplateExample
} from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Template engine for code generation
 * Processes templates with variable substitution and logic
 */
export class TemplateEngine {
  private templates: Map<string, Template> = new Map();
  private templateDirectory: string;

  constructor(templateDirectory: string = './templates') {
    this.templateDirectory = templateDirectory;
  }

  /**
   * Initialize template engine and load templates
   */
  async initialize(): Promise<void> {
    try {
      await this.loadTemplates();
      console.log(`Loaded ${this.templates.size} templates`);
    } catch (error) {
      console.warn('Failed to load templates:', error);
    }
  }

  /**
   * Process a code pattern using templates
   */
  async processPattern(
    pattern: CodePattern, 
    variables: Record<string, any>
  ): Promise<string | null> {
    try {
      // Find matching template
      const template = this.findBestTemplate(pattern);
      if (!template) {
        return null;
      }

      // Merge pattern variables with provided variables
      const mergedVariables = this.mergeVariables(template, variables);

      // Process template
      return await this.processTemplate(template, mergedVariables);
    } catch (error) {
      console.error('Error processing pattern:', error);
      return null;
    }
  }

  /**
   * Process a template with variables
   */
  async processTemplate(
    template: Template, 
    variables: Record<string, any>
  ): Promise<string> {
    let content = template.content;

    // Simple variable substitution
    content = this.substituteVariables(content, variables);

    // Process conditional blocks
    content = this.processConditionals(content, variables);

    // Process loops
    content = this.processLoops(content, variables);

    // Clean up extra whitespace
    content = this.cleanupWhitespace(content);

    return content;
  }

  /**
   * Load templates from directory
   */
  private async loadTemplates(): Promise<void> {
    try {
      const templateDir = path.resolve(this.templateDirectory);
      console.log(`[TemplateEngine] Loading templates from: ${templateDir}`);
      
      // Create template directory if it doesn't exist
      try {
        await fs.access(templateDir);
        console.log(`[TemplateEngine] Template directory exists`);
      } catch {
        console.log(`[TemplateEngine] Template directory doesn't exist, creating with defaults`);
        await fs.mkdir(templateDir, { recursive: true });
        await this.createDefaultTemplates(templateDir);
      }

      // Load template files
      const files = await fs.readdir(templateDir, { recursive: true });
      console.log(`[TemplateEngine] Found files in template directory:`, files);
      
      for (const file of files) {
        if (typeof file === 'string' && file.endsWith('.template.json')) {
          console.log(`[TemplateEngine] Loading JSON template file: ${file}`);
          try {
            const filePath = path.join(templateDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const template: Template = JSON.parse(content);
            
            // Validate template
            if (this.validateTemplate(template)) {
              this.templates.set(template.id, template);
              console.log(`[TemplateEngine] Successfully loaded JSON template: ${template.id}`);
            } else {
              console.warn(`[TemplateEngine] Template validation failed for: ${file}`);
            }
          } catch (error) {
            console.warn(`Failed to load template ${file}:`, error);
          }
        } else if (typeof file === 'string' && file.endsWith('.hbs')) {
          console.log(`[TemplateEngine] Loading Handlebars template file: ${file}`);
          try {
            const filePath = path.join(templateDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const template = this.createTemplateFromHandlebars(file, content);
            
            // Validate template
            if (this.validateTemplate(template)) {
              this.templates.set(template.id, template);
              console.log(`[TemplateEngine] Successfully loaded HBS template: ${template.id}`);
            } else {
              console.warn(`[TemplateEngine] Template validation failed for: ${file}`);
            }
          } catch (error) {
            console.warn(`Failed to load template ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to access template directory:', error);
    }
  }

  /**
   * Create default templates
   */
  private async createDefaultTemplates(templateDir: string): Promise<void> {
    const defaultTemplates: Template[] = [
      {
        id: 'typescript-class',
        name: 'TypeScript Class',
        description: 'Basic TypeScript class template',
        category: 'class',
        language: 'typescript',
        content: `/**
 * {{description}}
 */
export class {{className}} {
{{#if properties}}
{{#each properties}}
  private {{name}}: {{type}};
{{/each}}

  constructor({{#each properties}}{{name}}: {{type}}{{#unless @last}}, {{/unless}}{{/each}}) {
{{#each properties}}
    this.{{name}} = {{name}};
{{/each}}
  }

{{#each properties}}
  get{{capitalize name}}(): {{type}} {
    return this.{{name}};
  }

  set{{capitalize name}}(value: {{type}}): void {
    this.{{name}} = value;
  }

{{/each}}
{{/if}}
{{#if methods}}
{{#each methods}}
  {{name}}({{#each params}}{{name}}: {{type}}{{#unless @last}}, {{/unless}}{{/each}}): {{returnType}} {
    // TODO: Implement {{name}}
{{#if returnType}}
{{#unless (eq returnType "void")}}
    return null as any;
{{/unless}}
{{/if}}
  }

{{/each}}
{{/if}}
}`,
        variables: {
          className: {
            name: 'className',
            type: 'string',
            description: 'Name of the class',
            required: true
          },
          description: {
            name: 'description',
            type: 'string',
            description: 'Class description',
            required: false,
            defaultValue: 'Class description'
          },
          properties: {
            name: 'properties',
            type: 'array',
            description: 'Class properties',
            required: false,
            defaultValue: []
          },
          methods: {
            name: 'methods',
            type: 'array',
            description: 'Class methods',
            required: false,
            defaultValue: []
          }
        },
        examples: []
      },
      {
        id: 'dockerfile-node',
        name: 'Node.js Dockerfile',
        description: 'Dockerfile template for Node.js applications',
        category: 'docker',
        language: 'dockerfile',
        content: `FROM node:{{nodeVersion}}-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

{{#if buildScript}}
# Build application
RUN npm run {{buildScript}}
{{/if}}

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE {{port}}

{{#if healthCheck}}
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:{{port}}/health || exit 1
{{/if}}

CMD ["npm", "start"]`,
        variables: {
          nodeVersion: {
            name: 'nodeVersion',
            type: 'string',
            description: 'Node.js version',
            required: false,
            defaultValue: '18'
          },
          port: {
            name: 'port',
            type: 'number',
            description: 'Application port',
            required: false,
            defaultValue: 3000
          },
          buildScript: {
            name: 'buildScript',
            type: 'string',
            description: 'Build script name',
            required: false
          },
          healthCheck: {
            name: 'healthCheck',
            type: 'boolean',
            description: 'Include health check',
            required: false,
            defaultValue: true
          }
        },
        examples: []
      }
    ];

    for (const template of defaultTemplates) {
      const filePath = path.join(templateDir, `${template.id}.template.json`);
      await fs.writeFile(filePath, JSON.stringify(template, null, 2));
    }
  }

  /**
   * Find best matching template for pattern
   */
  private findBestTemplate(pattern: CodePattern): Template | null {
    const candidates: Array<{ template: Template; score: number }> = [];

    // Convert Map values to array for iteration
    const templateArray = Array.from(this.templates.values());
    for (const template of templateArray) {
      let score = 0;

      // Language match
      if (template.language === pattern.language) score += 10;

      // Category match
      if (template.category === pattern.category) score += 5;

      // Framework match
      if (template.framework && pattern.tags.includes(template.framework)) score += 3;

      // Tag matches
      for (const tag of pattern.tags) {
        if (template.name.toLowerCase().includes(tag.toLowerCase())) score += 1;
      }

      if (score > 0) {
        candidates.push({ template, score });
      }
    }

    // Return highest scoring template
    candidates.sort((a, b) => b.score - a.score);
    return candidates.length > 0 ? candidates[0].template : null;
  }

  /**
   * Merge template variables with provided variables
   */
  private mergeVariables(
    template: Template, 
    provided: Record<string, any>
  ): Record<string, any> {
    const merged: Record<string, any> = {};

    // Start with template defaults
    for (const [key, variable] of Object.entries(template.variables)) {
      merged[key] = variable.defaultValue;
    }

    // Override with provided values
    for (const [key, value] of Object.entries(provided)) {
      if (template.variables[key]) {
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Simple variable substitution
   */
  private substituteVariables(content: string, variables: Record<string, any>): string {
    let result = content;

    // Simple {{variable}} substitution
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value || ''));
    }

    return result;
  }

  /**
   * Process conditional blocks {{#if condition}}...{{/if}}
   */
  private processConditionals(content: string, variables: Record<string, any>): string {
    let result = content;

    // Match {{#if variable}}...{{/if}} blocks
    const ifRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    
    result = result.replace(ifRegex, (match, condition, block) => {
      const value = variables[condition];
      return this.isTruthy(value) ? block : '';
    });

    // Match {{#unless variable}}...{{/unless}} blocks
    const unlessRegex = /{{#unless\s+(\w+)}}([\s\S]*?){{\/unless}}/g;
    
    result = result.replace(unlessRegex, (match, condition, block) => {
      const value = variables[condition];
      return !this.isTruthy(value) ? block : '';
    });

    return result;
  }

  /**
   * Process loop blocks {{#each array}}...{{/each}}
   */
  private processLoops(content: string, variables: Record<string, any>): string {
    let result = content;

    const eachRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    
    result = result.replace(eachRegex, (match, arrayName, block) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) return '';

      return array.map((item, index) => {
        let itemBlock = block;
        
        // Substitute item properties
        if (typeof item === 'object') {
          for (const [key, value] of Object.entries(item)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            itemBlock = itemBlock.replace(regex, String(value || ''));
          }
        } else {
          // For primitive values, use {{this}}
          itemBlock = itemBlock.replace(/{{\\s*this\\s*}}/g, String(item));
        }

        // Substitute loop variables
        itemBlock = itemBlock.replace(/{{\\s*@index\\s*}}/g, String(index));
        itemBlock = itemBlock.replace(/{{\\s*@first\\s*}}/g, String(index === 0));
        itemBlock = itemBlock.replace(/{{\\s*@last\\s*}}/g, String(index === array.length - 1));

        return itemBlock;
      }).join('');
    });

    return result;
  }

  /**
   * Clean up extra whitespace
   */
  private cleanupWhitespace(content: string): string {
    return content
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove multiple empty lines
      .replace(/^[\s\n]+|[\s\n]+$/g, '') // Trim start/end
      .replace(/[ \t]+$/gm, ''); // Remove trailing spaces
  }

  /**
   * Check if value is truthy for conditionals
   */
  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return !!value;
  }

  /**
   * Create a Template object from a Handlebars file
   */
  private createTemplateFromHandlebars(filename: string, content: string): Template {
    const baseName = path.basename(filename, '.hbs');
    const id = baseName;
    
    // Extract variables from template content
    const variableMatches = content.match(/{{[^{}]*}}/g) || [];
    const variables: Record<string, PatternVariable> = {};
    
    // Process found variables
    const seenVariables = new Set<string>();
    for (const match of variableMatches) {
      // Clean up the variable name
      const cleaned = match.replace(/[{}\s#/]/g, '');
      if (cleaned && !seenVariables.has(cleaned) && 
          !['if', 'unless', 'each', 'this', 'else', '@index', '@first', '@last'].includes(cleaned)) {
        seenVariables.add(cleaned);
        
        // Infer variable type and create definition
        variables[cleaned] = {
          name: cleaned,
          type: this.inferVariableType(cleaned),
          description: `${cleaned} parameter`,
          required: false,
          defaultValue: this.getDefaultValueForType(this.inferVariableType(cleaned))
        };
      }
    }

    // Determine category and language from filename
    const category = this.inferCategoryFromFilename(baseName);
    const language = this.inferLanguageFromFilename(baseName);

    return {
      id,
      name: this.formatDisplayName(baseName),
      description: `Template for ${this.formatDisplayName(baseName)}`,
      category,
      language,
      content,
      variables,
      examples: []
    };
  }

  /**
   * Infer variable type from name
   */
  private inferVariableType(variableName: string): 'string' | 'number' | 'boolean' | 'array' | 'object' {
    const lowerName = variableName.toLowerCase();
    
    if (lowerName.includes('port') || lowerName.includes('count') || 
        lowerName.includes('number') || lowerName.includes('size')) {
      return 'number';
    }
    
    if (lowerName.includes('enabled') || lowerName.includes('disabled') ||
        lowerName.includes('flag') || lowerName.startsWith('is') ||
        lowerName.startsWith('has') || lowerName.startsWith('should')) {
      return 'boolean';
    }
    
    if (lowerName.includes('list') || lowerName.includes('array') ||
        lowerName.endsWith('s') || ['imports', 'exports', 'dependencies', 
        'properties', 'methods', 'arguments', 'parameters'].includes(lowerName)) {
      return 'array';
    }
    
    if (lowerName.includes('config') || lowerName.includes('options') ||
        lowerName.includes('settings')) {
      return 'object';
    }
    
    return 'string';
  }

  /**
   * Get default value for a type
   */
  private getDefaultValueForType(type: string): any {
    switch (type) {
      case 'number': return 0;
      case 'boolean': return false;
      case 'array': return [];
      default: return '';
    }
  }

  /**
   * Infer category from filename
   */
  private inferCategoryFromFilename(basename: string): string {
    if (basename.includes('class')) return 'class';
    if (basename.includes('server') || basename.includes('api')) return 'server';
    if (basename.includes('docker')) return 'docker';
    if (basename.includes('package')) return 'package';
    if (basename.includes('readme')) return 'documentation';
    return 'general';
  }

  /**
   * Infer language from filename
   */
  private inferLanguageFromFilename(basename: string): string {
    if (basename.includes('typescript')) return 'typescript';
    if (basename.includes('javascript')) return 'javascript';
    if (basename.includes('docker')) return 'dockerfile';
    if (basename.includes('package')) return 'json';
    if (basename.includes('readme')) return 'markdown';
    if (basename.includes('express') || basename.includes('server')) return 'typescript';
    return 'text';
  }

  /**
   * Format display name from basename
   */
  private formatDisplayName(basename: string): string {
    return basename
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Validate template structure
   */
  private validateTemplate(template: any): boolean {
    return !!(
      template.id &&
      template.name &&
      template.language &&
      template.content &&
      typeof template.variables === 'object'
    );
  }

  /**
   * Get all available templates
   */
  getTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }
}
