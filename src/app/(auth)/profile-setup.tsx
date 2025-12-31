import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const genderOptions = [
    { value: 'woman', label: 'Woman' },
    { value: 'man', label: 'Man' },
    { value: 'other', label: 'Other' },
    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  ];

  const selectedGenderLabel = genderOptions.find(opt => opt.value === gender)?.label || '';

  // Format date explicitly as DD/MM/YYYY to avoid locale issues
  const formatDateAsDDMMYYYY = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleContinue = async () => {
    if (!fullName) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user found');

      // Get existing profile to preserve avatar_url if it exists
      const { data: existingProfile } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      // Extract avatar URL from OAuth provider metadata if not already stored
      const extractAvatarUrl = (user: any): string | undefined => {
        const metadata = user?.user_metadata || {};
        return metadata.avatar_url || metadata.picture || metadata.picture_url || undefined;
      };
      const oauthAvatarUrl = extractAvatarUrl(user);
      
      // Use existing avatar_url if available, otherwise use OAuth avatar_url
      const avatarUrl = existingProfile?.avatar_url || oauthAvatarUrl;

      // Format birthday as DD/MM/YYYY for storage (explicit formatting to avoid locale issues)
      const formattedBirthday = birthday 
        ? formatDateAsDDMMYYYY(birthday)
        : null;

      // Upsert user profile (creates if doesn't exist, updates if does)
      // This handles both email signup users (who have a profile) and OAuth users (who might not)
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          birthday: formattedBirthday,
          gender: gender || null,
          avatar_url: avatarUrl || null,
          onboarding_completed: true,
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
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 flex-row items-center justify-between"
                  >
                    <Text className={`text-base ${birthday ? 'text-neutral-900' : 'text-neutral-400'}`}>
                      {birthday 
                        ? formatDateAsDDMMYYYY(birthday)
                        : 'DD/MM/YYYY'}
                    </Text>
                    <Text className="text-neutral-400 text-lg">▼</Text>
                  </TouchableOpacity>
                  <Text className="text-xs text-neutral-500 mt-1">
                    We'll send you special birthday offers
                  </Text>
                  
                  {/* Date Picker Modal */}
                  {Platform.OS === 'ios' ? (
                    <Modal
                      visible={showDatePicker}
                      transparent={true}
                      animationType="slide"
                      onRequestClose={() => setShowDatePicker(false)}
                    >
                      <View className="flex-1 bg-black/50 justify-end">
                        <TouchableOpacity
                          className="flex-1"
                          activeOpacity={1}
                          onPress={() => setShowDatePicker(false)}
                        />
                        <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: Platform.OS === 'ios' ? 34 : 24 }}>
                          <View className="w-12 h-1 bg-neutral-200 rounded-full self-center mb-4" />
                          <Text className="text-lg font-serif-bold text-neutral-900 mb-4 text-center">
                            Select Your Birthday
                          </Text>
                          <DateTimePicker
                            value={birthday || new Date()}
                            mode="date"
                            display="spinner"
                            maximumDate={new Date()}
                            onChange={(event, selectedDate) => {
                              if (event.type === 'set' && selectedDate) {
                                setBirthday(selectedDate);
                              }
                            }}
                            style={{ backgroundColor: 'white' }}
                          />
                          <View className="flex-row gap-3 mt-4">
                            <TouchableOpacity
                              onPress={() => {
                                setBirthday(null);
                                setShowDatePicker(false);
                              }}
                              className="flex-1 border-2 border-neutral-200 rounded-xl h-12 items-center justify-center"
                            >
                              <Text className="text-neutral-700 font-sans-medium">Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setShowDatePicker(false)}
                              className="flex-1 bg-primary-500 rounded-xl h-12 items-center justify-center"
                            >
                              <Text className="text-white font-sans-semibold">Done</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </Modal>
                  ) : (
                    showDatePicker && (
                      <DateTimePicker
                        value={birthday || new Date()}
                        mode="date"
                        display="default"
                        maximumDate={new Date()}
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(false);
                          if (event.type === 'set' && selectedDate) {
                            setBirthday(selectedDate);
                          }
                        }}
                      />
                    )
                  )}
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

