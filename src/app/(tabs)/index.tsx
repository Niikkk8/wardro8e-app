import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import MasonryLayout from '../../components/layouts/MasonryLayout';

export default function HomePage() {
  return (
    <SafeAreaView 
      edges={['top']} 
      className="flex-1 bg-white"
    >
      {/* Top Navbar */}
      <View 
        className="flex-row items-center justify-between px-4 py-3 border-b"
        style={{ 
          borderBottomColor: theme.colors.neutral[200],
          backgroundColor: '#FFFFFF',
        }}
      >
        <Text 
          style={{ 
            ...typography.styles.logo,
            color: theme.colors.primary[500],
          }}
        >
          Wardro8e
        </Text>
        
        <View className="flex-row items-center gap-4">
          <TouchableOpacity 
            className="p-2"
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.neutral[700]} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="p-2"
            activeOpacity={0.7}
          >
            <Ionicons name="bag-outline" size={24} color={theme.colors.neutral[700]} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Masonry Content */}
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: theme.spacing.lg }}
      >
        <MasonryLayout />
      </ScrollView>
    </SafeAreaView>
  );
}

