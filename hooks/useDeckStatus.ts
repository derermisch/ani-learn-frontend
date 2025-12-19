import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const STORAGE_KEY = "UNLOCKED_DECKS";

export function useDeckStatus(deckId: string | undefined) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (deckId) checkStatus();
  }, [deckId]);

  const checkStatus = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      const unlockedList = jsonValue != null ? JSON.parse(jsonValue) : [];
      if (unlockedList.includes(deckId)) {
        setIsUnlocked(true);
      }
    } catch (e) {
      console.error("Failed to load deck status", e);
    } finally {
      setLoading(false);
    }
  };

  const markAsUnlocked = async () => {
    if (!deckId) return;
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      const unlockedList = jsonValue != null ? JSON.parse(jsonValue) : [];

      if (!unlockedList.includes(deckId)) {
        unlockedList.push(deckId);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedList));
      }
      setIsUnlocked(true);
    } catch (e) {
      console.error("Failed to save deck status", e);
    }
  };

  return { isUnlocked, markAsUnlocked, loadingStatus: loading };
}
