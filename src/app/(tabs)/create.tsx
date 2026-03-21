/**
 * Create tab — Collection Manager
 *
 * Shows the signed-in user's collections and lets them create new ones.
 * Each collection can have a cover image, name, description, and public/private setting.
 * Tapping a collection navigates to its detail page.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  Modal,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

let LinearGradient: any = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../styles/theme';
import { typography } from '../../styles/typography';
import { useAuth } from '../../contexts/AuthContext';
import {
  CollectionRecord,
  fetchUserCollections,
  createCollection,
  deleteCollection,
} from '../../lib/collectionsService';

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = theme.spacing.md;
const CARD_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - CARD_GAP) / 2;

// ── Main Component ──────────────────────────────────────────────────────────

export default function CreatePage() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await fetchUserCollections(user.id);
      setCollections(data);
    } catch {}
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleCreated = useCallback((col: CollectionRecord) => {
    setCollections((prev) => [col, ...prev]);
    setShowCreateSheet(false);
    router.push(`/collection/${col.id}`);
  }, []);

  const handleDelete = useCallback((col: CollectionRecord) => {
    Alert.alert(
      'Delete Collection',
      `Delete "${col.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCollection(col.id);
              setCollections((prev) => prev.filter((c) => c.id !== col.id));
            } catch {
              Alert.alert('Error', 'Could not delete collection.');
            }
          },
        },
      ]
    );
  }, []);

  if (!user) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="albums-outline" size={56} color={theme.colors.neutral[300]} />
          <Text style={{ fontFamily: typography.fontFamily.serif.medium, fontSize: 20, color: theme.colors.neutral[800], marginTop: 16, textAlign: 'center' }}>
            Sign in to create collections
          </Text>
          <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 14, color: theme.colors.neutral[500], marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            Curate your own collections, add products, and share them with the community.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/welcome')}
            style={{ marginTop: 24, backgroundColor: theme.colors.primary[500], paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 }}
            activeOpacity={0.85}
          >
            <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 15, color: '#fff' }}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
      {/* Header */}
      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: 12, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontFamily: typography.fontFamily.serif.regular, fontSize: 28, color: theme.colors.neutral[900], letterSpacing: -0.5 }}>
            Collections
          </Text>
          <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 13, color: theme.colors.neutral[400], marginTop: 2 }}>
            {collections.length > 0 ? `${collections.length} collection${collections.length !== 1 ? 's' : ''}` : 'None yet'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => { Haptics?.impactAsync('light' as any).catch(() => {}); setShowCreateSheet(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary[500], paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, gap: 6 }}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 13, color: '#fff' }}>
            New
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      ) : collections.length === 0 ? (
        <EmptyState onCreateNew={() => setShowCreateSheet(true)} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, paddingBottom: 40, paddingTop: 4 }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP }}>
            {collections.map((col) => (
              <CollectionCard
                key={col.id}
                collection={col}
                onPress={() => router.push(`/collection/${col.id}`)}
                onDelete={() => handleDelete(col)}
              />
            ))}
          </View>

          {/* Browse community CTA */}
          <TouchableOpacity
            onPress={() => router.push('/collection')}
            style={{
              marginTop: 24,
              padding: 16,
              borderRadius: 18,
              backgroundColor: theme.colors.neutral[50],
              borderWidth: 1,
              borderColor: theme.colors.neutral[100],
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
            activeOpacity={0.75}
          >
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.primary[50], alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="compass-outline" size={19} color={theme.colors.primary[500]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 14, color: theme.colors.neutral[800] }}>
                Browse community collections
              </Text>
              <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 12, color: theme.colors.neutral[400], marginTop: 1 }}>
                Discover and save collections from other users
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color={theme.colors.neutral[300]} />
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Create Sheet */}
      <CreateCollectionSheet
        visible={showCreateSheet}
        userId={user.id}
        onClose={() => setShowCreateSheet(false)}
        onCreated={handleCreated}
      />
    </SafeAreaView>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
      {/* <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: theme.colors.primary[50], alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Ionicons name="albums-outline" size={36} color={theme.colors.primary[400]} />
      </View> */}
      <Text style={{ fontFamily: typography.fontFamily.serif.medium, fontSize: 22, color: theme.colors.neutral[900], textAlign: 'center' }}>
        Start your first collection
      </Text>
      <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 14, color: theme.colors.neutral[500], marginTop: 10, textAlign: 'center', lineHeight: 21 }}>
        Curate looks you love, add products from the explore feed, and share with the community.
      </Text>
      <TouchableOpacity
        onPress={onCreateNew}
        style={{ marginTop: 28, backgroundColor: theme.colors.primary[500], paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 }}
        activeOpacity={0.85}
      >
        <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 15, color: '#fff' }}>
          Create Collection
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push('/collection')}
        style={{ marginTop: 14, paddingVertical: 8 }}
        activeOpacity={0.7}
      >
        <Text style={{ fontFamily: typography.fontFamily.sans.medium, fontSize: 14, color: theme.colors.primary[600] }}>
          Or browse community collections →
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Collection Card — full-bleed with gradient overlay ───────────────────────

function CollectionCard({
  collection,
  onPress,
  onDelete,
}: {
  collection: CollectionRecord;
  onPress: () => void;
  onDelete: () => void;
}) {
  const cardH = CARD_WIDTH * 1.42;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: CARD_WIDTH,
        height: cardH,
        borderRadius: 20,
        ...theme.shadows.md,
      }}
    >
      {/* Inner clips the image and gradient */}
      <View style={{ width: CARD_WIDTH, height: cardH, borderRadius: 20, overflow: 'hidden', backgroundColor: theme.colors.neutral[200] }}>
        {collection.cover_image_url ? (
          <Image
            source={{ uri: collection.cover_image_url }}
            style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.neutral[100] }}>
            <Ionicons name="images-outline" size={34} color={theme.colors.neutral[300]} />
            <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 11, color: theme.colors.neutral[300], marginTop: 6 }}>
              No cover
            </Text>
          </View>
        )}

        {/* Gradient overlay with info */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          {LinearGradient ? (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.88)']}
              style={{ paddingHorizontal: 12, paddingTop: 44, paddingBottom: 12 }}
            >
              <CardOverlayText collection={collection} />
            </LinearGradient>
          ) : (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 12, paddingTop: 18, paddingBottom: 12 }}>
              <CardOverlayText collection={collection} />
            </View>
          )}
        </View>

        {/* Top-left: visibility pill */}
        <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}>
          <Ionicons
            name={collection.is_public ? 'globe-outline' : 'lock-closed-outline'}
            size={10}
            color="rgba(255,255,255,0.9)"
          />
          <Text style={{ fontFamily: typography.fontFamily.sans.medium, fontSize: 9, color: 'rgba(255,255,255,0.9)' }}>
            {collection.is_public ? 'Public' : 'Private'}
          </Text>
        </View>

        {/* Top-right: delete */}
        <TouchableOpacity
          onPress={onDelete}
          style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="trash-outline" size={13} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function CardOverlayText({ collection }: { collection: CollectionRecord }) {
  return (
    <>
      <Text
        numberOfLines={2}
        style={{ fontFamily: typography.fontFamily.serif.medium, fontSize: 15, color: '#fff', lineHeight: 20 }}
      >
        {collection.name}
      </Text>
      <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
        {collection.product_ids.length} item{collection.product_ids.length !== 1 ? 's' : ''}
      </Text>
    </>
  );
}

// ── Create Collection Sheet ─────────────────────────────────────────────────

function CreateCollectionSheet({
  visible,
  userId,
  onClose,
  onCreated,
}: {
  visible: boolean;
  userId: string;
  onClose: () => void;
  onCreated: (col: CollectionRecord) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const reset = () => {
    setName('');
    setDescription('');
    setIsPublic(true);
    setCoverUri(null);
    setCreating(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to pick a cover image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const col = await createCollection({
        userId,
        name: name.trim(),
        description: description.trim() || undefined,
        coverImageUri: coverUri,
        isPublic,
      });
      reset();
      onCreated(col);
    } catch (e) {
      Alert.alert('Error', 'Could not create collection. Please try again.');
      setCreating(false);
    }
  };

  const canCreate = name.trim().length > 0 && !creating;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} activeOpacity={1} />

          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingBottom: Platform.OS === 'ios' ? 40 : 24,
            }}
          >
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.neutral[200] }} />
            </View>

            {/* Sheet Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.neutral[100],
              }}
            >
              <Text style={{ fontFamily: typography.fontFamily.serif.medium, fontSize: 20, color: theme.colors.neutral[900] }}>
                New Collection
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color={theme.colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}
            >
              {/* Cover Image Picker */}
              <TouchableOpacity onPress={pickImage} activeOpacity={0.85}>
                <View
                  style={{
                    width: '100%',
                    height: 180,
                    borderRadius: 18,
                    backgroundColor: theme.colors.neutral[100],
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    marginBottom: 20,
                    borderWidth: coverUri ? 0 : 1.5,
                    borderColor: theme.colors.neutral[200],
                    borderStyle: 'dashed',
                  }}
                >
                  {coverUri ? (
                    <>
                      <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 10,
                          right: 10,
                          backgroundColor: 'rgba(0,0,0,0.55)',
                          borderRadius: 20,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Ionicons name="camera-outline" size={14} color="#fff" />
                        <Text style={{ fontFamily: typography.fontFamily.sans.medium, fontSize: 11, color: '#fff' }}>
                          Change
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={36} color={theme.colors.neutral[300]} />
                      <Text style={{ fontFamily: typography.fontFamily.sans.medium, fontSize: 14, color: theme.colors.neutral[400], marginTop: 8 }}>
                        Add Cover Photo
                      </Text>
                      <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 12, color: theme.colors.neutral[300], marginTop: 3 }}>
                        Tap to choose from library
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {/* Name */}
              <Text style={fieldLabel}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Summer Essentials"
                placeholderTextColor={theme.colors.neutral[400]}
                style={[inputStyle, { marginBottom: 16 }]}
                maxLength={60}
              />

              {/* Description */}
              <Text style={fieldLabel}>Description{' '}
                <Text style={{ fontFamily: typography.fontFamily.sans.regular, color: theme.colors.neutral[400] }}>(optional)</Text>
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What's this collection about?"
                placeholderTextColor={theme.colors.neutral[400]}
                multiline
                style={[inputStyle, { height: 80, textAlignVertical: 'top', paddingTop: 12, marginBottom: 20 }]}
                maxLength={200}
              />

              {/* Public / Private */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.neutral[50],
                  padding: 16,
                  borderRadius: 14,
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: theme.colors.neutral[100],
                }}
              >
                <Ionicons
                  name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                  size={20}
                  color={isPublic ? theme.colors.primary[500] : theme.colors.neutral[500]}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontFamily: typography.fontFamily.sans.semibold, fontSize: 14, color: theme.colors.neutral[900] }}>
                    {isPublic ? 'Public' : 'Private'}
                  </Text>
                  <Text style={{ fontFamily: typography.fontFamily.sans.regular, fontSize: 12, color: theme.colors.neutral[400], marginTop: 1 }}>
                    {isPublic
                      ? 'Anyone can discover and save this collection'
                      : 'Only you can see this collection'}
                  </Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[400] }}
                  thumbColor={isPublic ? theme.colors.primary[600] : theme.colors.neutral[400]}
                />
              </View>

              {/* Create Button */}
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!canCreate}
                style={{
                  height: 54,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: canCreate ? theme.colors.primary[500] : theme.colors.neutral[200],
                }}
                activeOpacity={0.88}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{
                      fontFamily: typography.fontFamily.sans.semibold,
                      fontSize: 16,
                      color: canCreate ? '#fff' : theme.colors.neutral[400],
                    }}
                  >
                    Create Collection
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────

const fieldLabel = {
  fontFamily: typography.fontFamily.sans.semibold,
  fontSize: 13,
  color: theme.colors.neutral[700],
  marginBottom: 8,
} as const;

const inputStyle = {
  backgroundColor: theme.colors.neutral[100],
  borderRadius: 12,
  paddingHorizontal: 14,
  height: 48,
  fontFamily: typography.fontFamily.sans.regular,
  fontSize: 15,
  color: theme.colors.neutral[900],
  borderWidth: 1,
  borderColor: theme.colors.neutral[200],
} as const;
