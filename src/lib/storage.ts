import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: '@wardro8e:onboarding_completed',
  USER_TOKEN: '@wardro8e:user_token',
} as const;

export const storage = {
  // Onboarding
  async getOnboardingCompleted(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      return value === 'true';
    } catch (error) {
      console.error('Error reading onboarding status:', error);
      return false;
    }
  },

  async setOnboardingCompleted(completed: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, String(completed));
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  },

  // Reset onboarding (for testing)
  async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  },

  // Clear all storage (logout)
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ONBOARDING_COMPLETED,
        STORAGE_KEYS.USER_TOKEN,
      ]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};

