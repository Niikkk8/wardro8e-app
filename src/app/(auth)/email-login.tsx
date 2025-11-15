import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
                <Text className="text-xl font-serif-bold text-neutral-900 text-center mb-2">Welcome Back</Text>
                <Text className="text-sm text-neutral-600 text-center px-4">Log in to your account</Text>
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
            placeholder="Enter your password"
            secureTextEntry
            className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 text-base"
          />
        </View>
                <View className="pt-4">
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
                    className="bg-primary-500 rounded-xl h-12 items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
                      <Text className="text-white text-sm font-sans-semibold">
              Log In
            </Text>
          )}
        </TouchableOpacity>
                </View>
              </View>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/email-signup')}
                className="items-center text-center mt-4"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
                <Text className="text-neutral-500 text-sm">Don't have an account? <Text className="text-primary-500 font-sans-semibold">Sign up</Text></Text>
        </TouchableOpacity>
      </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

