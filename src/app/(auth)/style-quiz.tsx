import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { preferenceService } from '@/lib/preferenceService';
import { theme } from '@/styles/theme';
import { typography } from '@/styles/typography';

let Haptics: typeof import('expo-haptics') | null = null;
try { Haptics = require('expo-haptics'); } catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 3-col grid: 24px padding × 2 + 8px gap × 2 = 64px overhead
const CHIP_W = Math.floor((SCREEN_WIDTH - 64) / 3);
// 3-col colour: same rhythm
const COLOR_DOT = Math.floor((SCREEN_WIDTH - 64) / 3);

// ── Data ──────────────────────────────────────────────────────────────────────
const styleOptions = [
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'bohemian',   label: 'Bohemian'   },
  { id: 'casual',     label: 'Casual'     },
  { id: 'romantic',   label: 'Romantic'   },
  { id: 'edgy',       label: 'Edgy'       },
  { id: 'classic',    label: 'Classic'    },
  { id: 'streetwear', label: 'Streetwear' },
  { id: 'elegant',    label: 'Elegant'    },
  { id: 'sporty',     label: 'Sporty'     },
] as const;

const colorOptions = [
  { id: 'black',  label: 'Black',  hex: '#111111', border: '#555'    },
  { id: 'white',  label: 'White',  hex: '#FFFFFF', border: '#DDD'    },
  { id: 'navy',   label: 'Navy',   hex: '#1E3A5F', border: '#1E3A5F' },
  { id: 'pink',   label: 'Pink',   hex: '#F472B6', border: '#F472B6' },
  { id: 'red',    label: 'Red',    hex: '#EF4444', border: '#EF4444' },
  { id: 'green',  label: 'Green',  hex: '#10B981', border: '#10B981' },
  { id: 'beige',  label: 'Beige',  hex: '#D4C5B0', border: '#B8A898' },
  { id: 'grey',   label: 'Grey',   hex: '#9CA3AF', border: '#9CA3AF' },
  { id: 'brown',  label: 'Brown',  hex: '#92400E', border: '#92400E' },
  { id: 'purple', label: 'Purple', hex: '#8B5CF6', border: '#8B5CF6' },
  { id: 'yellow', label: 'Yellow', hex: '#FBBF24', border: '#FBBF24' },
  { id: 'teal',   label: 'Teal',   hex: '#208B84', border: '#208B84' },
] as const;

const patternOptions = [
  { id: 'solids',    label: 'Solids',    desc: 'Clean, one-tone'     },
  { id: 'florals',   label: 'Florals',   desc: 'Botanical prints'    },
  { id: 'stripes',   label: 'Stripes',   desc: 'Lines & pinstripes'  },
  { id: 'geometric', label: 'Geometric', desc: 'Shapes & repeats'    },
  { id: 'abstract',  label: 'Abstract',  desc: 'Artistic, freeform'  },
  { id: 'animal',    label: 'Animal',    desc: 'Leopard, zebra & co' },
] as const;

interface ColorOption   { id: string; label: string; hex: string; border: string }
interface PatternOption { id: string; label: string; desc: string }

// ── Screen ────────────────────────────────────────────────────────────────────
export default function StyleQuizScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedStyles,   setSelectedStyles]   = useState<string[]>([]);
  const [selectedColors,   setSelectedColors]   = useState<string[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const progressAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step === 1 ? 0.5 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const toggle = (id: string, list: string[], setList: (v: string[]) => void) => {
    Haptics?.selectionAsync().catch(() => {});
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleContinue = () => {
    if (step === 1) {
      if (selectedStyles.length < 3) {
        Alert.alert('Pick a few more', 'Select at least 3 styles to continue.');
        return;
      }
      setStep(2);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: prefError } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: user.id, style_tags: selectedStyles, favorite_colors: selectedColors, pattern_preferences: selectedPatterns },
          { onConflict: 'user_id' }
        );
      if (prefError) throw prefError;

      await supabase
        .from('users')
        .update({ style_quiz_completed: true, onboarding_completed: true })
        .eq('id', user.id);

      await storage.setStyleQuizCompleted(true);
      await preferenceService.resetLearnedPreferences(user.id);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      await supabase.from('user_preferences').upsert(
        { user_id: user.id, style_tags: [], favorite_colors: [], pattern_preferences: [] },
        { onConflict: 'user_id' }
      );
      await supabase.from('users').update({ onboarding_completed: true }).eq('id', user.id);
      await storage.setStyleQuizCompleted(true);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>

        {/* Progress bar */}
        <View style={{ height: 2, backgroundColor: theme.colors.neutral[100], borderRadius: 1, marginTop: 16, marginBottom: 28 }}>
          <Animated.View
            style={{ height: '100%', width: progressWidth, backgroundColor: theme.colors.primary[500], borderRadius: 1 }}
          />
        </View>

        {/* Title */}
        <Text
          style={{
            fontFamily: typography.fontFamily.serif.bold,
            fontSize: 26,
            color: theme.colors.neutral[900],
            lineHeight: 32,
            marginBottom: 4,
          }}
        >
          {step === 1 ? 'Your style,\nyour rules.' : 'Colour & patterns.'}
        </Text>
        <Text
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 13,
            color: theme.colors.neutral[400],
            marginBottom: 24,
          }}
        >
          {step === 1 ? 'Pick 3+ aesthetics that speak to you.' : 'Tap anything that draws your eye.'}
        </Text>

        {/* ── Step 1: text-only 3-col chip grid ─────────────────────────────── */}
        {step === 1 && (
          <StyleChipGrid
            options={styleOptions}
            selected={selectedStyles}
            onToggle={(id) => toggle(id, selectedStyles, setSelectedStyles)}
          />
        )}

        {/* ── Step 2: Colours + Patterns ────────────────────────────────────── */}
        {step === 2 && (
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
            <ColorGrid
              options={colorOptions}
              selected={selectedColors}
              onToggle={(id) => toggle(id, selectedColors, setSelectedColors)}
            />
            <View style={{ height: 1, backgroundColor: theme.colors.neutral[100], marginVertical: 24 }} />
            <PatternList
              options={patternOptions}
              selected={selectedPatterns}
              onToggle={(id) => toggle(id, selectedPatterns, setSelectedPatterns)}
            />
          </ScrollView>
        )}

        {/* Spacer — only on step 1 where grid is fixed height */}
        {step === 1 && <View style={{ flex: 1 }} />}

        {/* ── Bottom actions ─────────────────────────────────────────────────── */}
        <View style={{ paddingBottom: 8, paddingTop: 12 }}>
          {step === 1 && (
            <Text
              style={{
                fontFamily: typography.fontFamily.sans.medium,
                fontSize: 12,
                color: selectedStyles.length >= 3 ? theme.colors.primary[500] : theme.colors.neutral[400],
                textAlign: 'center',
                marginBottom: 10,
              }}
            >
              {selectedStyles.length < 3
                ? `${selectedStyles.length}/3 selected`
                : `${selectedStyles.length} selected ✓`}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {step === 2 && (
              <TouchableOpacity
                onPress={() => setStep(1)}
                style={{
                  width: 50, height: 50, borderRadius: 12,
                  borderWidth: 1, borderColor: theme.colors.neutral[200],
                  alignItems: 'center', justifyContent: 'center',
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={18} color={theme.colors.neutral[600]} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleContinue}
              disabled={(step === 1 && selectedStyles.length < 3) || loading}
              activeOpacity={0.85}
              style={{
                flex: 1, height: 50, borderRadius: 12,
                backgroundColor: theme.colors.primary[600],
                alignItems: 'center', justifyContent: 'center',
                opacity: (step === 1 && selectedStyles.length < 3) || loading ? 0.4 : 1,
              }}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 14, color: '#fff' }}>
                    {step === 2 ? 'Done' : 'Continue'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSkip}
            disabled={loading}
            style={{ paddingVertical: 14, alignItems: 'center' }}
            activeOpacity={0.6}
          >
            <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 13, color: theme.colors.neutral[400] }}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Style chips: text-only, 3 columns ─────────────────────────────────────────
function StyleChipGrid({
  options, selected, onToggle,
}: {
  options: typeof styleOptions;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const rows: (typeof styleOptions[number])[][] = [];
  for (let i = 0; i < options.length; i += 3) {
    rows.push(Array.from(options).slice(i, i + 3));
  }
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((s) => (
            <StyleChip
              key={s.id}
              label={s.label}
              selected={selected.includes(s.id)}
              onPress={() => onToggle(s.id)}
            />
          ))}
          {/* Pad row with invisible flex spacers if < 3 items */}
          {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
            <View key={`spacer-${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function StyleChip({
  label, selected, onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 70, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        style={{
          height: 48,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: selected ? theme.colors.primary[500] : theme.colors.neutral[200],
          backgroundColor: selected ? theme.colors.primary[600] : '#FAFAFA',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 6,
        }}
      >
        <Text
          style={{
            fontFamily: selected ? typography.fontFamily.sans.semibold : typography.fontFamily.sans.medium,
            fontSize: 13,
            color: selected ? '#fff' : theme.colors.neutral[700],
            textAlign: 'center',
          }}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Colour grid: 3 cols, bigger circles ───────────────────────────────────────
function ColorGrid({
  options, selected, onToggle,
}: {
  options: readonly ColorOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  // Circle takes ~70% of cell, label below
  const circleSize = Math.floor(COLOR_DOT * 0.72);

  return (
    <>
      <Text style={{
        fontFamily: typography.fontFamily.sans.semibold,
        fontSize: 11, color: theme.colors.neutral[400],
        letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 16,
      }}>
        Colours
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((c) => {
          const on = selected.includes(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => onToggle(c.id)}
              activeOpacity={0.8}
              style={{ width: COLOR_DOT, alignItems: 'center', gap: 7, paddingVertical: 6 }}
            >
              <View
                style={{
                  width: circleSize,
                  height: circleSize,
                  borderRadius: circleSize / 2,
                  backgroundColor: c.hex,
                  borderWidth: on ? 3 : 1.5,
                  borderColor: on ? theme.colors.primary[500] : c.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: on ? 3 : 1 },
                  shadowOpacity: on ? 0.18 : 0.06,
                  shadowRadius: on ? 5 : 2,
                  elevation: on ? 4 : 1,
                }}
              >
                {on && (
                  <Ionicons
                    name="checkmark"
                    size={circleSize * 0.3}
                    color={c.hex === '#FFFFFF' || c.hex === '#FBBF24' || c.hex === '#D4C5B0' ? theme.colors.primary[600] : '#fff'}
                  />
                )}
              </View>
              <Text
                style={{
                  fontFamily: typography.fontFamily.sans.medium,
                  fontSize: 11,
                  color: on ? theme.colors.primary[600] : theme.colors.neutral[500],
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

// ── Pattern list: clean rows ───────────────────────────────────────────────────
function PatternList({
  options, selected, onToggle,
}: {
  options: readonly PatternOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <Text style={{
        fontFamily: typography.fontFamily.sans.semibold,
        fontSize: 11, color: theme.colors.neutral[400],
        letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12,
      }}>
        Patterns
      </Text>
      <View style={{ gap: 8 }}>
        {options.map((p) => {
          const on = selected.includes(p.id);
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => onToggle(p.id)}
              activeOpacity={0.75}
              style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14, paddingVertical: 13,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: on ? theme.colors.primary[400] : theme.colors.neutral[200],
                backgroundColor: on ? theme.colors.primary[50] : '#FAFAFA',
              }}
            >
              <View>
                <Text style={{
                  fontFamily: typography.fontFamily.sans.semibold, fontSize: 14,
                  color: on ? theme.colors.primary[700] : theme.colors.neutral[800],
                }}>
                  {p.label}
                </Text>
                <Text style={{
                  fontFamily: typography.fontFamily.sans.regular, fontSize: 12,
                  color: theme.colors.neutral[400], marginTop: 1,
                }}>
                  {p.desc}
                </Text>
              </View>
              <View style={{
                width: 20, height: 20, borderRadius: 10,
                borderWidth: 1.5,
                borderColor: on ? theme.colors.primary[500] : theme.colors.neutral[300],
                backgroundColor: on ? theme.colors.primary[500] : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {on && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}
