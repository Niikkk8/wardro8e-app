import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
      const response = await fetch('/api/send-otp', {
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
    <SafeAreaView className="flex-1 bg-white px-6">
      {/* Header */}
      <View className="mt-4 mb-8">
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-primary-500 text-base">← Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-serif-bold text-neutral-900 mb-2">
          Verify your email
        </Text>
        <Text className="text-base text-neutral-600">
          Enter the 6-digit code sent to {email}
        </Text>
      </View>

      {/* OTP Input */}
      <View className="flex-row justify-between mb-6">
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            value={digit}
            onChangeText={(value) => handleOtpChange(value, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            className="w-12 h-14 bg-neutral-50 border-2 border-neutral-200 rounded-xl text-center text-2xl font-sans-semibold"
            style={{ borderColor: digit ? '#208B84' : '#E5E5E5' }}
            editable={!loading}
          />
        ))}
      </View>

      {/* Resend */}
      <View className="items-center mb-8">
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
        <View className="items-center">
          <ActivityIndicator size="large" color="#208B84" />
          <Text className="text-neutral-600 mt-2">Verifying...</Text>
        </View>
      )}

      {/* Change Email */}
      <View className="flex-1" />
      <View className="pb-8 items-center">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-neutral-600 text-sm">
            Wrong email?{' '}
            <Text className="text-primary-500 font-sans-semibold">Change</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

