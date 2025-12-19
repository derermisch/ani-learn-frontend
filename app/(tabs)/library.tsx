import { IconSymbol } from "@/components/ui/icon-symbol";
import { Deck } from "@/constants/types";
import { getUserLibrary } from "@/services/api";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { DeckCard } from "../../components/DeckCard";

type Tab = "decks" | "words";

export default function LibraryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("decks");

  const [decks, setDecks] = useState<Deck[]>([]);
  const [words, setWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Refresh data whenever screen comes into focus (in case user just unlocked something)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    const data = await getUserLibrary();
    setDecks(data.decks);
    setWords(data.words);
    setLoading(false);
  };

  const renderDeck = ({ item }: { item: Deck }) => (
    <DeckCard deck={item} onPress={() => router.push(`/deck/${item.id}`)} />
  );

  const renderWord = ({ item }: { item: string }) => (
    <View style={styles.wordBadge}>
      <Text style={styles.wordText}>{item}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconSymbol name="arrow.left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Library</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "decks" && styles.activeTab]}
          onPress={() => setActiveTab("decks")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "decks" && styles.activeTabText,
            ]}
          >
            Decks ({decks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "words" && styles.activeTab]}
          onPress={() => setActiveTab("words")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "words" && styles.activeTabText,
            ]}
          >
            Words ({words.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#A071FF" />
        </View>
      ) : (
        <View style={styles.content}>
          {activeTab === "decks" ? (
            <FlatList
              data={decks}
              renderItem={renderDeck}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={loadData}
                  tintColor="#A071FF"
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <IconSymbol name="doc.text" size={48} color="#444" />
                  <Text style={styles.emptyText}>
                    You haven't unlocked any decks yet.
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={words}
              renderItem={renderWord}
              keyExtractor={(item, index) => index.toString()}
              numColumns={3} // Grid layout for words
              contentContainerStyle={{ paddingBottom: 20 }}
              columnWrapperStyle={{ gap: 10 }}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={loadData}
                  tintColor="#A071FF"
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <IconSymbol
                    name="character.book.closed.fill"
                    size={48}
                    color="#444"
                  />
                  <Text style={styles.emptyText}>
                    No known words yet. Start studying!
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#151718" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#FFF", fontSize: 20, fontWeight: "bold" },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#333",
  },
  tabText: {
    color: "#888",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#FFF",
  },

  content: { flex: 1, paddingHorizontal: 20 },

  // Word Items
  wordBadge: {
    flex: 1,
    backgroundColor: "#2C2C2C",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  wordText: {
    color: "#FFF",
    fontSize: 16,
  },

  // Empty
  emptyState: {
    alignItems: "center",
    marginTop: 100,
    gap: 15,
  },
  emptyText: {
    color: "#666",
    fontSize: 16,
  },
});
