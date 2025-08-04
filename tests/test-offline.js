#!/usr/bin/env node

/**
 * Test script for offline functionality
 */

import { WikiSource } from '../src/sources/wikiSource.js';
import { WikiOfflineIntegration } from '../src/offline/WikiOfflineIntegration.js';
import { logger } from '../src/utils/logger.js';

async function testOfflineMode() {
  console.log('🔄 Testing Offline Mode Implementation...\n');

  try {
    // Initialize WikiSource
    console.log('1. Initializing WikiSource...');
    const wikiSource = new WikiSource();
    console.log('✅ WikiSource initialized\n');

    // Initialize offline integration
    console.log('2. Initializing offline integration...');
    const offlineIntegration = new WikiOfflineIntegration(wikiSource, {
      storageDir: './test-offline-storage',
      autoSync: false,
      maxStorageSize: 100 * 1024 * 1024 // 100MB for testing
    });

    await offlineIntegration.initialize();
    console.log('✅ Offline integration initialized\n');

    // Test online content retrieval
    console.log('3. Testing online content retrieval...');
    const onlineResults = await offlineIntegration.getContentWithOfflineFallback('nodejs setup guide');
    console.log(`✅ Retrieved ${onlineResults.length} online results\n`);

    if (onlineResults.length > 0) {
      console.log('Sample online result:');
      console.log(`- Title: ${onlineResults[0].title}`);
      console.log(`- Source: ${onlineResults[0].source}`);
      console.log(`- Content length: ${onlineResults[0].content?.length || 0} characters\n`);
    }

    // Test syncing
    console.log('4. Testing sync functionality...');
    const wikiDetails = wikiSource.getWikiSourceDetails();
    
    if (wikiDetails.length > 0) {
      const firstWiki = wikiDetails[0];
      console.log(`Syncing wiki source: ${firstWiki.name} (${firstWiki.url})`);
      
      try {
        const syncStatus = await offlineIntegration.syncWikiSource(firstWiki.url);
        console.log(`✅ Sync completed: ${syncStatus.itemsSynced} items synced`);
        
        if (syncStatus.errors && syncStatus.errors.length > 0) {
          console.log(`⚠️  Sync had ${syncStatus.errors.length} errors`);
        }
      } catch (syncError) {
        console.log(`⚠️  Sync failed: ${syncError}`);
      }
    } else {
      console.log('⚠️  No wiki sources configured for syncing');
    }
    console.log();

    // Test offline search
    console.log('5. Testing offline search...');
    try {
      const offlineResults = await offlineIntegration.offlineManager?.search({
        query: 'configuration',
        limit: 5,
        includeContent: true
      }) || [];
      
      console.log(`✅ Found ${offlineResults.length} offline results for 'configuration'`);
      
      if (offlineResults.length > 0) {
        console.log('Sample offline result:');
        const sample = offlineResults[0];
        console.log(`- Title: ${sample.content.title}`);
        console.log(`- Score: ${sample.score.toFixed(3)}`);
        console.log(`- Content length: ${sample.content.content.length} characters`);
      }
    } catch (searchError) {
      console.log(`⚠️  Offline search failed: ${searchError}`);
    }
    console.log();

    // Test availability check
    console.log('6. Testing offline availability check...');
    if (wikiDetails.length > 0) {
      const firstWiki = wikiDetails[0];
      const isAvailable = await offlineIntegration.isAvailableOffline(firstWiki.url);
      console.log(`✅ Content availability for ${firstWiki.name}: ${isAvailable ? 'Available' : 'Not available'}`);
    }
    console.log();

    // Test storage statistics
    console.log('7. Testing storage statistics...');
    const stats = await offlineIntegration.getOfflineStats();
    if (stats) {
      console.log('✅ Storage statistics:');
      console.log(`- Total items: ${stats.totalItems}`);
      console.log(`- Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
      console.log(`- Sources: ${stats.sources}`);
      console.log(`- Health: ${stats.health}`);
    } else {
      console.log('⚠️  No storage statistics available');
    }
    console.log();

    // Test fallback behavior
    console.log('8. Testing offline fallback behavior...');
    try {
      // Try a query that might not have online results
      const fallbackResults = await offlineIntegration.getContentWithOfflineFallback('very specific test query 12345');
      console.log(`✅ Fallback test completed: ${fallbackResults.length} results`);
      
      if (fallbackResults.length > 0) {
        const hasOfflineSources = fallbackResults.some(r => r.source === 'offline' || r.source === 'offline-fallback');
        console.log(`- Contains offline results: ${hasOfflineSources}`);
      }
    } catch (fallbackError) {
      console.log(`⚠️  Fallback test failed: ${fallbackError}`);
    }
    console.log();

    // Test cleanup
    console.log('9. Testing content cleanup...');
    try {
      const cleanedCount = await offlineIntegration.cleanup(1); // Clean content older than 1ms (everything)
      console.log(`✅ Cleanup completed: ${cleanedCount} items removed`);
    } catch (cleanupError) {
      console.log(`⚠️  Cleanup failed: ${cleanupError}`);
    }
    console.log();

    // Cleanup
    console.log('10. Cleaning up test environment...');
    await offlineIntegration.shutdown();
    console.log('✅ Offline integration shut down\n');

    console.log('🎉 Offline mode testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Offline mode testing failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the test
testOfflineMode();
