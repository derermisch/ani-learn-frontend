import { LocalCard, storageService } from "@/services/StorageService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { UnlockFlow } from "../../components/deck/UnlockFlow";
import { Deck } from "../../constants/types";
import { useDeckStatus } from "../../hooks/useDeckStatus"; // <--- NEW HOOK
import { useSubtitleEngine } from "../../hooks/useSubtitleEngine";
import {
  getDeckCards,
  getDeckDetails,
  unlockDeckWithHash,
} from "../../services/api";

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

  const engine = useSubtitleEngine();

  // Check if deck is already unlocked locally
  const { isUnlocked, markAsUnlocked, loadingStatus } = useDeckStatus(
    id as string
  );

  useEffect(() => {
    if (id) loadDeck(id as string);
  }, [id]);

  const loadDeck = async (deckId: string) => {
    try {
      const data = await getDeckDetails(deckId);
      setDeck(data);
    } catch (e) {
      Alert.alert("Error", "Could not load deck");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // HELPER: Transform Backend Data -> List of Phrases AND Words
  const processBackendCards = (
    backendCards: any[],
    deckId: string
  ): LocalCard[] => {
    const allItems: LocalCard[] = [];

    backendCards.forEach((c, index) => {
      // --- 1. PREPARE PHRASE CARD ---
      let phraseId = c.id || (typeof c._id === "string" ? c._id : c._id?.$oid);

      if (!phraseId) {
        phraseId = `temp_phrase_${deckId}_${index}_${Date.now()}`;
      }

      const translations = c.translation || {};
      const translationObj =
        translations["gpt-4o-mini"] ||
        translations["llama3.1"] ||
        (Object.values(translations)[0] as any);
      const phraseBack = translationObj?.result || "No translation";

      const tokenMap: Record<string, string> = {};

      // --- 2. EXTRACT WORDS FROM TOKENS ---
      if (c.tokens && Array.isArray(c.tokens)) {
        c.tokens.forEach((t: any, tokenIdx: number) => {
          const modelRes =
            t.model_to_result?.["gpt-4o-mini"] ||
            t.model_to_result?.["llama3.1"];
          const entryId = modelRes?.selected_entry_id;

          // If AI picked an entry, we create a Word Card
          if (entryId && t.token) {
            tokenMap[t.token] = entryId; // Add to phrase's map

            // Create the WORD Card
            const wordCard: LocalCard = {
              id: `${phraseId}_word_${tokenIdx}`, // Deterministic ID linked to phrase
              deck_id: deckId,
              type: "word",
              front: t.token,
              back: "", // We rely on Dictionary DB to fetch definition later
              dictionary_entry_id: entryId,
              context_phrase_id: phraseId, // Link to Parent
              token_map: "{}",
              raw_data: JSON.stringify(t), // Store token raw data
            };
            allItems.push(wordCard);
          }
        });
      }

      // --- 3. CREATE PHRASE CARD ---
      const phraseCard: LocalCard = {
        id: phraseId,
        deck_id: deckId,
        type: "phrase",
        front: c.phrase || "",
        back: phraseBack,
        dictionary_entry_id: undefined, // Phrases don't map to 1 dict entry
        context_phrase_id: undefined,
        token_map: JSON.stringify(tokenMap),
        raw_data: JSON.stringify(c),
      };

      allItems.push(phraseCard);
    });

    return allItems;
  };

  const handleUnlockVerification = async () => {
    if (!engine.previewData || !id) return;

    try {
      const result = await unlockDeckWithHash(
        id as string,
        engine.previewData.hash
      );

      if (result.success) {
        // --- 1. Fetch & Save Data ---
        try {
          console.log("🔓 Unlocked! Fetching cards...");
          const backendCards = await getDeckCards(id as string);

          const localCards = processBackendCards(backendCards, id as string);
          await storageService.saveCardsForDeck(id as string, localCards);
        } catch (err) {
          console.error("❌ Failed to save cards:", err);
          Alert.alert(
            "Warning",
            "Deck unlocked, but failed to download cards."
          );
        }

        // --- 2. Mark as Unlocked ---
        await markAsUnlocked(engine.previewData.hash, deck?.title);

        Alert.alert("Success", "Deck Unlocked & Downloaded!", [
          {
            text: "Start Studying",
            onPress: () => router.push(`/deck/${id}/study`),
          },
        ]);
      } else {
        Alert.alert("Failed", result.message || "Hash mismatch");
      }
    } catch (e) {
      Alert.alert("Error", "Network request failed");
    } finally {
      engine.resetPreview();
    }
  };

  if (loading || loadingStatus || !deck) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#A071FF" />
      </View>
    );
  }

  const placeholderChar = (deck.title || "U").substring(0, 2).toUpperCase();
  const isReady = engine.engineState === "ready" && engine.libLoaded;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.coverPlaceholder}>
          <Text style={styles.coverText}>{placeholderChar}</Text>
        </View>

        <Text style={styles.title}>{deck.title}</Text>
        <Text style={styles.subtitle}>Episode {deck.episode}</Text>

        <View style={styles.metaContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{deck.lang.toUpperCase()}</Text>
          </View>
          <Text style={styles.metaText}>{deck.cards} Cards</Text>
          <Text style={styles.metaText}>•</Text>
          <Text style={styles.metaText}>
            By {deck.creator_name || "Unknown"}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* --- DYNAMIC SECTION --- */}
        {isUnlocked ? (
          // STATE A: ALREADY UNLOCKED (Study Mode)
          <View style={styles.studyContainer}>
            <Ionicons
              name="school-outline"
              size={48}
              color="#A071FF"
              style={{ marginBottom: 15 }}
            />
            <Text style={styles.studyTitle}>Ready to Learn</Text>
            <Text style={styles.studyDesc}>
              You have verified ownership of this deck.
            </Text>

            <TouchableOpacity
              style={styles.studyBtn}
              onPress={() => router.push(`/deck/${id}/study`)}
            >
              <Text style={styles.studyBtnText}>Start Studying</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        ) : (
          // STATE B: LOCKED (Unlock Flow)
          <UnlockFlow
            isReady={isReady}
            isProcessing={engine.isProcessing}
            previewData={engine.previewData}
            onFileSelect={engine.processFile}
            onConfirm={handleUnlockVerification}
            onCancel={engine.resetPreview}
          />
        )}
      </ScrollView>

      {/* Hidden Engine (Only needed if NOT unlocked yet) */}
      {!isUnlocked && engine.htmlContent && (
        <View
          style={{
            height: 1,
            width: 1,
            opacity: 0,
            position: "absolute",
            top: -10,
            left: -10,
          }}
        >
          <WebView
            ref={engine.webViewRef}
            source={{ html: engine.htmlContent }}
            onMessage={engine.handleMessage}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            mixedContentMode="always"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#151718" },
  header: { marginTop: 50, paddingHorizontal: 20, marginBottom: 10 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 20, alignItems: "center" },
  coverPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: "#2C2C2C",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#444",
  },
  coverText: { fontSize: 48, fontWeight: "bold", color: "#555" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: { fontSize: 18, color: "#AAA", marginBottom: 15 },
  metaContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },
  metaText: { color: "#888", fontSize: 14 },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#333",
    marginVertical: 30,
  },

  // Study Section (Unlocked)
  studyContainer: {
    width: "100%",
    backgroundColor: "rgba(160, 113, 255, 0.1)", // Slight purple tint
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A071FF",
  },
  studyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 10,
  },
  studyDesc: { color: "#CCC", textAlign: "center", marginBottom: 25 },
  studyBtn: {
    backgroundColor: "#A071FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: "#A071FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  studyBtnText: { color: "#000", fontWeight: "bold", fontSize: 18 },
});
