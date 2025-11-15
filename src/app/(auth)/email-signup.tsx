import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function EmailSignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email');
      return;
    }

    try {
      setLoading(true);

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Send OTP via email
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase(), otp }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send OTP');
      }

      // Navigate to OTP verification
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { 
          email: email.toLowerCase(), 
          password,
          otp, // Pass OTP for verification
        },
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-6">
      {/* Header */}
      <View className="mt-4 mb-8">
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-primary-500 text-base">← Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-serif-bold text-neutral-900 mb-2">
          Create Account
        </Text>
        <Text className="text-base text-neutral-600">
          Sign up with your email to get started
        </Text>
      </View>

      {/* Form */}
      <View className="gap-4">
        <View>
          <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
            Email Address
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 text-base"
          />
        </View>

        <View>
          <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 text-base"
          />
        </View>

        <Text className="text-xs text-neutral-500 mt-2">
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>

      {/* Spacer */}
      <View className="flex-1" />

      {/* Sign Up Button */}
      <View className="pb-8">
        <TouchableOpacity
          onPress={handleSignup}
          disabled={loading}
          className="bg-primary-500 rounded-xl h-14 items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-base font-sans-semibold">
              Create Account
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

