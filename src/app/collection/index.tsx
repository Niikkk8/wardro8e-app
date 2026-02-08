import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { COLLECTIONS, Collection } from '../../data/collections';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = theme.spacing.md;
const COLUMN_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - GAP) / 2;

export default function CollectionsListPage() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3 border-b"
        style={{ borderBottomColor: theme.colors.neutral[200] }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center -ml-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.neutral[900]} />
        </TouchableOpacity>
        <Text
          className="ml-2"
          style={{
            fontFamily: typography.fontFamily.serif.medium,
            fontSize: 20,
            color: theme.colors.neutral[900],
          }}
        >
          Collections
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: 40,
        }}
      >
        <Text
          className="mb-5"
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 14,
            color: theme.colors.neutral[500],
          }}
        >
          {COLLECTIONS.length} collections curated by the community
        </Text>

        <View className="flex-row flex-wrap" style={{ gap: GAP }}>
          {COLLECTIONS.map((collection) => (
            <CollectionListCard
              key={collection.id}
              collection={collection}
              onPress={() => router.push(`/collection/${collection.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CollectionListCard({
  collection,
  onPress,
}: {
  collection: Collection;
  onPress: () => void;
}) {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const images = collection.coverImages.slice(0, 4);
  const miniGap = 2;
  const miniImgSize = (COLUMN_WIDTH - miniGap) / 2;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: COLUMN_WIDTH,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.neutral[50],
        ...theme.shadows.sm,
      }}
    >
      {/* 2x2 Image Grid */}
      <View
        style={{
          width: COLUMN_WIDTH,
          height: COLUMN_WIDTH,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: miniGap,
        }}
      >
        {images.map((url, idx) =>
          imageErrors.has(idx) ? (
            <View
              key={idx}
              style={{
                width: miniImgSize,
                height: miniImgSize,
                backgroundColor: theme.colors.neutral[200],
              }}
            />
          ) : (
            <Image
              key={idx}
              source={{ uri: url }}
              style={{
                width: miniImgSize,
                height: miniImgSize,
                resizeMode: 'cover',
              }}
              onError={() =>
                setImageErrors((prev) => new Set(prev).add(idx))
              }
            />
          )
        )}
      </View>

      <View className="p-3">
        <Text
          numberOfLines={1}
          style={{
            fontFamily: typography.fontFamily.serif.medium,
            fontSize: 15,
            color: theme.colors.neutral[900],
          }}
        >
          {collection.name}
        </Text>
        <Text
          numberOfLines={2}
          className="mt-1"
          style={{
            fontFamily: typography.fontFamily.sans.regular,
            fontSize: 11,
            color: theme.colors.neutral[500],
            lineHeight: 16,
          }}
        >
          {collection.description}
        </Text>
        <View className="flex-row items-center mt-2">
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.medium,
              fontSize: 11,
              color: theme.colors.primary[600],
            }}
          >
            {collection.curator}
          </Text>
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.regular,
              fontSize: 11,
              color: theme.colors.neutral[300],
              marginHorizontal: 6,
            }}
          >
            ·
          </Text>
          <Text
            style={{
              fontFamily: typography.fontFamily.sans.regular,
              fontSize: 11,
              color: theme.colors.neutral[400],
            }}
          >
            {collection.saves} saves
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
