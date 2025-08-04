/**
 * MCP Tools for Offline Content Management
 * 
 * Provides tools for syncing, searching, and managing offline wiki content.
 */

export const offlineTools = [
  {
    name: 'sync_all_wikis',
    description: 'Sync all configured wiki sources for offline access',
    inputSchema: {
      type: 'object',
      properties: {
        forceFullSync: {
          type: 'boolean',
          description: 'Force a full re-sync of all content, ignoring cache',
          default: false
        }
      }
    }
  },
  {
    name: 'sync_wiki_source',
    description: 'Sync a specific wiki source for offline access',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the wiki source to sync'
        },
        forceFullSync: {
          type: 'boolean',
          description: 'Force a full re-sync of content, ignoring cache',
          default: false
        }
      },
      required: ['url']
    }
  },
  {
    name: 'search_offline',
    description: 'Search offline cached wiki content',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for offline content'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10
        },
        wikiSource: {
          type: 'string',
          description: 'Filter results by specific wiki source (optional)'
        },
        contentType: {
          type: 'string',
          description: 'Filter results by content type (optional)'
        },
        fuzzyTolerance: {
          type: 'number',
          description: 'Fuzzy search tolerance (0-1, where 0 is exact match)',
          default: 0.3
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_offline_stats',
    description: 'Get statistics about offline content storage',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_sync_status',
    description: 'Get synchronization status for all wiki sources',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'check_offline_availability',
    description: 'Check if specific content is available offline',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to check for offline availability'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'cleanup_offline_content',
    description: 'Clean up old or expired offline content',
    inputSchema: {
      type: 'object',
      properties: {
        maxAgeHours: {
          type: 'number',
          description: 'Maximum age in hours for content to keep (default: 720 hours = 30 days)',
          default: 720
        }
      }
    }
  },
  {
    name: 'start_auto_sync',
    description: 'Start automatic background syncing of wiki content',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'stop_auto_sync',
    description: 'Stop automatic background syncing of wiki content',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'list_offline_content',
    description: 'List all offline content with optional filtering',
    inputSchema: {
      type: 'object',
      properties: {
        wikiSource: {
          type: 'string',
          description: 'Filter by specific wiki source (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of items to return',
          default: 50
        },
        offset: {
          type: 'number',
          description: 'Number of items to skip for pagination',
          default: 0
        }
      }
    }
  }
] as const;

export type OfflineToolName = typeof offlineTools[number]['name'];
