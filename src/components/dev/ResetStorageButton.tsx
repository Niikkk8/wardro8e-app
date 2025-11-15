/**
 * Development Component: Reset Storage Button
 * 
 * Add this to any screen during development to quickly reset storage.
 * Remove before production!
 * 
 * Usage:
 *   import ResetStorageButton from '@/components/dev/ResetStorageButton';
 *   
 *   <ResetStorageButton />
 */

import { View, TouchableOpacity, Text, Alert } from 'react-native';
import { resetAppStorage } from '@/utils/resetStorage';
import { useRouter } from 'expo-router';

export default function ResetStorageButton() {
  const router = useRouter();

  const handleReset = async () => {
    Alert.alert(
      'Reset Storage?',
      'This will clear all local storage and show onboarding on next launch.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAppStorage();
              Alert.alert(
                'Success',
                'Storage reset! Close and reopen the app to see onboarding.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Optionally reload or navigate
                      router.replace('/(onboarding)/welcome');
                    },
                  },
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to reset storage');
            }
          },
        },
      ]
    );
  };

  return (
    <View className="absolute bottom-4 right-4 z-50">
      <TouchableOpacity
        onPress={handleReset}
        className="bg-red-500 px-4 py-2 rounded-lg"
      >
        <Text className="text-white text-xs font-sans-semibold">
          Reset Storage
        </Text>
      </TouchableOpacity>
    </View>
  );
}

