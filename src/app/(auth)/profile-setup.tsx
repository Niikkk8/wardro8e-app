import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);

  const genderOptions = [
    { value: 'woman', label: 'Woman' },
    { value: 'man', label: 'Man' },
    { value: 'non-binary', label: 'Non-binary' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ];

  const handleContinue = async () => {
    if (!fullName) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user found');

      // Update user profile
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          birthday: birthday || null,
          gender: gender || null,
          onboarding_completed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Navigate to style quiz
      router.replace('/(auth)/style-quiz');
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
        <Text className="text-3xl font-serif-bold text-neutral-900 mb-2">
          Let's get to know you
        </Text>
        <Text className="text-base text-neutral-600">
          This helps us personalize your experience
        </Text>
      </View>

      {/* Form */}
      <View className="gap-6">
        {/* Name */}
        <View>
          <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
            Your Name
          </Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your name"
            className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 text-base"
          />
        </View>

        {/* Birthday (Optional) */}
        <View>
          <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
            Birthday (Optional)
          </Text>
          <TextInput
            value={birthday}
            onChangeText={setBirthday}
            placeholder="DD/MM/YYYY"
            className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 text-base"
          />
          <Text className="text-xs text-neutral-500 mt-1">
            We'll send you special birthday offers
          </Text>
        </View>

        {/* Gender */}
        <View>
          <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
            How do you identify?
          </Text>
          <View className="gap-2">
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setGender(option.value)}
                className={`border-2 rounded-xl h-12 items-center justify-center ${
                  gender === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <Text
                  className={`text-base ${
                    gender === option.value
                      ? 'text-primary-500 font-sans-semibold'
                      : 'text-neutral-700'
                  }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Spacer */}
      <View className="flex-1" />

      {/* Continue Button */}
      <View className="pb-8">
        <TouchableOpacity
          onPress={handleContinue}
          disabled={loading}
          className="bg-primary-500 rounded-xl h-14 items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-base font-sans-semibold">
              Continue
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

