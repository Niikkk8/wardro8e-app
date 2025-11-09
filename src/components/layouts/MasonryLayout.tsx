import React from 'react';
import { View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { theme } from '../../styles/theme';

// Sample clothing product images - using placeholder URLs
// In production, these would come from your API
const sampleProducts = [
  { id: '1', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', height: 280 },
  { id: '2', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400', height: 320 },
  { id: '3', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400', height: 240 },
  { id: '4', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400', height: 300 },
  { id: '5', image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400', height: 260 },
  { id: '6', image: 'https://images.unsplash.com/photo-1485968579580-b6d5cae6c5be?w=400', height: 340 },
  { id: '7', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400', height: 290 },
  { id: '8', image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400', height: 310 },
  { id: '9', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', height: 270 },
  { id: '10', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400', height: 330 },
  { id: '11', image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400', height: 250 },
  { id: '12', image: 'https://images.unsplash.com/photo-1485968579580-b6d5cae6c5be?w=400', height: 300 },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const GAP = theme.spacing.md;
const COLUMN_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - GAP) / COLUMN_COUNT;

export default function MasonryLayout() {
  // Distribute items into columns for masonry effect
  const columns: typeof sampleProducts[][] = [[], []];
  
  sampleProducts.forEach((item, index) => {
    const columnIndex = index % COLUMN_COUNT;
    columns[columnIndex].push(item);
  });

  return (
    <View className="flex-row" style={{ gap: GAP }}>
      {columns.map((column, columnIndex) => (
        <View key={columnIndex} style={{ width: COLUMN_WIDTH, gap: GAP }}>
          {column.map((item) => (
            <MasonryItem key={item.id} item={item} width={COLUMN_WIDTH} />
          ))}
        </View>
      ))}
    </View>
  );
}

function MasonryItem({ 
  item, 
  width 
}: { 
  item: typeof sampleProducts[0]; 
  width: number;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={{
        width,
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.neutral[100],
      }}
    >
      <Image
        source={{ uri: item.image }}
        style={{
          width: '100%',
          height: item.height,
          resizeMode: 'cover',
        }}
      />
    </TouchableOpacity>
  );
}

