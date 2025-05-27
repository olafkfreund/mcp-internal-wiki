
// Use improved imports with path aliases - this provides better IDE support
import { 
  TransformationContext, 
  TransformationResult, 
  GeneratedCode, 
  CodePattern,
  Template
} from './types';
import { AIProvider } from '../ai/aiProvider';
import { TemplateEngine } from './TemplateEngine';

/**
 * Core content transformation engine
 * Converts wiki content and documentation into executable code
 */
export class ContentTransformer {
  private aiProvider: AIProvider;
  private templateEngine: TemplateEngine;
  private patterns: Map<string, CodePattern> = new Map();

  constructor(aiProvider: AIProvider, templateEngine: TemplateEngine) {
    this.aiProvider = aiProvider;
    this.templateEngine = templateEngine;
  }

  /**
   * Transform markdown/wiki content to code
   */
  async transformMarkdownToCode(
    content: string, 
    targetLanguage: string,
    options: {
      framework?: string;
      projectType?: string;
      customVariables?: Record<string, any>;
    } = {}
  ): Promise<TransformationResult> {
    const startTime = Date.now();
    
    try {
      const context: TransformationContext = {
        sourceContent: content,
        sourceType: 'markdown',
        targetLanguage,
        targetFramework: options.framework,
        projectType: options.projectType,
        customVariables: options.customVariables
      };

      // Extract code patterns from content
      const patterns = await this.extractPatterns(content, targetLanguage);
      
      // Generate code using AI and templates
      const generated: GeneratedCode[] = [];
      
      for (const pattern of patterns) {
        const code = await this.generateCodeFromPattern(pattern, context);
        if (code) {
          generated.push(code);
        }
      }

      // If no patterns found, try direct AI transformation
      if (generated.length === 0) {
        const aiGenerated = await this.transformWithAI(context);
        if (aiGenerated) {
          generated.push(aiGenerated);
        }
      }

      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        generated,
        metadata: {
          transformationType: 'markdown-to-code',
          processingTime,
          sourceLinesProcessed: content.split('\n').length,
          codeBlocksGenerated: generated.length
        }
      };

    } catch (error: any) {
      return {
        success: false,
        generated: [],
        errors: [error.message],
        metadata: {
          transformationType: 'markdown-to-code',
          processingTime: Date.now() - startTime,
          sourceLinesProcessed: content.split('\n').length,
          codeBlocksGenerated: 0
        }
      };
    }
  }

  /**
   * Extract code patterns from content
   */
  async extractPatterns(content: string, targetLanguage: string): Promise<CodePattern[]> {
    const patterns: CodePattern[] = [];
    
    // Extract existing code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let id = 1;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || targetLanguage;
      const code = match[2].trim();
      
      if (code && (language === targetLanguage || !match[1])) {
        patterns.push({
          id: `extracted-${id++}`,
          name: `Extracted ${language} code`,
          description: `Code block extracted from source content`,
          language: targetLanguage,
          category: 'extracted',
          tags: ['extracted', language],
          complexity: 'simple',
          template: code,
          variables: {}
        });
      }
    }

    // Use AI to identify patterns in text
    if (patterns.length === 0) {
      const aiPatterns = await this.identifyPatternsWithAI(content, targetLanguage);
      patterns.push(...aiPatterns);
    }

    return patterns;
  }

  /**
   * Generate code from a pattern using templates and AI
   */
  private async generateCodeFromPattern(
    pattern: CodePattern, 
    context: TransformationContext
  ): Promise<GeneratedCode | null> {
    try {
      // Try template-based generation first
      if (pattern.template) {
        const templateResult = await this.templateEngine.processPattern(
          pattern, 
          context.customVariables || {}
        );
        
        if (templateResult) {
          return {
            language: context.targetLanguage,
            filename: this.generateFilename(pattern.name, context.targetLanguage),
            content: templateResult,
            description: pattern.description,
            dependencies: this.extractDependencies(templateResult, context.targetLanguage),
            instructions: [`Generated from pattern: ${pattern.name}`]
          };
        }
      }

      // Fallback to AI generation
      return await this.generateWithAI(pattern, context);

    } catch (error) {
      console.error('Error generating code from pattern:', error);
      return null;
    }
  }

  /**
   * Transform content using AI when no patterns are found
   */
  private async transformWithAI(context: TransformationContext): Promise<GeneratedCode | null> {
    try {
      const prompt = this.buildTransformationPrompt(context);
      const aiResponse = await this.aiProvider.summarizeContent(prompt, 2000);
      
      if (!aiResponse || aiResponse.trim().length === 0) {
        console.error('Empty AI response received');
        return null;
      }
      
      // Parse AI response to extract code
      const codeMatch = aiResponse.match(/```[\w]*\n([\s\S]*?)```/);
      if (codeMatch) {
        const code = codeMatch[1].trim();
        
        return {
          language: context.targetLanguage,
          filename: this.generateFilename('ai-generated', context.targetLanguage),
          content: code,
          description: 'AI-generated code from content analysis',
          dependencies: this.extractDependencies(code, context.targetLanguage),
          instructions: ['Generated using AI analysis of source content']
        };
      }

      // If no code block found, try to use the entire response as code
      const cleanResponse = aiResponse.trim();
      if (cleanResponse.length > 10) {
        return {
          language: context.targetLanguage,
          filename: this.generateFilename('ai-generated', context.targetLanguage),
          content: cleanResponse,
          description: 'AI-generated code from content analysis',
          dependencies: this.extractDependencies(cleanResponse, context.targetLanguage),
          instructions: ['Generated using AI analysis of source content', 'May need formatting adjustments']
        };
      }

      return null;
    } catch (error) {
      console.error('Error with AI transformation:', error);
      return null;
    }
  }

  /**
   * Use AI to identify code patterns in text content
   */
  private async identifyPatternsWithAI(content: string, targetLanguage: string): Promise<CodePattern[]> {
    try {
      const prompt = `
Analyze the following content and identify code patterns that could be implemented in ${targetLanguage}:

${content}

Extract any:
- Configuration examples
- API usage patterns  
- Architecture descriptions
- Setup instructions
- Command sequences

Return a JSON array of patterns with structure:
{
  "name": "pattern name",
  "description": "what this pattern does",
  "category": "config|api|architecture|setup|command",
  "complexity": "simple|moderate|complex",
  "codeHint": "brief code example or pseudocode"
}
`;

      const aiResponse = await this.aiProvider.summarizeContent(prompt, 1500);
      
      // Try to parse JSON response
      try {
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsedPatterns = JSON.parse(jsonMatch[0]);
          return parsedPatterns.map((p: any, index: number) => ({
            id: `ai-pattern-${index + 1}`,
            name: p.name || 'AI identified pattern',
            description: p.description || 'Pattern identified by AI',
            language: targetLanguage,
            category: p.category || 'general',
            tags: ['ai-generated', targetLanguage],
            complexity: p.complexity || 'simple',
            template: p.codeHint || '',
            variables: {}
          }));
        }
      } catch (parseError) {
        console.error('Error parsing AI pattern response:', parseError);
      }

      return [];
    } catch (error) {
      console.error('Error identifying patterns with AI:', error);
      return [];
    }
  }

  /**
   * Generate code using AI for a specific pattern
   */
  private async generateWithAI(
    pattern: CodePattern, 
    context: TransformationContext
  ): Promise<GeneratedCode | null> {
    try {
      const prompt = `
Generate ${context.targetLanguage} code for the following pattern:

Pattern: ${pattern.name}
Description: ${pattern.description}
Category: ${pattern.category}
${context.targetFramework ? `Framework: ${context.targetFramework}` : ''}
${context.projectType ? `Project Type: ${context.projectType}` : ''}

Template/Hint: ${pattern.template}

Requirements:
- Write clean, production-ready code
- Include necessary imports and dependencies
- Add appropriate comments
- Follow ${context.targetLanguage} best practices
${context.targetFramework ? `- Use ${context.targetFramework} conventions` : ''}

Return only the code, no explanations.
`;

      const aiResponse = await this.aiProvider.summarizeContent(prompt, 1500);
      
      // Extract code from response
      const codeMatch = aiResponse.match(/```[\w]*\n([\s\S]*?)```/);
      const code = codeMatch ? codeMatch[1].trim() : aiResponse.trim();
      
      if (code && code.length > 10) {
        return {
          language: context.targetLanguage,
          filename: this.generateFilename(pattern.name, context.targetLanguage),
          content: code,
          description: pattern.description,
          dependencies: this.extractDependencies(code, context.targetLanguage),
          instructions: [`Generated from pattern: ${pattern.name}`, 'Review and test before use']
        };
      }

      return null;
    } catch (error) {
      console.error('Error generating code with AI:', error);
      return null;
    }
  }

  /**
   * Build transformation prompt for AI
   */
  private buildTransformationPrompt(context: TransformationContext): string {
    return `
Convert the following ${context.sourceType} content into ${context.targetLanguage} code:

${context.sourceContent}

Requirements:
- Generate working, executable code
- Include necessary imports and setup
- Add helpful comments
- Follow ${context.targetLanguage} best practices
${context.targetFramework ? `- Use ${context.targetFramework} framework` : ''}
${context.projectType ? `- Structure for ${context.projectType} project` : ''}

Focus on practical implementation that a developer can use immediately.
`;
  }

  /**
   * Generate appropriate filename for the code
   */
  private generateFilename(name: string | undefined, language: string | undefined): string {
    const safeName = name || 'generated-code';
    const safeLanguage = language || 'text';
    const cleanName = safeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const extensions: Record<string, string> = {
      'typescript': '.ts',
      'javascript': '.js',
      'python': '.py',
      'java': '.java',
      'csharp': '.cs',
      'go': '.go',
      'rust': '.rs',
      'php': '.php',
      'ruby': '.rb',
      'shell': '.sh',
      'bash': '.sh',
      'yaml': '.yml',
      'json': '.json',
      'dockerfile': 'Dockerfile'
    };
    
    return cleanName + (extensions[safeLanguage.toLowerCase()] || '.txt');
  }

  /**
   * Extract dependencies from generated code
   */
  private extractDependencies(code: string, language: string | undefined): string[] {
    const dependencies: string[] = [];
    const safeLanguage = language || 'text';
    
    // Language-specific dependency extraction
    switch (safeLanguage.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        const importMatches = code.match(/import.*from ['"]([^'"]+)['"]/g);
        if (importMatches) {
          importMatches.forEach(match => {
            const dep = match.match(/from ['"]([^'"]+)['"]/)?.[1];
            if (dep && !dep.startsWith('.') && !dep.startsWith('/')) {
              dependencies.push(dep);
            }
          });
        }
        
        const requireMatches = code.match(/require\(['"]([^'"]+)['"]\)/g);
        if (requireMatches) {
          requireMatches.forEach(match => {
            const dep = match.match(/require\(['"]([^'"]+)['"]\)/)?.[1];
            if (dep && !dep.startsWith('.') && !dep.startsWith('/')) {
              dependencies.push(dep);
            }
          });
        }
        break;
        
      case 'python':
        const pythonImports = code.match(/(?:from|import)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g);
        if (pythonImports) {
          pythonImports.forEach(match => {
            const dep = match.replace(/(?:from|import)\s+/, '').split('.')[0];
            if (dep && !['os', 'sys', 'json', 'time', 'datetime'].includes(dep)) {
              dependencies.push(dep);
            }
          });
        }
        break;
    }
    
    // Remove duplicates using Array.from instead of spread
    return Array.from(new Set(dependencies));
  }
}
