import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { interactionService } from '../lib/interactionService';
import { preferenceService } from '../lib/preferenceService';
import { STATIC_PRODUCTS } from '../data/staticProducts';

export interface UserCollection {
  id: string;
  name: string;
  description?: string;
  productIds: string[];
  createdAt: string;
}

interface WardrobeContextType {
  favouriteIds: string[];
  isFavourited: (productId: string) => boolean;
  toggleFavourite: (productId: string, userId?: string | null) => void;

  savedCollectionIds: string[];
  isCollectionSaved: (collectionId: string) => boolean;
  toggleSaveCollection: (collectionId: string) => void;

  userCollections: UserCollection[];
  createCollection: (name: string, description?: string) => UserCollection;
  deleteCollection: (collectionId: string) => void;
  addToCollection: (collectionId: string, productId: string) => void;
  removeFromCollection: (collectionId: string, productId: string) => void;
  isInCollection: (collectionId: string, productId: string) => boolean;

  loading: boolean;
}

const STORAGE_KEYS = {
  FAVOURITES: '@wardro8e:favourites',
  SAVED_COLLECTIONS: '@wardro8e:saved_collections',
  USER_COLLECTIONS: '@wardro8e:user_collections',
} as const;

// ─── Context ────────────────────────────────────────────────────────────────
const WardrobeContext = createContext<WardrobeContextType | null>(null);

export function useWardrobe() {
  const context = useContext(WardrobeContext);
  if (!context) {
    throw new Error('useWardrobe must be used within WardrobeProvider');
  }
  return context;
}

// ─── Provider ───────────────────────────────────────────────────────────────
export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);
  const [savedCollectionIds, setSavedCollectionIds] = useState<string[]>([]);
  const [userCollections, setUserCollections] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(true);

  // Load persisted data on mount
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [favs, saved, collections] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.FAVOURITES),
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_COLLECTIONS),
        AsyncStorage.getItem(STORAGE_KEYS.USER_COLLECTIONS),
      ]);
      if (favs) setFavouriteIds(JSON.parse(favs));
      if (saved) setSavedCollectionIds(JSON.parse(saved));
      if (collections) setUserCollections(JSON.parse(collections));
    } catch (e) {
      console.error('Error loading wardrobe data:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Persist helpers ────────────────────────────────────────────────────
  const persistFavourites = useCallback(async (ids: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FAVOURITES, JSON.stringify(ids));
    } catch (e) {
      console.error('Error persisting favourites:', e);
    }
  }, []);

  const persistSavedCollections = useCallback(async (ids: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_COLLECTIONS, JSON.stringify(ids));
    } catch (e) {
      console.error('Error persisting saved collections:', e);
    }
  }, []);

  const persistUserCollections = useCallback(async (cols: UserCollection[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_COLLECTIONS, JSON.stringify(cols));
    } catch (e) {
      console.error('Error persisting user collections:', e);
    }
  }, []);

  // ── Favourites ─────────────────────────────────────────────────────────
  const isFavourited = useCallback(
    (productId: string) => favouriteIds.includes(productId),
    [favouriteIds]
  );

  const toggleFavourite = useCallback(
    (productId: string, userId?: string | null) => {
      setFavouriteIds((prev) => {
        const wasLiked = prev.includes(productId);
        const next = wasLiked
          ? prev.filter((id) => id !== productId)
          : [...prev, productId];
        persistFavourites(next);

        // Log like interaction for new likes
        if (!wasLiked && userId) {
          interactionService.logInteraction(userId, productId, 'like').catch(() => {});
          const product = STATIC_PRODUCTS.find((p) => p.id === productId);
          if (product) {
            preferenceService.handleInteraction(userId, product, 'like').catch(() => {});
          }
        }

        return next;
      });
    },
    [persistFavourites]
  );

  // ── Saved community collections ────────────────────────────────────────
  const isCollectionSaved = useCallback(
    (collectionId: string) => savedCollectionIds.includes(collectionId),
    [savedCollectionIds]
  );

  const toggleSaveCollection = useCallback(
    (collectionId: string) => {
      setSavedCollectionIds((prev) => {
        const next = prev.includes(collectionId)
          ? prev.filter((id) => id !== collectionId)
          : [...prev, collectionId];
        persistSavedCollections(next);
        return next;
      });
    },
    [persistSavedCollections]
  );

  // ── User-created collections ───────────────────────────────────────────
  const createCollection = useCallback(
    (name: string, description?: string): UserCollection => {
      const newCol: UserCollection = {
        id: `user-col-${Date.now()}`,
        name,
        description,
        productIds: [],
        createdAt: new Date().toISOString(),
      };
      setUserCollections((prev) => {
        const next = [newCol, ...prev];
        persistUserCollections(next);
        return next;
      });
      return newCol;
    },
    [persistUserCollections]
  );

  const deleteCollection = useCallback(
    (collectionId: string) => {
      setUserCollections((prev) => {
        const next = prev.filter((c) => c.id !== collectionId);
        persistUserCollections(next);
        return next;
      });
    },
    [persistUserCollections]
  );

  const addToCollection = useCallback(
    (collectionId: string, productId: string) => {
      setUserCollections((prev) => {
        const next = prev.map((c) =>
          c.id === collectionId && !c.productIds.includes(productId)
            ? { ...c, productIds: [...c.productIds, productId] }
            : c
        );
        persistUserCollections(next);
        return next;
      });
    },
    [persistUserCollections]
  );

  const removeFromCollection = useCallback(
    (collectionId: string, productId: string) => {
      setUserCollections((prev) => {
        const next = prev.map((c) =>
          c.id === collectionId
            ? { ...c, productIds: c.productIds.filter((id) => id !== productId) }
            : c
        );
        persistUserCollections(next);
        return next;
      });
    },
    [persistUserCollections]
  );

  const isInCollection = useCallback(
    (collectionId: string, productId: string) => {
      const col = userCollections.find((c) => c.id === collectionId);
      return col ? col.productIds.includes(productId) : false;
    },
    [userCollections]
  );

  return (
    <WardrobeContext.Provider
      value={{
        favouriteIds,
        isFavourited,
        toggleFavourite,
        savedCollectionIds,
        isCollectionSaved,
        toggleSaveCollection,
        userCollections,
        createCollection,
        deleteCollection,
        addToCollection,
        removeFromCollection,
        isInCollection,
        loading,
      }}
    >
      {children}
    </WardrobeContext.Provider>
  );
}
