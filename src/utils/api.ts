import Constants from 'expo-constants';

/**
 * Get the base URL for API routes
 * In development, uses the Metro bundler dev server
 * In production, uses the production URL
 */
export function getApiBaseUrl(): string {
  if (__DEV__) {
    // In development, use the Metro bundler dev server
    // Try to get the host from expo config, fallback to localhost
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const [host] = hostUri.split(':');
      return `http://${host}:8081`;
    }
    // Fallback for when hostUri is not available
    return 'http://localhost:8081';
  }
  
  // In production, use the production URL
  return 'https://wardro8e.app';
}