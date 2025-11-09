import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';

export default function AppSplashScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <View className="items-center gap-4">
        <Text 
          style={{ 
            ...typography.styles.logo,
            fontSize: 36,
            color: theme.colors.primary[500],
          }}
        >
          Wardro8e
        </Text>
        <ActivityIndicator 
          size="small" 
          color={theme.colors.primary[500]} 
        />
      </View>
    </View>
  );
}

