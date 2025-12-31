import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getApiBaseUrl } from '@/utils/api';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { email, password, otp: sentOtp } = useLocalSearchParams<{
    email: string;
    password: string;
    otp: string;
  }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all filled
    if (newOtp.every((digit) => digit !== '') && value) {
      verifyOTP(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOTP = async (otpCode: string) => {
    try {
      setLoading(true);

      // Verify OTP matches
      if (otpCode !== sentOtp) {
        Alert.alert('Error', 'Invalid OTP code. Please try again.');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      // Create user account
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
        },
      });

      if (signupError) throw signupError;

      if (!authData.user) throw new Error('Signup failed');

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          onboarding_completed: false,
          style_quiz_completed: false,
        });

      if (profileError) throw profileError;

      // Navigate to profile setup
      router.replace('/(auth)/profile-setup');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    if (resendTimer > 0) return;

    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // Send new OTP via email
      const response = await fetch(`${getApiBaseUrl()}/api/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: newOtp }),
      });

      if (!response.ok) throw new Error('Failed to send OTP');

      Alert.alert('Success', 'A new OTP has been sent to your email');
      setResendTimer(60);

      // Update the router params with new OTP
      router.setParams({ otp: newOtp });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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

          {/* OTP Input - Centered */}
          <View className="flex-1 justify-center items-center">
            <View className="items-center mb-12">
              <Text className="text-5xl font-serif text-primary-500 text-center mb-2">Wardro8e</Text>
              <Text className="text-xl font-serif-bold text-neutral-900 text-center mb-2">Verify your email</Text>
              <Text className="text-sm text-neutral-600 text-center px-4">Enter the 6-digit code sent to {email}</Text>
            </View>
            <View className="flex-row justify-between gap-3 mb-8 w-full max-w-xs">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref: any) => (inputRefs.current[index] = ref)}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  className="flex-1 h-14 bg-neutral-50 border border-neutral-200 rounded-xl text-center text-2xl font-sans-medium"
                  style={{ borderColor: digit ? '#208B84' : '#E5E5E5' }}
                  editable={!loading}
                />
              ))}
            </View>

            {/* Resend */}
            <View className="items-center mb-4">
              {resendTimer > 0 ? (
                <Text className="text-neutral-500 text-sm">
                  Resend code in 00:{resendTimer.toString().padStart(2, '0')}
                </Text>
              ) : (
                <TouchableOpacity onPress={resendOTP}>
                  <Text className="text-primary-500 text-sm font-sans-semibold">
                    Resend Code
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {loading && (
              <View className="items-center mt-4">
                <ActivityIndicator size="large" color="#208B84" />
                <Text className="text-neutral-600 mt-2 text-sm">Verifying...</Text>
              </View>
            )}
          </View>

          {/* Change Email */}
          <View className="pt-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="items-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-neutral-500 text-xs">
                Wrong email?{' '}
                <Text className="text-primary-500 font-sans-semibold">Change</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

