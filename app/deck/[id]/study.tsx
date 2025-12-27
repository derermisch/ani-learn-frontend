import { FlashcardView } from "@/components/study/FlashcardView";
import {
  StudyOptionsState,
  StudySettings,
} from "@/components/study/StudySettings";
import { Flashcard } from "@/constants/types";
import { fsrsService } from "@/services/FSRSService";
import { JsonDatabase } from "@/services/jsonDatabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { State } from "ts-fsrs";

// We define an "Enriched" card type locally to include the context object
export interface EnrichedFlashcard extends Flashcard {
  context_card?: Flashcard;
}

export default function StudyScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [allDeckCards, setAllDeckCards] = useState<Flashcard[]>([]);

  // Session State
  const [sessionQueue, setSessionQueue] = useState<EnrichedFlashcard[]>([]);
  const [isSetup, setIsSetup] = useState(false);

  // --- LOAD DATA ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const allCards = await JsonDatabase.getCards();
        const deckCards = allCards.filter((c) => c.deck_id === id);
        // console.log("deckCards: ", JSON.stringify(deckCards, undefined, 4));

        setAllDeckCards(deckCards);
      } catch (e) {
        Alert.alert("Error", "Failed to load cards.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // --- ACTIONS ---
  const startSession = (settings: StudyOptionsState) => {
    const now = new Date();
    const mode = settings.cardType as string;
    const order = settings.order as string;

    // 1. Filter by Mode
    let cards = allDeckCards.filter((c) => c.type === mode);

    // 2. Filter by FSRS (New or Due)
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

    // 4. ENRICH DATA (The "Merge" Step)
    // We look up the context phrase *now* so the View doesn't have to search later.
    const enrichedCards: EnrichedFlashcard[] = cards.map((card) => {
      let contextCard: Flashcard | undefined;

      // Only words need context phrases
      if (card.type === "word" && card.related_ids?.length) {
        // Find the first related ID that is actually a PHRASE
        for (const relatedId of card.related_ids) {
          // console.log(relatedId);
          const found = allDeckCards.find(
            (c) => c.id === relatedId && c.type === "phrase"
          );
          if (found) {
            contextCard = found;
            break; // Stop after finding the first valid phrase
          }
        }
      }

      // console.log("card: ", JSON.stringify(card, undefined, 4));
      // console.log("contextCard: ", JSON.stringify(contextCard, undefined, 4));
      return { ...card, context_card: contextCard };
    });

    setSessionQueue(enrichedCards);
    setIsSetup(true);
  };

  const handleRateCard = async (card: Flashcard, isPass: boolean) => {
    // 1. Calculate new state
    const { card: updatedCard } = fsrsService.processReview(card, isPass);

    // 2. Persist
    await JsonDatabase.updateCard(updatedCard);

    // 3. Update local cache (so refreshing doesn't show old state)
    setAllDeckCards((prev) =>
      prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
    );

    // 4. Update Queue
    // We must preserve the 'context_card' field when updating the queue
    const updatedEnrichedCard: EnrichedFlashcard = {
      ...updatedCard,
      context_card: (card as EnrichedFlashcard).context_card,
    };

    if (!isPass) {
      setSessionQueue((prev) => [...prev.slice(1), updatedEnrichedCard]);
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

  // --- RENDER ---
  if (!isSetup) {
    return (
      <StudySettings onStart={startSession} onBack={() => router.back()} />
    );
  }

  return (
    <FlashcardView
      queue={sessionQueue}
      // REMOVED: allCards={allDeckCards} <-- No longer needed!
      onRate={handleRateCard}
      onBack={() => router.back()}
    />
  );
}
