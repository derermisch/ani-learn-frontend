import { ThemedText } from "@/components/themed-text";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function DeckCard({
  title,
  progress,
  color,
}: {
  title: string;
  progress: number;
  color: string;
}) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <ThemedText type="subtitle" style={styles.title}>
        {title}
      </ThemedText>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progress}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.progressText}>{progress}% Mastered</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E1E1E", // Dark card
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    width: 160,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  title: { marginBottom: 10, fontSize: 16 },
  progressBarBg: {
    height: 6,
    backgroundColor: "#333",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%" },
  progressText: { color: "#888", fontSize: 12, marginTop: 8 },
});
