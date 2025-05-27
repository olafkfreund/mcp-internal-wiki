
import { Agent } from './Agent';
import { ContentTransformer } from '../transformation/ContentTransformer';
import { TemplateEngine } from '../transformation/TemplateEngine';
import { 
  GeneratedCode, 
  ProjectStructure, 
  CodePattern, 
  FileNode,
  TransformationResult
} from '../transformation/types';
import { AIProvider } from '../ai/aiProvider';

/**
 * Agent responsible for code generation from wiki content
 */
export class CodeGenerationAgent implements Agent {
  name = 'CodeGenerationAgent';
  private contentTransformer: ContentTransformer;
  private templateEngine: TemplateEngine;
  private aiProvider: AIProvider;

  constructor(aiProvider: AIProvider, templateDirectory?: string) {
    this.aiProvider = aiProvider;
    this.templateEngine = new TemplateEngine(templateDirectory);
    this.contentTransformer = new ContentTransformer(aiProvider, this.templateEngine);
  }

  async initialize(): Promise<void> {
    await this.templateEngine.initialize();
    console.log('CodeGenerationAgent initialized');
  }

  async run(...args: any[]): Promise<any> {
    const [action, ...params] = args;
    
    switch (action) {
      case 'generateFromWikiContent':
        return this.generateFromWikiContent(params[0]);
      case 'createBoilerplate':
        return this.createBoilerplate(params[0]);
      case 'transformContent':
        return this.transformContent(params[0]);
      case 'generateProjectStructure':
        return this.generateProjectStructure(params[0]);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Generate code from wiki content
   */
  async generateFromWikiContent(params: {
    wikiContent: string;
    targetLanguage: string;
    framework?: string;
    projectType?: string;
    template?: string;
  }): Promise<GeneratedCode[]> {
    
    const result = await this.contentTransformer.transformMarkdownToCode(
      params.wikiContent,
      params.targetLanguage,
      {
        framework: params.framework,
        projectType: params.projectType,
        customVariables: params.template ? { template: params.template } : undefined
      }
    );

    if (!result.success) {
      throw new Error(`Code generation failed: ${result.errors?.join(', ')}`);
    }

    return result.generated;
  }

  /**
   * Create project boilerplate from patterns
   */
  async createBoilerplate(params: {
    patterns: CodePattern[];
    projectType: string;
    language: string;
    framework?: string;
    projectName?: string;
  }): Promise<ProjectStructure> {
    
    const projectName = params.projectName || 'generated-project';
    const generated: GeneratedCode[] = [];

    // Generate code for each pattern
    for (const pattern of params.patterns) {
      try {
        const result = await this.contentTransformer.transformMarkdownToCode(
          pattern.template,
          params.language,
          {
            framework: params.framework,
            projectType: params.projectType,
            customVariables: { 
              projectName,
              pattern: pattern.name 
            }
          }
        );

        if (result.success) {
          generated.push(...result.generated);
        }
      } catch (error) {
        console.warn(`Failed to generate code for pattern ${pattern.name}:`, error);
      }
    }

    // Generate additional project files
    const additionalFiles = await this.generateProjectFiles(params);
    generated.push(...additionalFiles);

    // Create project structure
    const structure = this.generateFileStructure(generated, params.projectType);
    const dependencies = this.collectDependencies(generated);
    const setupInstructions = this.generateSetupInstructions(params, dependencies);

    return {
      name: projectName,
      description: `Generated ${params.projectType} project in ${params.language}`,
      files: generated,
      structure,
      setupInstructions,
      dependencies
    };
  }

  /**
   * Transform content using AI
   */
  async transformContent(params: {
    content: string;
    sourceType: 'markdown' | 'wiki' | 'documentation' | 'code';
    targetLanguage: string;
    transformationType: 'full-project' | 'single-file' | 'config-only' | 'documentation';
  }): Promise<TransformationResult> {
    
    return await this.contentTransformer.transformMarkdownToCode(
      params.content,
      params.targetLanguage,
      {
        customVariables: {
          sourceType: params.sourceType,
          transformationType: params.transformationType
        }
      }
    );
  }

  /**
   * Generate project structure with files
   */
  async generateProjectStructure(params: {
    projectType: string;
    language: string;
    framework?: string;
    features?: string[];
    projectName?: string;
  }): Promise<ProjectStructure> {
    
    const projectName = params.projectName || 'new-project';
    
    // Create basic project structure prompt
    const prompt = this.buildProjectStructurePrompt(params);
    
    try {
      const aiResponse = await this.aiProvider.summarizeContent(prompt, 2000);
      
      // Parse AI response to extract project structure
      const generated = await this.parseProjectStructureResponse(aiResponse, params);
      
      const structure = this.generateFileStructure(generated, params.projectType);
      const dependencies = this.collectDependencies(generated);
      const setupInstructions = this.generateSetupInstructions(params, dependencies);

      return {
        name: projectName,
        description: `Generated ${params.projectType} project structure`,
        files: generated,
        structure,
        setupInstructions,
        dependencies
      };
      
    } catch (error) {
      console.error('Error generating project structure:', error);
      throw new Error(`Failed to generate project structure: ${error}`);
    }
  }

  /**
   * Generate additional project files (package.json, README, etc.)
   */
  private async generateProjectFiles(params: {
    projectType: string;
    language: string;
    framework?: string;
    projectName?: string;
  }): Promise<GeneratedCode[]> {
    
    const files: GeneratedCode[] = [];
    const projectName = params.projectName || 'generated-project';

    // Generate package.json for Node.js projects
    if (['typescript', 'javascript'].includes(params.language.toLowerCase())) {
      const packageJson = this.generatePackageJson(projectName, params);
      files.push({
        language: 'json',
        filename: 'package.json',
        content: packageJson,
        description: 'Node.js package configuration',
        dependencies: []
      });
    }

    // Generate requirements.txt for Python projects
    if (params.language.toLowerCase() === 'python') {
      files.push({
        language: 'text',
        filename: 'requirements.txt',
        content: this.generateRequirementsTxt(params),
        description: 'Python dependencies',
        dependencies: []
      });
    }

    // Generate README.md
    const readme = await this.generateReadme(projectName, params);
    files.push({
      language: 'markdown',
      filename: 'README.md',
      content: readme,
      description: 'Project documentation',
      dependencies: []
    });

    // Generate .gitignore
    files.push({
      language: 'text',
      filename: '.gitignore',
      content: this.generateGitignore(params.language),
      description: 'Git ignore file',
      dependencies: []
    });

    return files;
  }

  /**
   * Generate package.json content
   */
  private generatePackageJson(projectName: string, params: any): string {
    const packageData = {
      name: projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      description: `Generated ${params.projectType} project`,
      main: params.language === 'typescript' ? 'dist/index.js' : 'src/index.js',
      scripts: {
        ...(params.language === 'typescript' ? {
          'build': 'tsc',
          'dev': 'ts-node src/index.ts',
          'start': 'node dist/index.js'
        } : {
          'start': 'node src/index.js',
          'dev': 'nodemon src/index.js'
        }),
        'test': 'jest'
      },
      dependencies: {},
      devDependencies: {
        ...(params.language === 'typescript' ? {
          'typescript': '^5.0.0',
          '@types/node': '^20.0.0',
          'ts-node': '^10.0.0'
        } : {}),
        'jest': '^29.0.0',
        'nodemon': '^3.0.0'
      }
    };

    return JSON.stringify(packageData, null, 2);
  }

  /**
   * Generate requirements.txt content
   */
  private generateRequirementsTxt(params: any): string {
    const requirements = [
      '# Generated requirements.txt',
      '# Add your dependencies here',
      ''
    ];

    if (params.framework) {
      switch (params.framework.toLowerCase()) {
        case 'flask':
          requirements.push('Flask>=2.0.0');
          break;
        case 'django':
          requirements.push('Django>=4.0.0');
          break;
        case 'fastapi':
          requirements.push('fastapi>=0.100.0', 'uvicorn>=0.20.0');
          break;
      }
    }

    return requirements.join('\n');
  }

  /**
   * Generate README.md content
   */
  private async generateReadme(projectName: string, params: any): Promise<string> {
    const prompt = `
Generate a comprehensive README.md for a ${params.projectType} project named "${projectName}" using ${params.language}${params.framework ? ` with ${params.framework}` : ''}.

Include:
- Project description
- Installation instructions
- Usage examples
- Development setup
- Available scripts/commands
- Contributing guidelines
- License information

Make it professional and helpful for developers.
`;

    try {
      const aiResponse = await this.aiProvider.summarizeContent(prompt, 1500);
      return aiResponse;
    } catch (error) {
      // Fallback to basic README
      return `# ${projectName}

Generated ${params.projectType} project using ${params.language}${params.framework ? ` with ${params.framework}` : ''}.

## Installation

\`\`\`bash
# Install dependencies
${params.language === 'python' ? 'pip install -r requirements.txt' : 'npm install'}
\`\`\`

## Usage

\`\`\`bash
# Start the application
${params.language === 'python' ? 'python main.py' : 'npm start'}
\`\`\`

## Development

\`\`\`bash
# Start development server
${params.language === 'python' ? 'python main.py' : 'npm run dev'}
\`\`\`

## License

MIT
`;
    }
  }

  /**
   * Generate .gitignore content
   */
  private generateGitignore(language: string): string {
    const common = [
      '# Dependencies',
      'node_modules/',
      '',
      '# Build outputs',
      'dist/',
      'build/',
      '',
      '# Environment files',
      '.env',
      '.env.local',
      '',
      '# IDE files',
      '.vscode/',
      '.idea/',
      '*.swp',
      '*.swo',
      '',
      '# OS files',
      '.DS_Store',
      'Thumbs.db'
    ];

    switch (language.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        return [...common, '', '# TypeScript', '*.tsbuildinfo'].join('\n');
      case 'python':
        return [
          '# Python',
          '__pycache__/',
          '*.py[cod]',
          '*.so',
          '.Python',
          'venv/',
          '.venv/',
          'env/',
          '.env/',
          '',
          ...common
        ].join('\n');
      default:
        return common.join('\n');
    }
  }

  /**
   * Build project structure prompt for AI
   */
  private buildProjectStructurePrompt(params: any): string {
    return `Generate a complete project structure for a ${params.projectType} application using ${params.language}${params.framework ? ` with ${params.framework}` : ''}.

${params.content ? `Project requirements:\n${params.content}\n` : ''}
${params.features ? `Features to include: ${params.features.join(', ')}` : ''}

Provide:
1. Main application files with basic implementation
2. Configuration files (package.json, tsconfig.json, etc.)
3. Test files with sample tests
4. Documentation (README.md)

Focus on best practices and production-ready structure.
Generate actual code content for each file, not just file names.

IMPORTANT: Your response MUST be valid JSON. Format your response as a JSON array containing objects with this exact structure:
[
  {
    "filename": "path/to/file.ext",
    "content": "actual file content here - escape quotes properly",
    "description": "what this file does"
  }
]

Rules for JSON:
- Use double quotes for all strings
- Escape any quotes inside content with \"
- No trailing commas
- No comments in JSON
- Keep content concise but functional

Return ONLY the JSON array, no other text or formatting.`;
  }

  /**
   * Parse AI response for project structure
   */
  private async parseProjectStructureResponse(
    response: string, 
    params: any
  ): Promise<GeneratedCode[]> {
    const generated: GeneratedCode[] = [];

    try {
      // Debug: Log the AI response to understand what we're getting
      console.error('[DEBUG] AI Response length:', response.length);
      console.error('[DEBUG] AI Response preview:', response.substring(0, 200) + '...');

      let jsonString = '';
      
      // Try to extract JSON from markdown code blocks first
      const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
        console.error('[DEBUG] Extracted from code block:', jsonString.substring(0, 200) + '...');
      } else {
        // Try to find JSON array pattern
        const arrayMatch = response.match(/\[[\s\S]*?\]/);
        if (arrayMatch) {
          jsonString = arrayMatch[0];
          console.error('[DEBUG] Extracted array pattern:', jsonString.substring(0, 200) + '...');
        } else {
          // Try to find JSON object pattern
          const objectMatch = response.match(/\{[\s\S]*?\}/);
          if (objectMatch) {
            jsonString = objectMatch[0];
            console.error('[DEBUG] Extracted object pattern:', jsonString.substring(0, 200) + '...');
          }
        }
      }
      
      if (jsonString) {
        console.error('[DEBUG] Attempting to parse JSON of length:', jsonString.length);
        
        // Use a more lenient parsing approach
        let files;
        try {
          // First try direct parsing
          files = JSON.parse(jsonString);
        } catch (firstError) {
          console.error('[DEBUG] Direct parsing failed, trying to fix JSON...');
          
          // Try sanitization first
          const sanitizedJson = this.sanitizeJsonString(jsonString);
          console.error('[DEBUG] Attempting to parse sanitized JSON...');
          
          try {
            files = JSON.parse(sanitizedJson);
          } catch (secondError) {
            console.error('[DEBUG] Sanitized parsing failed, trying line-by-line reconstruction...');
            
            // Try to fix the JSON by parsing it more carefully
            try {
              // Split into lines and reconstruct JSON with proper escaping
              const lines = jsonString.split('\n');
              let inContentField = false;
              let currentContent = '';
              let fixedLines: string[] = [];
              
              for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                
                // Check if we're starting a content field
                if (line.includes('"content":')) {
                  inContentField = true;
                  const contentStart = line.indexOf('"content":');
                  const beforeContent = line.substring(0, contentStart + '"content":'.length);
                  const afterContent = line.substring(contentStart + '"content":'.length).trim();
                  
                  if (afterContent.startsWith('"')) {
                    // Content starts on same line
                    currentContent = afterContent.substring(1); // Remove opening quote
                    fixedLines.push(beforeContent + ' "');
                  } else {
                    fixedLines.push(line);
                  }
                } else if (inContentField) {
                  // We're inside a content field
                  if (line.includes('",') || line.includes('"}}') || line.includes('"}]')) {
                    // End of content field
                    inContentField = false;
                    const endIndex = line.indexOf('"');
                    if (endIndex >= 0) {
                      currentContent += '\\n' + line.substring(0, endIndex);
                      const escapedContent = currentContent
                        .replace(/\\/g, '\\\\')
                        .replace(/"/g, '\\"');
                      fixedLines.push(escapedContent + line.substring(endIndex));
                    } else {
                      fixedLines.push(line);
                    }
                    currentContent = '';
                  } else {
                    // Continue accumulating content
                    currentContent += '\\n' + line;
                  }
                } else {
                  // Normal JSON line
                  fixedLines.push(line);
                }
              }
              
              const fixedJson = fixedLines.join('\n');
              console.error('[DEBUG] Attempting to parse fixed JSON...');
              files = JSON.parse(fixedJson);
              
            } catch (thirdError) {
              // Last resort: try eval (dangerous but controlled environment)
              console.error('[DEBUG] JSON parsing still failed, trying eval as last resort...');
              try {
                files = eval('(' + jsonString + ')');
              } catch (evalError) {
                throw firstError; // Throw the original error
              }
            }
          }
        }
        
        // Handle both array and object responses
        const fileList = Array.isArray(files) ? files : [files];
        
        for (const file of fileList) {
          if (file && file.filename && file.content) {
            const extension = file.filename.split('.').pop() || '';
            const language = this.detectLanguageFromExtension(extension);
            
            generated.push({
              language,
              filename: file.filename,
              content: file.content,
              description: file.description || `Generated ${file.filename}`,
              dependencies: file.dependencies || []
            });
          }
        }
        
        console.error('[DEBUG] Successfully parsed', generated.length, 'files from AI response');
      } else {
        console.error('[DEBUG] No JSON pattern found in AI response');
      }
    } catch (parseError: any) {
      console.error('Failed to parse AI project structure response:', parseError);
      console.error('[DEBUG] Parse error details:', parseError.message);
      
      // Log the problematic JSON for debugging
      if (parseError.message.includes('position')) {
        const position = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0');
        console.error('[DEBUG] Error context around position', position + ':');
        console.error('[DEBUG] Before:', response.substring(Math.max(0, position - 50), position));
        console.error('[DEBUG] At error:', response.substring(position, position + 50));
      }
    }

    // If parsing failed, generate basic structure
    if (generated.length === 0) {
      console.error('[DEBUG] Falling back to basic project structure');
      generated.push(...await this.generateBasicProjectStructure(params));
    }

    return generated;
  }

  /**
   * Sanitize JSON string to fix common formatting issues
   */
  private sanitizeJsonString(jsonString: string): string {
    // Remove trailing commas before closing brackets/braces
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Enhanced handling for content fields with unescaped newlines
    // This regex is more robust for multiline content
    jsonString = jsonString.replace(/"(content|description)":\s*"((?:[^"\\]|\\.|[\r\n])*)"/gs, (match, fieldName, content) => {
      // Escape all problematic characters properly
      const escapedContent = content
        .replace(/\\/g, '\\\\')        // Escape backslashes first
        .replace(/"/g, '\\"')          // Escape quotes
        .replace(/\n/g, '\\n')         // Escape newlines
        .replace(/\r/g, '\\r')         // Escape carriage returns
        .replace(/\t/g, '\\t')         // Escape tabs
        .replace(/\f/g, '\\f')         // Escape form feeds
        .replace(/\b/g, '\\b')         // Escape backspaces
        .replace(/\${/g, '\\${');      // Escape template literal syntax
      
      return `"${fieldName}": "${escapedContent}"`;
    });
    
    // Handle any remaining string fields with unescaped characters
    jsonString = jsonString.replace(/"([^"]*?[\n\r\t][^"]*?)"/gs, (match, content) => {
      const escapedContent = content
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      return `"${escapedContent}"`;
    });
    
    // Remove any non-JSON text at the beginning or end
    jsonString = jsonString.trim();
    
    // Ensure it starts with [ or {
    const startIndex = Math.max(jsonString.indexOf('['), jsonString.indexOf('{'));
    if (startIndex > 0) {
      jsonString = jsonString.substring(startIndex);
    }
    
    // Ensure it ends with ] or }
    const lastBracket = Math.max(jsonString.lastIndexOf(']'), jsonString.lastIndexOf('}'));
    if (lastBracket > 0 && lastBracket < jsonString.length - 1) {
      jsonString = jsonString.substring(0, lastBracket + 1);
    }
    
    return jsonString;
  }

  /**
   * Generate basic project structure as fallback
   */
  private async generateBasicProjectStructure(params: any): Promise<GeneratedCode[]> {
    const files: GeneratedCode[] = [];

    // Main application file
    const mainContent = this.generateMainFile(params);
    files.push({
      language: params.language,
      filename: `src/index.${this.getFileExtension(params.language)}`,
      content: mainContent,
      description: 'Main application entry point',
      dependencies: []
    });

    return files;
  }

  /**
   * Generate main application file content
   */
  private generateMainFile(params: any): string {
    switch (params.language.toLowerCase()) {
      case 'typescript':
        return `/**
 * Main application entry point
 */
console.log('Hello from ${params.projectName || 'generated project'}!');

export {};
`;
      case 'javascript':
        return `/**
 * Main application entry point
 */
console.log('Hello from ${params.projectName || 'generated project'}!');
`;
      case 'python':
        return `"""
Main application entry point
"""

def main():
    print("Hello from ${params.projectName || 'generated project'}!")

if __name__ == "__main__":
    main()
`;
      default:
        return `// Main application file
// TODO: Implement application logic
`;
    }
  }

  /**
   * Detect language from file extension
   */
  private detectLanguageFromExtension(extension: string): string {
    const mapping: Record<string, string> = {
      'ts': 'typescript',
      'js': 'javascript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'sh': 'shell',
      'yml': 'yaml',
      'yaml': 'yaml',
      'json': 'json',
      'md': 'markdown',
      'txt': 'text'
    };
    
    return mapping[extension.toLowerCase()] || 'text';
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: string): string {
    const mapping: Record<string, string> = {
      'typescript': 'ts',
      'javascript': 'js',
      'python': 'py',
      'java': 'java',
      'csharp': 'cs',
      'go': 'go',
      'rust': 'rs',
      'php': 'php',
      'ruby': 'rb',
      'shell': 'sh'
    };
    
    return mapping[language.toLowerCase()] || 'txt';
  }

  /**
   * Generate file structure tree
   */
  private generateFileStructure(files: GeneratedCode[], projectType: string): FileNode[] {
    const structure: FileNode[] = [];
    const directories = new Set<string>();

    // Collect all directories
    for (const file of files) {
      const parts = file.filename.split('/');
      let currentPath = '';
      
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath += (currentPath ? '/' : '') + parts[i];
        directories.add(currentPath);
      }
    }

    // Create directory nodes
    const dirNodes = new Map<string, FileNode>();
    for (const dir of Array.from(directories).sort()) {
      const parts = dir.split('/');
      const name = parts[parts.length - 1];
      const node: FileNode = {
        name,
        type: 'directory',
        path: dir,
        children: []
      };
      dirNodes.set(dir, node);
    }

    // Create file nodes
    for (const file of files) {
      const parts = file.filename.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');
      
      const fileNode: FileNode = {
        name,
        type: 'file',
        path: file.filename
      };

      if (parentPath && dirNodes.has(parentPath)) {
        dirNodes.get(parentPath)!.children!.push(fileNode);
      } else {
        structure.push(fileNode);
      }
    }

    // Add directory nodes to structure
    for (const [path, node] of dirNodes) {
      if (!path.includes('/')) {
        // Top-level directory
        structure.push(node);
      } else {
        // Nested directory
        const parentPath = path.substring(0, path.lastIndexOf('/'));
        if (dirNodes.has(parentPath)) {
          dirNodes.get(parentPath)!.children!.push(node);
        }
      }
    }

    return structure.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Collect all dependencies from generated files
   */
  private collectDependencies(files: GeneratedCode[]): Record<string, string> {
    const dependencies: Record<string, string> = {};

    for (const file of files) {
      for (const dep of file.dependencies) {
        if (!dependencies[dep]) {
          dependencies[dep] = 'latest'; // Default version
        }
      }
    }

    return dependencies;
  }

  /**
   * Generate setup instructions
   */
  private generateSetupInstructions(params: any, dependencies: Record<string, string>): string[] {
    const instructions: string[] = [];

    instructions.push('# Project Setup Instructions');
    instructions.push('');

    // Clone/download instructions
    instructions.push('1. Clone or download the project files');
    instructions.push('');

    // Dependencies installation
    if (Object.keys(dependencies).length > 0) {
      instructions.push('2. Install dependencies:');
      
      if (['typescript', 'javascript'].includes(params.language.toLowerCase())) {
        instructions.push('   npm install');
      } else if (params.language.toLowerCase() === 'python') {
        instructions.push('   pip install -r requirements.txt');
      }
      instructions.push('');
    }

    // Build instructions
    if (params.language.toLowerCase() === 'typescript') {
      instructions.push('3. Build the project:');
      instructions.push('   npm run build');
      instructions.push('');
    }

    // Run instructions
    instructions.push('4. Start the application:');
    if (['typescript', 'javascript'].includes(params.language.toLowerCase())) {
      instructions.push('   npm start');
    } else if (params.language.toLowerCase() === 'python') {
      instructions.push('   python main.py');
    }
    instructions.push('');

    // Development instructions
    instructions.push('5. For development:');
    if (['typescript', 'javascript'].includes(params.language.toLowerCase())) {
      instructions.push('   npm run dev');
    } else if (params.language.toLowerCase() === 'python') {
      instructions.push('   python main.py');
    }

    return instructions;
  }
}
