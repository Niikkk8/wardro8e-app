#!/usr/bin/env node

/**
 * Reset Storage Script
 * 
 * This script clears AsyncStorage data by clearing Expo's cache.
 * Run directly: node scripts/reset-storage.js
 * Or: npm run reset-storage
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const STORAGE_PATHS = {
  // Expo Go storage location (Android)
  android: path.join(os.homedir(), '.expo', 'android'),
  // Expo Go storage location (iOS)
  ios: path.join(os.homedir(), 'Library', 'Developer', 'CoreSimulator'),
  // Metro bundler cache
  metro: path.join(process.cwd(), '.expo'),
  // Node modules cache
  nodeModules: path.join(process.cwd(), 'node_modules', '.cache'),
};

function deleteDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return false;
  }
  
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error(`Failed to delete ${dirPath}:`, error.message);
    return false;
  }
}

function resetStorage() {
  console.log('\n🔄 Resetting wardro8e app storage...\n');
  
  let deleted = 0;
  
  // Clear Metro bundler cache
  if (deleteDirectory(STORAGE_PATHS.metro)) {
    console.log('✅ Cleared Metro bundler cache (.expo)');
    deleted++;
  }
  
  // Clear node_modules cache
  if (deleteDirectory(STORAGE_PATHS.nodeModules)) {
    console.log('✅ Cleared node_modules cache');
    deleted++;
  }
  
  // Note about device storage
  console.log('\n📱 Note: Device-specific storage (AsyncStorage) cannot be cleared');
  console.log('   from Node.js. To reset device storage:');
  console.log('   1. Uninstall and reinstall the app');
  console.log('   2. Or use the reset utility in the app:');
  console.log('      import { resetAppStorage } from "@/utils/resetStorage";');
  console.log('      await resetAppStorage();\n');
  
  if (deleted > 0) {
    console.log(`✅ Successfully cleared ${deleted} cache directory(ies)`);
    console.log('📱 Restart Expo server: npm start\n');
  } else {
    console.log('✅ No cache directories found (already clean)\n');
  }
}

// Run the script
if (require.main === module) {
  resetStorage();
}

module.exports = { resetStorage };
