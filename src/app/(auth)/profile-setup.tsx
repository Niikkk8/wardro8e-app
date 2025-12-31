import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
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
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  const genderOptions = [
    { value: 'woman', label: 'Woman' },
    { value: 'man', label: 'Man' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ];

  const selectedGenderLabel = genderOptions.find(opt => opt.value === gender)?.label || '';

  const handleContinue = async () => {
    if (!fullName) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user found');

      // Upsert user profile (creates if doesn't exist, updates if does)
      // This handles both email signup users (who have a profile) and OAuth users (who might not)
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          birthday: birthday || null,
          gender: gender || null,
          onboarding_completed: true,
          style_quiz_completed: false,
        }, {
          onConflict: 'id',
        });

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
            <View className="items-center pt-8">
              <View className="items-center mb-12">
                <Text className="text-5xl font-serif text-primary-500 text-center mb-2">Wardro8e</Text>
                <Text className="text-xl font-serif-bold text-neutral-900 text-center mb-2">Let's get to know you</Text>
                <Text className="text-sm text-neutral-600 text-center px-4">This helps us personalize your experience</Text>
              </View>
            </View>

            {/* Form - Centered */}
            <View className="flex-1 justify-center w-full max-w-md mx-auto py-8">
              <View className="gap-5 pt-8">
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
                  <TouchableOpacity
                    onPress={() => setShowGenderDropdown(true)}
                    className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 flex-row items-center justify-between"
                  >
                    <Text className={`text-base ${gender ? 'text-neutral-900' : 'text-neutral-400'}`}>
                      {gender ? selectedGenderLabel : 'Select an option'}
                    </Text>
                    <Text className="text-neutral-400 text-lg">▼</Text>
                  </TouchableOpacity>

                  {/* Dropdown Modal */}
                  <Modal
                    visible={showGenderDropdown}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowGenderDropdown(false)}
                  >
                    <View className="flex-1 bg-black/50 justify-end">
                      <TouchableOpacity
                        className="flex-1"
                        activeOpacity={1}
                        onPress={() => setShowGenderDropdown(false)}
                      />
                      <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: Platform.OS === 'ios' ? 34 : 24 }}>
                        <View className="w-12 h-1 bg-neutral-200 rounded-full self-center mb-4" />
                        <Text className="text-lg font-serif-bold text-neutral-900 mb-4 text-center">
                          How do you identify?
                        </Text>
                        <View className="gap-2">
                          {genderOptions.map((option) => (
                            <TouchableOpacity
                              key={option.value}
                              onPress={() => {
                                setGender(option.value);
                                setShowGenderDropdown(false);
                              }}
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
                  </Modal>
                </View>
              </View>
            </View>

            {/* Continue Button */}
            <View className="pt-4">
              <TouchableOpacity
                onPress={handleContinue}
                disabled={loading}
                className="bg-primary-500 rounded-xl h-12 items-center justify-center"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white text-sm font-sans-semibold">
                    Continue
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

