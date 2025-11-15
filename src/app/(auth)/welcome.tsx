import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function AuthWelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;

      // OAuth window should open automatically
      console.log('OAuth initiated:', data);
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-between py-8 px-6">
        {/* Header */}
        <View className="mt-8">
          <Text className="text-3xl font-serif-bold text-neutral-900 mb-1">
            Welcome to
          </Text>
          <Text className="text-3xl font-serif-bold text-primary-500 mb-3">
            wardro8e
          </Text>
          <Text className="text-sm text-neutral-500">
            Sign up to discover fashion that matches your style
          </Text>
        </View>

        {/* Auth Buttons - Centered */}
        <View className="justify-center">
          {/* Google Sign In */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={loading}
            className="bg-white border border-neutral-300 rounded-xl h-12 flex-row items-center justify-center mb-3"
          >
            <View className="w-4 h-4 mr-2 bg-neutral-100 rounded-full items-center justify-center">
              <Text className="text-xs">G</Text>
            </View>
            <Text className="text-neutral-900 text-sm font-sans-medium">
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-4">
            <View className="flex-1 h-px bg-neutral-200" />
            <Text className="text-neutral-400 text-xs px-3">OR</Text>
            <View className="flex-1 h-px bg-neutral-200" />
          </View>

          {/* Email Sign Up */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/email-signup')}
            className="bg-primary-500 rounded-xl h-12 items-center justify-center"
          >
            <Text className="text-white text-sm font-sans-semibold">
              Continue with Email
            </Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text className="text-neutral-400 text-xs text-center mt-4 px-4 leading-4">
            By continuing, you agree to our{' '}
            <Text className="text-primary-500">Terms</Text> and{' '}
            <Text className="text-primary-500">Privacy Policy</Text>
          </Text>
        </View>

        {/* Bottom Link */}
        <View className="items-center">
          <TouchableOpacity
            onPress={() => router.push('/(auth)/email-login')}
            className="py-2"
          >
            <Text className="text-neutral-600 text-xs">
              Already have an account?{' '}
              <Text className="text-primary-500 font-sans-semibold">Log in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

