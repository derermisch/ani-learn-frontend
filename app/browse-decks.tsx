import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Deck } from "@/constants/types";
import { getAllDecks } from "@/services/api";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function BrowseDecksScreen() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getAllDecks();
    setDecks(data);
    setLoading(false);
  };

  const filtered = decks.filter(
    (d) =>
      d.show_title.toLowerCase().includes(search.toLowerCase()) ||
      d.creator_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "",
          headerStyle: { backgroundColor: "#151718" },
        }}
      />

      <View style={styles.header}>
        <ThemedText type="title">Library</ThemedText>
        <TouchableOpacity onPress={loadData}>
          <IconSymbol name="arrow.clockwise" size={20} color="#A071FF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <IconSymbol name="magnifyingglass" size={20} color="#666" />
        <TextInput
          style={styles.input}
          placeholder="Search shows or creators..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator size="large" color="#A071FF" />
        ) : (
          filtered.map((deck) => (
            <TouchableOpacity
              key={deck.id}
              style={styles.card}
              onPress={() => {
                // Note: We haven't built the details page yet, but this is where it would go
                // router.push(`/deck/${deck.id}`)
              }}
            >
              <View
                style={[
                  styles.colorStrip,
                  {
                    backgroundColor:
                      deck.language === "ja" ? "#FF7171" : "#A071FF",
                  },
                ]}
              />

              <View style={styles.cardContent}>
                <View>
                  <ThemedText type="subtitle">{deck.show_title}</ThemedText>
                  <ThemedText style={styles.episodeText}>
                    Episode {deck.episode}
                  </ThemedText>
                </View>

                <View style={styles.metaContainer}>
                  <View style={styles.badge}>
                    <ThemedText style={styles.badgeText}>
                      {deck.language.toUpperCase()}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.metaText}>
                    • {deck.card_count} Cards
                  </ThemedText>
                  <ThemedText style={styles.metaText}>
                    • By {deck.creator_name}
                  </ThemedText>
                </View>
              </View>

              <IconSymbol name="chevron.right" size={20} color="#444" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    alignItems: "center",
  },
  searchBar: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#252829",
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    gap: 10,
  },
  input: { flex: 1, color: "#FFF", fontSize: 16 },
  list: { paddingHorizontal: 20, paddingBottom: 50 },

  card: {
    backgroundColor: "#1E1E1E",
    marginBottom: 15,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    height: 90,
    paddingRight: 15,
  },
  colorStrip: { width: 6, height: "100%" },
  cardContent: { flex: 1, padding: 15, justifyContent: "center" },
  episodeText: { color: "#AAA", fontSize: 14, marginTop: 2 },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  metaText: { color: "#666", fontSize: 12 },
  badge: {
    backgroundColor: "#333",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "bold" },
});
