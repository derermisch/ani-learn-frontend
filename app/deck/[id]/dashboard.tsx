import { Colors } from "@/constants/theme";
import { Card, OwnedDeck } from "@/constants/types";
import { storageService } from "@/services/StorageService";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckIcon,
  FunnelIcon,
  GearIcon,
  PlayIcon,
} from "phosphor-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FilterMode = "words" | "phrases" | "all";

export default function DeckDashboardScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [deck, setDeck] = useState<OwnedDeck | null>(null);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filterMode, setFilterMode] = useState<FilterMode>("words");
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Stats
  const [progress, setProgress] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id]),
  );

  const loadData = async () => {
    try {
      if (!id) return;

      const decks = await storageService.getOwnedDecks();
      const currentDeck = decks.find((d) => d.id === id);
      setDeck(currentDeck || null);

      const deckCards = await storageService.getCards(id as string);
      setAllCards(deckCards);

      // Calc Stats (based on ALL cards)
      const studied = deckCards.filter((c) => c.state > 0).length;
      setProgress(
        deckCards.length > 0 ? (studied / deckCards.length) * 100 : 0,
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartStudy = () => {
    router.push(`/deck/${id}/study`);
  };

  // --- FILTER LOGIC ---
  const getFilteredCards = () => {
    if (filterMode === "all") return allCards;
    // Map 'words' -> 'word' type in DB
    const targetType = filterMode === "words" ? "word" : "phrase";
    return allCards.filter((c) => c.type === targetType);
  };

  const displayedCards = getFilteredCards();

  if (loading || !deck) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.dark.tertiary} />
      </View>
    );
  }

  // --- RENDERERS ---

  const renderCardItem = ({ item }: { item: Card }) => {
    let statusColor = "#333";
    let progressFlex = 0;

    if (item.state === 1) {
      statusColor = "#EAB308";
      progressFlex = 0.3;
    } // Learning
    if (item.state === 2) {
      statusColor = "#10B981";
      progressFlex = 1;
    } // Review
    if (item.state === 3) {
      statusColor = "#EF4444";
      progressFlex = 0.15;
    } // Relearning

    return (
      <View style={styles.cardItem}>
        <View style={styles.cardItemProgressTrack}>
          <View
            style={{
              flex: progressFlex,
              height: "100%",
              backgroundColor: "#A071FF",
              borderRadius: 2,
            }}
          />
        </View>
        <Text style={styles.cardFront} numberOfLines={1}>
          {item.front}
        </Text>
        <Text style={styles.cardBack} numberOfLines={3}>
          {item.type === "word" ? "(Word Definition)" : item.back}
        </Text>
      </View>
    );
  };

  const getPlaceholderColor = (str: string) => {
    const colors = ["#F59E0B", "#EF4444", "#3B82F6", "#10B981", "#8B5CF6"];
    let hash = 0;
    for (let i = 0; i < str.length; i++)
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const posterColor = getPlaceholderColor(deck.title || "?");
  const placeholderChar = (deck.title || "U").substring(0, 2).toUpperCase();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>YOUR LIBRARY</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)")}>
          <GearIcon size={26} color="#FFF" weight="fill" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* DECK INFO CARD */}
        <View style={styles.deckInfoCard}>
          <View style={styles.deckInfoLeft}>
            <View style={styles.titleRow}>
              <Text style={styles.deckTitle}>Anime - {deck.title}</Text>
              <View style={styles.actionBadge}>
                <Text style={styles.actionText}>Actions</Text>
              </View>
            </View>

            <View style={styles.metaList}>
              <Text style={styles.metaText}>episode: 1</Text>
              <Text style={styles.metaText}>creator: admin</Text>
              <Text style={styles.metaText}>
                total cards: {allCards.length}
              </Text>
              <Text style={styles.metaText}>
                progress: {Math.round(progress)}%
              </Text>
            </View>

            <View style={styles.mainProgressContainer}>
              <View
                style={[styles.mainProgressBar, { width: `${progress}%` }]}
              />
              {progress > 0 && (
                <Text style={styles.progressLabelInside}>
                  {Math.round(progress)}%
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.posterImage, { backgroundColor: posterColor }]}>
            <Text style={styles.posterText}>{placeholderChar}</Text>
          </View>
        </View>

        {/* START BUTTON */}
        <TouchableOpacity
          style={styles.startStudyBtn}
          onPress={handleStartStudy}
        >
          <PlayIcon weight="fill" color="#000" size={20} />
          <Text style={styles.startStudyText}>Start Study Session</Text>
        </TouchableOpacity>

        {/* SECTION HEADER & FILTER BUTTON */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Cards</Text>
            <Text style={styles.sectionSubtitle}>
              Showing: <Text style={{ color: "#A071FF" }}>{filterMode}</Text> (
              {displayedCards.length})
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsFilterVisible(true)}
            style={styles.filterBtn}
          >
            <FunnelIcon
              size={20}
              color={isFilterVisible ? "#FFF" : "#AAA"}
              weight={isFilterVisible ? "fill" : "regular"}
            />
          </TouchableOpacity>
        </View>

        {/* GRID */}
        <View style={styles.gridContainer}>
          {displayedCards.map((card, index) => (
            <View key={index} style={{ width: "31%", marginBottom: 12 }}>
              {renderCardItem({ item: card })}
            </View>
          ))}
          {displayedCards.length === 0 && (
            <View style={styles.emptyFilterState}>
              <Text style={{ color: "#666" }}>
                No cards found for this filter.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* --- FILTER MODAL (Bottom Sheet Style) --- */}
      <Modal
        visible={isFilterVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsFilterVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Filter Cards</Text>

                {/* Options */}
                {[
                  { id: "words", label: "Show Words Only" },
                  { id: "phrases", label: "Show Phrases Only" },
                  { id: "all", label: "Show Everything" },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.filterOption,
                      filterMode === opt.id && styles.filterOptionActive,
                    ]}
                    onPress={() => {
                      setFilterMode(opt.id as FilterMode);
                      setIsFilterVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filterMode === opt.id && styles.filterOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {filterMode === opt.id && (
                      <CheckIcon size={20} color="#A071FF" weight="bold" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#151718" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: "YeonSung",
    fontSize: 32,
    color: "#E0E0E0",
  },

  // Deck Info
  deckInfoCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  deckInfoLeft: {
    flex: 1,
    paddingRight: 10,
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  deckTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    marginRight: 4,
  },
  actionBadge: {
    borderColor: "#10B981",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  actionText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "bold",
  },
  metaList: { marginBottom: 15 },
  metaText: {
    color: "#AAA",
    fontSize: 12,
    marginBottom: 2,
    fontFamily: "Quicksand-Regular",
  },
  mainProgressContainer: {
    height: 14,
    backgroundColor: "#2C2C2C",
    borderRadius: 7,
    overflow: "hidden",
    justifyContent: "center",
  },
  mainProgressBar: { height: "100%", backgroundColor: "#A071FF" },
  progressLabelInside: {
    position: "absolute",
    width: "100%",
    textAlign: "center",
    fontSize: 9,
    fontWeight: "bold",
    color: "#FFF",
  },
  posterImage: {
    width: 100,
    height: 140,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  posterText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.3)",
  },

  // Start Button
  startStudyBtn: {
    backgroundColor: "#A071FF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 30,
    gap: 8,
  },
  startStudyText: { color: "#000", fontWeight: "bold", fontSize: 16 },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 20,
    fontFamily: "Quicksand-Regular",
  },
  sectionSubtitle: { color: "#666", fontSize: 12, marginTop: 2 },
  filterBtn: { padding: 8, backgroundColor: "#333", borderRadius: 8 },

  // Grid
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardItem: {
    backgroundColor: "#25252A",
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardItemProgressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#333",
    borderRadius: 2,
    marginBottom: 8,
  },
  cardFront: {
    color: "#FFF",
    fontSize: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  cardBack: {
    color: "#888",
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
  },
  emptyFilterState: { width: "100%", alignItems: "center", padding: 20 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  filterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  filterOptionActive: {
    backgroundColor: "#25252A",
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterOptionText: { color: "#AAA", fontSize: 16 },
  filterOptionTextActive: { color: "#FFF", fontWeight: "bold" },
});
