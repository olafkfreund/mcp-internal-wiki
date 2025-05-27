
/**
 * Types and interfaces for content transformation and code generation
 */

export interface CodePattern {
  id: string;
  name: string;
  description: string;
  language: string;
  category: string;
  tags: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  template: string;
  variables: Record<string, PatternVariable>;
}

export interface PatternVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
}

export interface GeneratedCode {
  language: string;
  filename: string;
  content: string;
  description: string;
  dependencies: string[];
  instructions?: string[];
}

export interface ProjectStructure {
  name: string;
  description: string;
  files: GeneratedCode[];
  structure: FileNode[];
  setupInstructions: string[];
  dependencies: Record<string, string>;
}

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}

export interface TransformationContext {
  sourceContent: string;
  sourceType: 'markdown' | 'wiki' | 'documentation' | 'code';
  targetLanguage: string;
  targetFramework?: string;
  projectType?: string;
  customVariables?: Record<string, any>;
}

export interface TransformationResult {
  success: boolean;
  generated: GeneratedCode[];
  errors?: string[];
  warnings?: string[];
  metadata: {
    transformationType: string;
    processingTime: number;
    sourceLinesProcessed: number;
    codeBlocksGenerated: number;
  };
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  framework?: string;
  content: string;
  variables: Record<string, PatternVariable>;
  examples: TemplateExample[];
}

export interface TemplateExample {
  name: string;
  description: string;
  input: Record<string, any>;
  expectedOutput: string;
}

export interface TransformationConfig {
  enabled: boolean;
  maxConcurrentTransformations: number;
  timeoutSeconds: number;
  templates: {
    directory: string;
    autoReload: boolean;
  };
  ai: {
    provider: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  caching: {
    enabled: boolean;
    ttlMinutes: number;
    maxEntries: number;
  };
  validation: {
    syntaxCheck: boolean;
    linting: boolean;
    formatCheck: boolean;
  };
}
