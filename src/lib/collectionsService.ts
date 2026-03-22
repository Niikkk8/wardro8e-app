import { supabase } from './supabase';

export interface CollectionRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  product_ids: string[];
  tags: string[];
  saves_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionInput {
  userId: string;
  name: string;
  description?: string;
  coverImageUri?: string | null;
  coverImageMimeType?: string | null;
  coverImageBase64?: string | null;
  isPublic: boolean;
  tags?: string[];
}

// ── Fetch ───────────────────────────────────────────────────────────────────

export async function fetchPublicCollections(query?: string): Promise<CollectionRecord[]> {
  let q = supabase
    .from('collections')
    .select('*')
    .eq('is_public', true)
    .order('saves_count', { ascending: false });

  if (query?.trim()) {
    q = q.ilike('name', `%${query.trim()}%`);
  }

  const { data, error } = await q.limit(50);
  if (error) throw error;
  return (data ?? []) as CollectionRecord[];
}

export async function fetchUserCollections(userId: string): Promise<CollectionRecord[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CollectionRecord[];
}

export async function fetchCollectionById(id: string): Promise<CollectionRecord | null> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as CollectionRecord;
}

// ── Create / Update / Delete ────────────────────────────────────────────────

export async function createCollection(input: CreateCollectionInput): Promise<CollectionRecord> {
  let coverImageUrl: string | null = null;
  if (input.coverImageUri) {
    coverImageUrl = await uploadCoverImage(
      input.userId,
      input.coverImageUri,
      input.coverImageMimeType ?? undefined,
      input.coverImageBase64 ?? undefined,
    );
  }

  const { data, error } = await supabase
    .from('collections')
    .insert({
      user_id: input.userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      cover_image_url: coverImageUrl,
      is_public: input.isPublic,
      product_ids: [],
      tags: input.tags ?? [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as CollectionRecord;
}

export async function updateCollection(
  id: string,
  updates: Partial<Pick<CollectionRecord, 'name' | 'description' | 'is_public' | 'product_ids' | 'tags' | 'cover_image_url'>>
): Promise<void> {
  const { error } = await supabase
    .from('collections')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await supabase.from('collections').delete().eq('id', id);
  if (error) throw error;
}

export async function addProductToCollection(collectionId: string, productId: string): Promise<void> {
  const col = await fetchCollectionById(collectionId);
  if (!col) return;
  const ids = Array.from(new Set([...col.product_ids, productId]));
  await updateCollection(collectionId, { product_ids: ids });
}

export async function removeProductFromCollection(collectionId: string, productId: string): Promise<void> {
  const col = await fetchCollectionById(collectionId);
  if (!col) return;
  const ids = col.product_ids.filter((id) => id !== productId);
  await updateCollection(collectionId, { product_ids: ids });
}

// ── Cover image upload ──────────────────────────────────────────────────────

export async function uploadCoverImage(userId: string, localUri: string, mimeType?: string, base64Data?: string): Promise<string | null> {
  try {
    const contentType = mimeType ?? 'image/jpeg';
    const ext = contentType.split('/')[1]?.split('+')[0] ?? 'jpg';
    const fileName = `${userId}/${Date.now()}.${ext}`;

    let body: Uint8Array | Blob;
    if (base64Data) {
      // Avoid fetch(file://) which fails on Android — use the base64 data directly
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      body = bytes;
    } else {
      const response = await fetch(localUri);
      body = await response.blob();
    }

    const { error } = await supabase.storage
      .from('collection-covers')
      .upload(fileName, body, { contentType, upsert: false });

    if (error) {
      console.error('[uploadCoverImage] Upload failed:', error.message);
      return null;
    }

    const { data } = supabase.storage.from('collection-covers').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (e) {
    console.error('[uploadCoverImage] Exception:', e);
    return null;
  }
}

// ── Saves ───────────────────────────────────────────────────────────────────

export async function isSavedByUser(userId: string, collectionId: string): Promise<boolean> {
  const { data } = await supabase
    .from('collection_saves')
    .select('id')
    .eq('user_id', userId)
    .eq('collection_id', collectionId)
    .single();
  return !!data;
}

/** Returns true if now saved, false if now unsaved. */
export async function toggleSaveCollection(
  userId: string,
  collectionId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('collection_saves')
    .select('id')
    .eq('user_id', userId)
    .eq('collection_id', collectionId)
    .single();

  if (existing) {
    await supabase.from('collection_saves').delete().eq('id', existing.id);
    await supabase.rpc('decrement_collection_saves', { collection_id: collectionId });
    return false;
  } else {
    await supabase
      .from('collection_saves')
      .insert({ user_id: userId, collection_id: collectionId });
    await supabase.rpc('increment_collection_saves', { collection_id: collectionId });
    return true;
  }
}
