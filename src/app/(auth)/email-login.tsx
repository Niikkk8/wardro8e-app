import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function EmailLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (error) throw error;

      // Check user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user?.id)
        .single();

      if (!profile || !profile.style_quiz_completed) {
        router.replace('/(auth)/style-quiz');
      } else {
        router.replace('/(tabs)');
      }
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
          Welcome Back
        </Text>
        <Text className="text-base text-neutral-600">
          Log in to your account
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
            placeholder="Enter your password"
            secureTextEntry
            className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 text-base"
          />
        </View>
      </View>

      {/* Spacer */}
      <View className="flex-1" />

      {/* Login Button */}
      <View className="pb-8">
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className="bg-primary-500 rounded-xl h-14 items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-base font-sans-semibold">
              Log In
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/email-signup')}
          className="mt-4 items-center"
        >
          <Text className="text-neutral-600 text-sm">
            Don't have an account?{' '}
            <Text className="text-primary-500 font-sans-semibold">Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

