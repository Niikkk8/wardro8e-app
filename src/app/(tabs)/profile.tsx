import React from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { typography } from '../../styles/typography';

export default function ProfilePage() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-white">
      <Text style={typography.styles.bodyLarge}>Profile</Text>
    </SafeAreaView>
  );
}

