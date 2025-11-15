# Wardro8e React Native Style Guide

*Current styling patterns and design system in use.*

---

## 1. Screen Layout Patterns

### Centered Content Layout (Auth/Onboarding)
```typescript
<SafeAreaView className="flex-1 bg-white">
  <View className="flex-1 justify-between pt-12 px-6 pb-6">
    {/* Header - Fixed at top */}
    <View className="items-center">
      <Text className="text-5xl font-serif text-primary-500">Wardro8e</Text>
    </View>

    {/* Content - Centered, scrollable */}
    <View className="flex-1 justify-center w-full max-w-md mx-auto py-8">
      {/* Form/content */}
    </View>

    {/* Actions - Fixed at bottom */}
    <View className="pt-4">
      {/* Buttons */}
    </View>
  </View>
</SafeAreaView>
```

### Keyboard-Aware Forms
```typescript
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
      {/* Content */}
    </ScrollView>
  </KeyboardAvoidingView>
</SafeAreaView>
```

**Layout Guidelines:**
- Screen padding: `pt-12 px-6 pb-6`
- Content max-width: `max-w-md` for forms
- Input spacing: `gap-5` (20pt) between form fields
- Button height: `h-12` (48pt) standard

---

## 2. Typography

```typescript
// Brand Logo
'text-5xl font-serif text-primary-500 text-center mb-2'

// Screen Title
'text-xl font-serif-bold text-neutral-900 text-center mb-2'

// Screen Description
'text-sm text-neutral-600 text-center px-4'

// Section Title
'text-2xl font-serif-bold text-neutral-900 mb-2 text-center'

// Button Text
'text-white text-sm font-sans-semibold' // Primary
'text-neutral-700 text-lg font-bold pb-2' // Back arrow (←)

// Input Label
'text-sm text-neutral-700 mb-2 font-sans-medium'
```

---

## 3. Buttons

### Primary Button
```typescript
<TouchableOpacity className="bg-primary-500 rounded-xl h-12 items-center justify-center">
  <Text className="text-white text-sm font-sans-semibold">Button Text</Text>
</TouchableOpacity>
```

### Back Button (Arrow)
```typescript
<TouchableOpacity 
  className="w-12 h-12 border border-neutral-200 rounded-xl items-center justify-center bg-white"
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
  <Text className="text-neutral-700 text-lg font-bold pb-2">←</Text>
</TouchableOpacity>
```

---

## 4. Form Inputs

```typescript
<View className="gap-5">
  <View>
    <Text className="text-sm text-neutral-700 mb-2 font-sans-medium">
      Label
    </Text>
    <TextInput 
      className="bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 text-base"
      placeholder="Placeholder"
    />
  </View>
</View>
```

---

## 5. Grid Layouts

### 2-Column Grid (Selection Pills)
```typescript
const screenWidth = Dimensions.get('window').width;
const pillWidth = (screenWidth - 72) / 2; // padding (24*2) + gap (12) / 2

<View className="flex-row flex-wrap gap-3 w-full">
  {items.map((item) => (
    <TouchableOpacity
      key={item.id}
      style={{ width: pillWidth }}
      className="py-3.5 rounded-full border-2 items-center justify-center"
    >
      <Text numberOfLines={1}>{item.label}</Text>
    </TouchableOpacity>
  ))}
</View>
```

### 4-Column Grid (Color Selection)
```typescript
const screenWidth = Dimensions.get('window').width;
const colorWidth = (screenWidth - 72 - 18) / 4; // 4 columns with gaps

<View className="flex-row flex-wrap gap-3 w-full">
  {colors.map((color) => (
    <TouchableOpacity 
      key={color.id}
      style={{ width: colorWidth, height: colorWidth }}
      className="rounded-full"
    >
      {/* Color circle */}
    </TouchableOpacity>
  ))}
</View>
```

---

## 6. Selection Pills

```typescript
<TouchableOpacity
  className={`py-3.5 rounded-full border-2 items-center justify-center ${
    selected
      ? 'border-primary-500 bg-primary-50'
      : 'border-neutral-200 bg-white'
  }`}
  style={{
    shadowColor: selected ? '#208B84' : '#000',
    shadowOffset: { width: 0, height: selected ? 2 : 1 },
    shadowOpacity: selected ? 0.1 : 0.05,
    shadowRadius: selected ? 4 : 2,
    elevation: selected ? 3 : 1,
  }}
>
  <Text
    className={`text-base ${
      selected
        ? 'text-primary-500 font-sans-semibold'
        : 'text-neutral-700 font-sans-medium'
    }`}
    numberOfLines={1}
  >
    {label}
  </Text>
</TouchableOpacity>
```

---

## 7. Dropdown/Modal Pattern

```typescript
<Modal
  visible={showDropdown}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setShowDropdown(false)}
>
  <View className="flex-1 bg-black/50 justify-end">
    <TouchableOpacity
      className="flex-1"
      activeOpacity={1}
      onPress={() => setShowDropdown(false)}
    />
    <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: Platform.OS === 'ios' ? 34 : 24 }}>
      <View className="w-12 h-1 bg-neutral-200 rounded-full self-center mb-4" />
      {/* Options */}
    </View>
  </View>
</Modal>
```

---

## 8. Onboarding Patterns

### Screen Structure
```typescript
<SafeAreaView className="flex-1 bg-white">
  <View className="flex-1 justify-between pt-20 px-6 pb-6">
    {/* Fixed Header */}
    <View className="items-center relative mb-8">
      <TouchableOpacity className="absolute right-0 top-0">
        <Text className="text-primary-500 text-sm font-sans-semibold">Skip</Text>
      </TouchableOpacity>
      <Text className="text-5xl font-serif text-primary-500">Wardro8e</Text>
    </View>

    {/* Animated Content - Only this transitions */}
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
      {/* Step content */}
    </Animated.View>

    {/* Fixed Footer */}
    <View className="pt-4">
      {/* Progress indicators */}
      {/* Navigation buttons */}
    </View>
  </View>
</SafeAreaView>
```

### Progress Indicators
```typescript
<View className="flex-row gap-2 mb-6 justify-center">
  {steps.map((_, index) => (
    <View
      key={index}
      className={`w-6 h-1 rounded-full ${
        index <= currentStep ? 'bg-primary-500' : 'bg-neutral-200'
      }`}
    />
  ))}
</View>
```

### Content Transition Animation
```typescript
const fadeAnim = useRef(new Animated.Value(1)).current;
const slideAnim = useRef(new Animated.Value(0)).current;

// Fade out and slide
Animated.parallel([
  Animated.timing(fadeAnim, {
    toValue: 0,
    duration: 200,
    useNativeDriver: true,
  }),
  Animated.timing(slideAnim, {
    toValue: -30, // or 30 for opposite direction
    duration: 200,
    useNativeDriver: true,
  }),
]).start(() => {
  // Update content
  setStep(nextStep);
  // Reset and fade in
  slideAnim.setValue(30);
  Animated.parallel([
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
  ]).start();
});
```

### Animated Back Button
```typescript
const backButtonOpacity = useRef(new Animated.Value(0)).current;
const backButtonWidth = useRef(new Animated.Value(0)).current;

// Show button
Animated.parallel([
  Animated.timing(backButtonOpacity, {
    toValue: 1,
    duration: 300,
    useNativeDriver: false,
  }),
  Animated.timing(backButtonWidth, {
    toValue: 48,
    duration: 300,
    useNativeDriver: false,
  }),
]).start();

<Animated.View
  style={{
    opacity: backButtonOpacity,
    width: backButtonWidth,
    overflow: 'hidden',
  }}
>
  <TouchableOpacity className="h-12 border border-neutral-200 rounded-xl items-center justify-center">
    <Text className="text-neutral-700 text-lg font-bold pb-2">←</Text>
  </TouchableOpacity>
</Animated.View>
```

---

## 9. Colors

### Primary
- `primary-500`: `#208B84` (Main brand teal)
- `primary-50`: `#E6F7F5` (Selected backgrounds)

### Neutrals
- `neutral-900`: `#171717` (Primary text)
- `neutral-700`: `#404040` (Labels)
- `neutral-600`: `#525252` (Secondary text)
- `neutral-500`: `#737373` (Muted text)
- `neutral-200`: `#E5E5E5` (Borders)
- `neutral-50`: `#FAFAFA` (Input backgrounds)
- `white`: `#FFFFFF` (Backgrounds)

---

## 10. Shadows

```typescript
// Selected items
{
  shadowColor: '#208B84',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
}

// Unselected items
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
}

// Primary buttons
{
  shadowColor: '#208B84',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
}
```

---

## Quick Reference

### Common Class Combinations

**Screen Container:**
```
'flex-1 justify-between pt-12 px-6 pb-6'
```

**Centered Content:**
```
'flex-1 justify-center w-full max-w-md mx-auto py-8'
```

**Primary Button:**
```
'bg-primary-500 rounded-xl h-12 items-center justify-center'
```

**Input Field:**
```
'bg-neutral-50 border border-neutral-200 rounded-xl h-12 px-4 text-base'
```

**Selection Pill:**
```
'py-3.5 rounded-full border-2 items-center justify-center'
```

---

## Notes

- Using NativeWind v4 for Tailwind-style classes
- Centered content layouts with fixed headers/footers
- Only animate center content, keep navigation fixed
- Grid systems: 2-column for selections, 4-column for colors
- Consistent spacing: `pt-12 px-6 pb-6` for screens, `gap-5` for form fields
