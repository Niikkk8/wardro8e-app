import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View className="flex-1 justify-between pt-12 px-6 pb-6">
      {/* Header */}
            <View className="items-center">
              <TouchableOpacity
                onPress={() => router.back()}
                className="absolute left-0 top-0"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className="text-neutral-700 text-lg font-bold pb-2">←</Text>
        </TouchableOpacity>
      </View>

            {/* Form - Centered */}
            <View className="flex-1 justify-center w-full max-w-md mx-auto py-8">
              <View className="items-center mb-12">
                <Text className="text-5xl font-serif text-primary-500 text-center mb-2">Wardro8e</Text>
                <Text className="text-xl font-serif-bold text-neutral-900 text-center mb-2">Create Account</Text>
                <Text className="text-sm text-neutral-600 text-center px-4 mb-8">Sign up with your email to get started</Text>
              </View>
              <View className="gap-5">
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
                <View className="pt-4">
        <TouchableOpacity
          onPress={handleSignup}
          disabled={loading}
                    className="bg-primary-500 rounded-xl h-12 items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
                      <Text className="text-white text-sm font-sans-semibold">
              Create Account
            </Text>
          )}
        </TouchableOpacity>
      </View>
                <Text className="text-xs text-neutral-500 text-center mt-2">
                  By continuing, you agree to our{' '}
                  <Text className="text-primary-500">Terms</Text> and{' '}
                  <Text className="text-primary-500">Privacy Policy</Text>
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

