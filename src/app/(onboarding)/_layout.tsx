import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none', // Disable default animation since we handle transitions internally
      }}
    />
  );
}

