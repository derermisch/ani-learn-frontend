import { storageService } from "@/services/StorageService";
import { useCallback, useEffect, useState } from "react";

export function useDeckStatus(deckId: string) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Check DB on mount
  useEffect(() => {
    checkStatus();
  }, [deckId]);

  const checkStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const unlocked = await storageService.isDeckUnlocked(deckId);
      setIsUnlocked(unlocked);
    } catch (e) {
      console.error("Failed to check deck status", e);
    } finally {
      setLoadingStatus(false);
    }
  }, [deckId]);

  // Called after successful API verification
  const markAsUnlocked = async (hash: string, deckTitle?: string) => {
    try {
      await storageService.unlockDeck(deckId, hash, deckTitle);
      setIsUnlocked(true);
    } catch (e) {
      console.error("Failed to save unlock status", e);
    }
  };

  return {
    isUnlocked,
    loadingStatus,
    markAsUnlocked,
    refreshStatus: checkStatus,
  };
}
