/**
 * Development Tools
 * 
 * These utilities are only available in development mode.
 * Use them for testing and debugging.
 * 
 * Usage:
 * 1. Open React Native Debugger or Metro console
 * 2. Type: window.resetStorage()
 * 3. Or shake device → Dev Menu → "Reset Storage"
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: '@wardro8e:onboarding_completed',
  USER_TOKEN: '@wardro8e:user_token',
};

/**
 * Reset all app storage
 */
export async function resetAppStorage(): Promise<void> {
  try {
    console.log('🔄 [DEV] Resetting app storage...');
    
    const allKeys = await AsyncStorage.getAllKeys();
    const wardro8eKeys = allKeys.filter(key => key.startsWith('@wardro8e:'));
    
    if (wardro8eKeys.length === 0) {
      console.log('✅ [DEV] No storage keys found. Already clean.');
      return;
    }

    await AsyncStorage.multiRemove(wardro8eKeys);
    
    console.log(`✅ [DEV] Removed ${wardro8eKeys.length} storage key(s):`);
    wardro8eKeys.forEach(key => console.log(`   - ${key}`));
    console.log('📱 [DEV] Storage reset complete! Restart app to see onboarding.');
    
  } catch (error) {
    console.error('❌ [DEV] Error resetting storage:', error);
    throw error;
  }
}

/**
 * Reset only onboarding (keeps auth session)
 */
export async function resetOnboardingOnly(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    console.log('✅ [DEV] Onboarding reset. Will show onboarding on next launch.');
  } catch (error) {
    console.error('❌ [DEV] Error resetting onboarding:', error);
    throw error;
  }
}

/**
 * Show current storage status
 */
export async function showStorageStatus(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const wardro8eKeys = allKeys.filter(key => key.startsWith('@wardro8e:'));
    
    console.log('\n📱 [DEV] Current Storage Status:');
    console.log(`   Total keys: ${wardro8eKeys.length}`);
    
    if (wardro8eKeys.length > 0) {
      console.log('\n   Keys:');
      for (const key of wardro8eKeys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`   - ${key}: ${value}`);
      }
    } else {
      console.log('   No storage keys found.');
    }
    console.log('');
    
  } catch (error) {
    console.error('❌ [DEV] Error reading storage:', error);
  }
}

/**
 * Setup global dev functions (only in development)
 */
export function setupDevTools() {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // Make functions available globally for easy access
    if (typeof global !== 'undefined') {
      (global as any).resetStorage = resetAppStorage;
      (global as any).resetOnboarding = resetOnboardingOnly;
      (global as any).showStorage = showStorageStatus;
    }
    
    // Also add to window for browser/React Native Debugger
    if (typeof window !== 'undefined') {
      (window as any).resetStorage = resetAppStorage;
      (window as any).resetOnboarding = resetOnboardingOnly;
      (window as any).showStorage = showStorageStatus;
    }
    
    console.log('\n🛠️  [DEV] Dev tools loaded!');
    console.log('   Available commands:');
    console.log('   - window.resetStorage()     → Reset all storage');
    console.log('   - window.resetOnboarding()  → Reset onboarding only');
    console.log('   - window.showStorage()      → Show storage status');
    console.log('   Or use: resetStorage(), resetOnboarding(), showStorage()');
    console.log('');
  }
}

