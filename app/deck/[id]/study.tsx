import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Flashcard } from "../../../components/deck/Flashcard";
import { Card } from "../../../constants/types";
import { getDeckCards } from "../../../services/api";

export default function StudyScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (id) loadCards(id as string);
  }, [id]);

  const loadCards = async (deckId: string) => {
    try {
      const data = await getDeckCards(deckId);
      if (data && data.length > 0) {
        setCards(data);
      } else {
        Alert.alert("Empty Deck", "This deck has no cards yet.", [
          { text: "Go Back", onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to load cards.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (index < cards.length - 1) {
      setIndex(index + 1);
    } else {
      Alert.alert("Great Job!", "You have finished studying this deck.", [
        { text: "Finish", onPress: () => router.back() },
        { text: "Restart", onPress: () => setIndex(0) },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A071FF" />
        <Text style={styles.loadingText}>Loading Flashcards...</Text>
      </View>
    );
  }

  if (cards.length === 0) return null;

  // Safe calculation for progress
  const progressPercent =
    cards.length > 0 ? ((index + 1) / cards.length) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.progressPill}>
          <Text style={styles.progressText}>
            {index + 1} / {cards.length}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
        />
      </View>

      {/* Card Area */}
      <Flashcard
        card={cards[index]}
        onNext={handleNext}
        isLast={index === cards.length - 1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#151718",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#151718",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#666",
    marginTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  progressPill: {
    backgroundColor: "#2C2C2C",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#444",
  },
  progressText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "#333",
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#A071FF",
  },
});
