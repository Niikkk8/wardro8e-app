import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';

const TAB_BAR_BASE_HEIGHT = Platform.OS === 'ios' ? 84 : 64;
const TAB_BAR_TOP_PADDING = 8;
const TAB_BAR_EXTRA_BOTTOM = Platform.OS === 'ios' ? 24 : 8;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarBottomPadding = TAB_BAR_EXTRA_BOTTOM + insets.bottom;
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: theme.colors.neutral[400],
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: tabBarBottomPadding,
          paddingTop: TAB_BAR_TOP_PADDING,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: theme.colors.neutral[200],
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: typography.fontFamily.sans.medium,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: 'Wardrobe',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

