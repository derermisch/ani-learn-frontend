import { Colors, f } from "@/constants/theme";
import { Flashcard } from "@/constants/types";
import { fsrsService } from "@/services/FSRSService";
import { JsonDatabase } from "@/services/jsonDatabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ListNumbers, Play, Shuffle, X } from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { State } from "ts-fsrs";

// --- TYPES ---
type StudyMode = "word" | "phrase";
type StudyOrder = "ordered" | "shuffled";
type DisplayMode = "furigana" | "romaji";

export default function StudyScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- SETTINGS STATE ---
  const [isSetup, setIsSetup] = useState(false);
  const [mode, setMode] = useState<StudyMode>("phrase");
  const [order, setOrder] = useState<StudyOrder>("shuffled");
  const [display, setDisplay] = useState<DisplayMode>("romaji");

  // --- SESSION STATE ---
  const [allDeckCards, setAllDeckCards] = useState<Flashcard[]>([]);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  // Animation State
  const flipRotation = useSharedValue(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // --- 1. LOAD DATA ---
  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allCards = await JsonDatabase.getCards();
      // Filter only for this deck, but keep all types (words/phrases) for now
      const deckCards = allCards.filter((c) => c.deck_id === id);
      setAllDeckCards(deckCards);
    } catch (e) {
      Alert.alert("Error", "Failed to load session.");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. START SESSION (Filter based on Settings) ---
  const startSession = () => {
    const now = new Date();

    // A. Filter by Mode (Word vs Phrase)
    let sessionCards = allDeckCards.filter((c) => c.type === mode);

    // B. Filter by FSRS Logic (Due or New)
    sessionCards = sessionCards.filter((c) => {
      return c.state === State.New || c.due <= now;
    });

    // C. Apply Order
    if (order === "shuffled") {
      sessionCards = sessionCards.sort(() => Math.random() - 0.5);
    } else {
      // Default FSRS sort: Due Date ascending
      sessionCards = sessionCards.sort(
        (a, b) => a.due.getTime() - b.due.getTime()
      );
    }

    if (sessionCards.length === 0) {
      Alert.alert("No Cards", `No ${mode}s due for review right now.`);
      return;
    }

    setQueue(sessionCards);
    setIsSetup(true);
  };

  // --- 3. ACTIONS ---
  const activeCard = queue[0];

  const handleRate = async (isPass: boolean) => {
    if (!activeCard) return;

    // A. Calculate FSRS math
    const { card: updatedCard, log } = fsrsService.processReview(
      activeCard,
      isPass
    );

    // --- DEBUG LOGGING ---
    console.log(`\n[REVIEW] Card: ${activeCard.front}`);
    console.log(`  Rating: ${isPass ? "PASS (Good)" : "FAIL (Again)"}`);
    console.log(
      `  New State: S=${Number(updatedCard.stability).toFixed(2)}, D=${Number(updatedCard.difficulty).toFixed(2)}`
    );
    console.log(`  Next Due: ${updatedCard.due.toLocaleString()}`);
    // Fix: Access log.log.scheduled_days if log is nested, or log.scheduled_days if direct
    // Based on previous fix, log is the ReviewLog object
    console.log(`  Interval: ${log.scheduled_days} days`);

    // B. Persist to DB
    await JsonDatabase.updateCard(updatedCard);

    // B2. FIX: Update Local State (allDeckCards)
    // This ensures that if you hit 'X' and restart, the card data is fresh
    setAllDeckCards((prev) =>
      prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
    );

    // C. Reset Animation
    flipRotation.value = withTiming(0, { duration: 0 });
    setIsFlipped(false);

    // D. Queue Management
    if (!isPass) {
      // FAIL: Re-queue at the end
      setQueue((prev) => [...prev.slice(1), updatedCard]);
    } else {
      // PASS: Graduate
      setQueue((prev) => prev.slice(1));
    }
  };

  const handleFlip = () => {
    flipRotation.value = withTiming(isFlipped ? 0 : 180, { duration: 300 });
    setIsFlipped(!isFlipped);
  };

  // --- ANIMATIONS ---
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(flipRotation.value, [0, 180], [0, 180]);
    return {
      transform: [{ rotateY: `${rotateValue}deg` }],
      opacity: rotateValue < 90 ? 1 : 0,
      zIndex: rotateValue < 90 ? 1 : 0,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(flipRotation.value, [0, 180], [180, 360]);
    return {
      transform: [{ rotateY: `${rotateValue}deg` }],
      opacity: flipRotation.value > 90 ? 1 : 0,
      zIndex: flipRotation.value > 90 ? 1 : 0,
    };
  });

  if (loading) return <ActivityIndicator style={{ marginTop: 100 }} />;

  // ==========================================
  // VIEW: SETUP SCREEN
  // ==========================================
  if (!isSetup) {
    return (
      <View className="flex-1 bg-background px-5">
        <View
          style={{ paddingTop: insets.top + 20 }}
          className="flex-row items-center mb-8"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 bg-surface rounded-full mr-4"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text className="text-foreground font-heading text-3xl">
            Study Options
          </Text>
        </View>

        {/* Option 1: Mode */}
        <View className="mb-8">
          <Text className="text-foreground/60 font-bold mb-3 uppercase text-xs tracking-widest">
            Card Type
          </Text>
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => setMode("word")}
              className={`flex-1 p-4 rounded-xl border-2 items-center ${mode === "word" ? "border-tertiary bg-tertiary/10" : "border-white/10 bg-surface"}`}
            >
              <Text
                className={`font-bold ${mode === "word" ? "text-tertiary" : "text-foreground"}`}
              >
                Words
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode("phrase")}
              className={`flex-1 p-4 rounded-xl border-2 items-center ${mode === "phrase" ? "border-tertiary bg-tertiary/10" : "border-white/10 bg-surface"}`}
            >
              <Text
                className={`font-bold ${mode === "phrase" ? "text-tertiary" : "text-foreground"}`}
              >
                Phrases
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Option 2: Order */}
        <View className="mb-8">
          <Text className="text-foreground/60 font-bold mb-3 uppercase text-xs tracking-widest">
            Order
          </Text>
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => setOrder("ordered")}
              className={`flex-1 p-4 rounded-xl border-2 flex-row justify-center gap-2 items-center ${order === "ordered" ? "border-tertiary bg-tertiary/10" : "border-white/10 bg-surface"}`}
            >
              <ListNumbers
                size={20}
                color={
                  order === "ordered" ? Colors.dark.tertiary : Colors.dark.text
                }
              />
              <Text
                className={`font-bold ${order === "ordered" ? "text-tertiary" : "text-foreground"}`}
              >
                Ordered
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setOrder("shuffled")}
              className={`flex-1 p-4 rounded-xl border-2 flex-row justify-center gap-2 items-center ${order === "shuffled" ? "border-tertiary bg-tertiary/10" : "border-white/10 bg-surface"}`}
            >
              <Shuffle
                size={20}
                color={
                  order === "shuffled" ? Colors.dark.tertiary : Colors.dark.text
                }
              />
              <Text
                className={`font-bold ${order === "shuffled" ? "text-tertiary" : "text-foreground"}`}
              >
                Shuffled
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Option 3: Display */}
        <View className="mb-12">
          <Text className="text-foreground/60 font-bold mb-3 uppercase text-xs tracking-widest">
            Display
          </Text>
          <View className="bg-surface rounded-xl p-4 flex-row justify-between items-center border border-white/10">
            <Text className="text-foreground font-bold">Show Romaji</Text>
            <Switch
              value={display === "romaji"}
              onValueChange={(v) => setDisplay(v ? "romaji" : "furigana")}
              trackColor={{ false: "#333", true: Colors.dark.tertiary }}
            />
          </View>
          <Text className="text-foreground/40 text-xs mt-2 ml-1">
            {display === "romaji"
              ? "Currently showing alphabet (abc)"
              : "Currently showing Japanese (kana)"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={startSession}
          className="bg-tertiary w-full p-5 rounded-full flex-row justify-center items-center shadow-lg shadow-tertiary/50"
        >
          <Play weight="fill" color="white" size={24} />
          <Text className="text-white font-bold text-lg ml-2">
            Start Session
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================
  // VIEW: CARD SESSION
  // ==========================================

  if (!activeCard) {
    return (
      <View className="flex-1 bg-background justify-center items-center p-5">
        <Text className="text-foreground text-2xl mb-4 font-heading">
          All Done!
        </Text>
        <Text className="text-foreground/60 mb-8 text-center">
          You have reviewed all cards due for today.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-tertiary px-6 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Finish Session</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="flex-row justify-between items-center px-5 pt-4 pb-2"
        style={{ marginTop: insets.top }}
      >
        <TouchableOpacity onPress={() => setIsSetup(false)}>
          <Ionicons name="close" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text className="text-foreground/50 font-bold">
          {queue.length} Remaining
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Card Area */}
      <View className="flex-1 justify-center items-center p-5">
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleFlip}
          style={{ width: "100%", height: "65%" }}
        >
          {/* FRONT */}
          <Animated.View
            style={[styles.cardFace, frontAnimatedStyle]}
            className="bg-surface rounded-3xl border border-white/10 items-center justify-center p-6 shadow-xl"
          >
            <Text
              className="text-foreground font-heading text-center"
              style={{ fontSize: f(32) }}
            >
              {activeCard.front}
            </Text>
            <Text className="text-foreground/30 absolute bottom-8 text-sm">
              Tap to flip
            </Text>
          </Animated.View>

          {/* BACK */}
          <Animated.View
            style={[styles.cardFace, backAnimatedStyle]}
            className="bg-surface rounded-3xl border-2 border-tertiary/50 items-center justify-center p-6 shadow-xl"
          >
            <Text className="text-tertiary font-bold mb-4 uppercase tracking-widest text-sm">
              Meaning
            </Text>
            <Text
              className="text-foreground font-heading text-center"
              style={{ fontSize: f(28) }}
            >
              {activeCard.back}
            </Text>

            {/* Pronunciation Hint */}
            {activeCard.pronunciation && (
              <Text className="text-foreground/50 text-xl font-medium mt-4">
                {display === "romaji" ? activeCard.pronunciation : "---"}
              </Text>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* 2-BUTTON CONTROLS */}
      <View className="h-[140px] px-4 pb-8 justify-center items-center">
        {isFlipped ? (
          <View className="flex-row gap-12 items-center">
            {/* FAIL */}
            <View className="items-center gap-2">
              <TouchableOpacity
                onPress={() => handleRate(false)}
                className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500 items-center justify-center"
              >
                <X size={32} color="#EF4444" weight="bold" />
              </TouchableOpacity>
              <Text className="text-red-400 font-bold text-xs uppercase">
                Forgot
              </Text>
            </View>

            {/* PASS */}
            <View className="items-center gap-2">
              <TouchableOpacity
                onPress={() => handleRate(true)}
                className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 items-center justify-center shadow-lg shadow-green-900"
              >
                <Check size={40} color="#22C55E" weight="bold" />
              </TouchableOpacity>
              <Text className="text-green-400 font-bold text-xs uppercase">
                Got It
              </Text>
            </View>
          </View>
        ) : (
          <Text className="text-center text-foreground/30">
            Tap card to see answer
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardFace: {
    width: "100%",
    height: "100%",
    position: "absolute",
    backfaceVisibility: "hidden",
  },
});
