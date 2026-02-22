import { View, Text, TouchableOpacity, Image, Animated, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { storage } from '@/lib/storage';

const formatDate = (date: Date): string => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

export default function AIMatchingScreen() {
  const router = useRouter();
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = async () => {
    // Mark onboarding as completed
    await storage.setOnboardingCompleted(true);
    // Navigate to auth
    router.replace('/(auth)/welcome');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-between pt-20 px-6">
        {/* Header */}
        <View className="items-center">
          <Text className="text-5xl font-serif text-primary-500 text-center mb-2">Wardro8e</Text>
          <Text className="text-sm text-neutral-500 text-center">Curated Fashion Discovery</Text>
        </View>

        {/* Animated Content - Centered */}
        <Animated.View 
          style={{
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}
          className="items-center"
        >
          {/* Image */}
          <View className="w-96 h-64 mb-6 rounded-2xl overflow-hidden bg-neutral-100">
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800&auto=format&fit=crop' }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>

          <Text className="text-xl font-serif-bold text-neutral-900 text-center mb-2">
            Create Style Boards
          </Text>
          <Text className="text-sm text-neutral-600 text-center px-8 leading-5">
            Save your favorites, create wishlists, and share inspiration with friends
          </Text>

          {/* Optional birthday – opens date picker */}
          <View className="w-full max-w-xs mt-8">
            <Text className="text-sm text-neutral-600 mb-2 text-center">Optional: add your birthday for better recommendations</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 flex-row items-center justify-center"
            >
              <Text className={birthday ? 'text-neutral-900 font-sans-medium' : 'text-neutral-400'}>
                {birthday ? formatDate(birthday) : 'Select birthday'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Date picker: Modal on iOS, inline on Android */}
        {Platform.OS === 'ios' ? (
          <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
            <View className="flex-1 bg-black/50 justify-end">
              <TouchableOpacity className="flex-1" activeOpacity={1} onPress={() => setShowDatePicker(false)} />
              <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: Platform.OS === 'ios' ? 34 : 24 }}>
                <View className="w-12 h-1 bg-neutral-200 rounded-full self-center mb-4" />
                <Text className="text-lg font-serif-bold text-neutral-900 mb-4 text-center">Select your birthday</Text>
                <DateTimePicker
                  value={birthday ?? new Date()}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    if (event.type === 'set' && selectedDate) setBirthday(selectedDate);
                  }}
                  style={{ backgroundColor: 'white' }}
                />
                <View className="flex-row gap-3 mt-4">
                  <TouchableOpacity
                    onPress={() => { setBirthday(null); setShowDatePicker(false); }}
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
              value={birthday ?? new Date()}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (event.type === 'set' && selectedDate) setBirthday(selectedDate);
              }}
            />
          )
        )}

        {/* Bottom Actions */}
        <View>
          {/* Progress Indicator */}
          <View className="flex-row gap-2 mb-4 justify-center">
            <View className="w-6 h-1 bg-primary-500 rounded-full" />
            <View className="w-6 h-1 bg-primary-500 rounded-full" />
            <View className="w-6 h-1 bg-primary-500 rounded-full" />
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-12 h-12 border border-neutral-200 rounded-xl items-center justify-center"
            >
              <Text className="text-neutral-700 text-lg font-bold pb-2 items-center">←</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGetStarted}
              className="flex-1 bg-primary-500 rounded-xl h-12 items-center justify-center"
            >
              <Text className="text-white text-sm font-sans-semibold">
                Get Started
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
            onPress={() => router.replace('/(auth)/welcome')}
            className="h-10 items-center justify-center text-center"
          >
            <Text className="text-neutral-500 text-xs">
              Already have an account? <Text className="text-primary-500 font-sans-semibold">Log in</Text>
            </Text>
          </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

