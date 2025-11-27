import { Deck } from "@/constants/types";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface DeckCardProps {
  deck: Deck;
}

export default function DeckCard({ deck }: DeckCardProps) {
  const router = useRouter();

  // 1. Safe Fallbacks
  const title = deck.title || "Untitled";
  const lang = deck.lang || "??";
  const episode = deck.episode || "?";
  // Ensure title is a string before substring
  const placeholderChar = (typeof title === "string" ? title : "U")
    .substring(0, 2)
    .toUpperCase();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/deck/${deck.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.imagePlaceholder}>
        <Text style={styles.placeholderText}>{placeholderChar}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle}>Episode {episode}</Text>
        <View style={styles.metaRow}>
          <View style={styles.badge}>
            {/* 2. Safe Uppercase */}
            <Text style={styles.badgeText}>{lang.toUpperCase()}</Text>
          </View>
          <Text style={styles.metaText}>{deck.cards} cards</Text>
        </View>
        <Text style={styles.creator}>by {deck.creator_name || "Admin"}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    flexDirection: "row",
    height: 100,
    borderWidth: 1,
    borderColor: "#333",
  },
  imagePlaceholder: {
    width: 80,
    height: "100%",
    backgroundColor: "#2C2C2C",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#555",
    fontSize: 24,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  title: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    color: "#AAA",
    fontSize: 14,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    backgroundColor: "#333",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  metaText: {
    color: "#666",
    fontSize: 12,
  },
  creator: {
    color: "#555",
    fontSize: 10,
    fontStyle: "italic",
  },
});
