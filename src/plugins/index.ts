/**
 * MCP Internal Wiki Server Plugin System
 * 
 * This module provides a comprehensive plugin architecture for extending
 * the MCP server with custom wiki source adapters.
 */

export * from './types.js';
export * from './PluginManager.js';

// Built-in plugins
export * from './builtin/GitBookPlugin.js';
export * from './builtin/GenericWikiPlugin.js';

// Plugin utilities
export { createPluginTemplate, validatePluginPackage } from './utils.js';
