import { Colors } from "@/constants/theme";
import { OwnedDeck, storageService } from "@/services/StorageService";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { Funnel, Gear } from "phosphor-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Get screen width to calculate card size dynamically
const { width } = Dimensions.get("window");
const COLUMN_GAP = 12;
const CARD_WIDTH = (width - 40 - COLUMN_GAP) / 2;

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [decks, setDecks] = useState<OwnedDeck[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload data every time we enter the screen
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Fetch directly from our local SQLite DB
      const localDecks = await storageService.getOwnedDecks();
      setDecks(localDecks);
    } catch (e) {
      console.error("Failed to load library:", e);
    } finally {
      setLoading(false);
    }
  };

  const renderDeckItem = ({ item }: { item: OwnedDeck }) => (
    <GridDeckCard
      deck={item}
      // ✅ CHANGED: Now navigates to the Dashboard instead of the generic ID page
      onPress={() => router.push(`/deck/${item.id}/dashboard`)}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>YOUR LIBRARY</Text>
        <TouchableOpacity>
          <Gear size={26} color="#FFF" weight="fill" />
        </TouchableOpacity>
      </View>

      {/* SUB-HEADER & FILTER */}
      <View style={styles.subHeader}>
        <Text style={styles.sectionTitle}>Decks you study</Text>
        <TouchableOpacity>
          <Funnel size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* GRID CONTENT */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.dark.tertiary} />
        </View>
      ) : (
        <FlatList
          data={decks}
          renderItem={renderDeckItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={{ gap: COLUMN_GAP }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadData}
              tintColor={Colors.dark.tertiary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={64} color="#333" />
              <Text style={styles.emptyText}>Your library is empty.</Text>
              <Text style={styles.emptySubText}>
                Unlock decks from the home screen to see them here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// --- VERTICAL GRID CARD (Matches your screenshot) ---
const GridDeckCard = ({
  deck,
  onPress,
}: {
  deck: OwnedDeck;
  onPress: () => void;
}) => {
  const getPlaceholderColor = (str: string) => {
    const colors = ["#F59E0B", "#EF4444", "#3B82F6", "#10B981", "#8B5CF6"];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const bg = getPlaceholderColor(deck.title || "?");
  const placeholderChar = (deck.title || "U").substring(0, 2).toUpperCase();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bg }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Placeholder Image Area */}
      <View style={styles.cardImageArea}>
        <Text style={styles.cardPlaceholderText}>{placeholderChar}</Text>
      </View>

      {/* Glassmorphism Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {deck.title || "Untitled Deck"}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>epis. 1</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: "40%" }]} />
        </View>
        <Text style={styles.progressText}>progress: 40%</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontFamily: "YeonSung",
    fontSize: 32,
    color: "#E0E0E0",
  },

  subHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 18,
    fontFamily: "Quicksand-Regular",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    elevation: 4,
  },
  cardImageArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardPlaceholderText: {
    fontSize: 60,
    fontWeight: "900",
    color: "rgba(255,255,255,0.3)",
  },
  cardFooter: {
    height: 70,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    justifyContent: "center",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTitle: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
    flex: 1,
    marginRight: 4,
  },
  badge: {
    backgroundColor: "#333",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: "#AAA",
    fontSize: 8,
    fontWeight: "bold",
  },
  progressContainer: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    marginBottom: 4,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#A071FF",
    borderRadius: 2,
  },
  progressText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 9,
    textAlign: "center",
  },

  emptyState: {
    alignItems: "center",
    marginTop: 100,
    gap: 10,
  },
  emptyText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  emptySubText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    width: "70%",
  },
});
