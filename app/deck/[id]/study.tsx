import { FlashcardView } from "@/components/study/FlashcardView";
import {
  StudyOptionsState,
  StudySettings,
} from "@/components/study/StudySettings";
import { fsrsService } from "@/services/FSRSService";
import { LocalCard, storageService } from "@/services/StorageService"; // <--- NEW SOURCE
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { Card as FSRSCard, State } from "ts-fsrs";

// Map LocalCard to the shape your View expects
// We essentially treat LocalCard AS the Flashcard, but ensure dates are Date objects
export interface EnrichedFlashcard extends Omit<
  LocalCard,
  "due" | "last_review"
> {
  due: Date;
  last_review?: Date;
  context_card?: EnrichedFlashcard;
}

export default function StudyScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [allDeckCards, setAllDeckCards] = useState<EnrichedFlashcard[]>([]);
  const [sessionQueue, setSessionQueue] = useState<EnrichedFlashcard[]>([]);
  const [isSetup, setIsSetup] = useState(false);

  // --- LOAD DATA FROM SQLITE ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const rawCards = await storageService.getCards(id as string);

        // Convert SQL strings (ISO dates) back to JS Date objects
        const hydratedCards: EnrichedFlashcard[] = rawCards.map((c) => ({
          ...c,
          due: new Date(c.due),
          last_review: c.last_review ? new Date(c.last_review) : undefined,
          // These numeric fields come straight from SQL
          state: c.state,
          stability: c.stability,
          difficulty: c.difficulty,
          elapsed_days: c.elapsed_days,
          scheduled_days: c.scheduled_days,
          reps: c.reps,
          lapses: c.lapses,
        }));

        setAllDeckCards(hydratedCards);
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to load cards from storage.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // --- START SESSION ---
  const startSession = (settings: StudyOptionsState) => {
    const now = new Date();
    const mode = settings.cardType as string; // 'word' or 'phrase'
    const order = settings.order as string;

    // 1. Filter by Mode
    let cards = allDeckCards.filter((c) => c.type === mode);

    // 2. Filter by FSRS (New or Due)
    // Note: 'state === State.New' (0) OR 'due <= now'
    cards = cards.filter((c) => c.state === State.New || c.due <= now);

    // 3. Sort
    if (order === "shuffled") {
      cards = cards.sort(() => Math.random() - 0.5);
    } else {
      cards = cards.sort((a, b) => a.due.getTime() - b.due.getTime());
    }

    if (cards.length === 0) {
      Alert.alert("All Caught Up", `No ${mode}s due for review!`);
      return;
    }

    // 4. ENRICH DATA (Link Context)
    // This connects Words to their parent Phrases for the "Context" view
    const enrichedCards = cards.map((card) => {
      let contextCard: EnrichedFlashcard | undefined;

      if (card.type === "word" && card.context_phrase_id) {
        contextCard = allDeckCards.find((c) => c.id === card.context_phrase_id);
      }

      return { ...card, context_card: contextCard };
    });

    setSessionQueue(enrichedCards);
    setIsSetup(true);
  };

  const handleRateCard = async (card: EnrichedFlashcard, isPass: boolean) => {
    // 1. Convert EnrichedCard back to FSRS-compatible object
    // We explicitly cast to avoid TS issues, as our shape matches what FSRS expects
    const inputCard = {
      ...card,
      due: card.due,
      last_review: card.last_review,
    } as unknown as FSRSCard;

    // 2. Calculate new state
    const { card: updatedFSRSCard } = fsrsService.processReview(
      inputCard,
      isPass
    );

    // 3. Merge Updates back into our LocalCard shape
    // We serialize the dates back to ISO strings for SQLite
    const cardToSave: LocalCard = {
      ...card, // Keep static fields (front, back, raw_data, etc)
      ...updatedFSRSCard, // Overwrite stats
      due: updatedFSRSCard.due.toISOString(),
      last_review: updatedFSRSCard.last_review?.toISOString(),
      token_map: card.token_map, // Ensure these persist
      raw_data: card.raw_data,
    };

    // 4. Persist to SQLite
    await storageService.updateCardStats(cardToSave);

    // 5. Update local cache state (for UI consistency if we restart session without reload)
    // We keep dates as Objects in memory
    const updatedInMemoryCard: EnrichedFlashcard = {
      ...card,
      ...updatedFSRSCard,
      context_card: card.context_card,
    };

    setAllDeckCards((prev) =>
      prev.map((c) => (c.id === card.id ? updatedInMemoryCard : c))
    );

    // 6. Update Queue
    if (!isPass) {
      setSessionQueue((prev) => [...prev.slice(1), updatedInMemoryCard]);
    } else {
      setSessionQueue((prev) => prev.slice(1));
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!isSetup) {
    return (
      <StudySettings onStart={startSession} onBack={() => router.back()} />
    );
  }

  return (
    <FlashcardView
      queue={sessionQueue}
      onRate={handleRateCard}
      onBack={() => router.back()}
    />
  );
}
