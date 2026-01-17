import { EnrichedFlashcard } from "@/app/deck/[id]/study";
import { DictionaryModal } from "@/components/modals/DictionaryModal";
import { ActionButtons } from "@/components/study/flashcardView/ActionButtons";
import { CardContent } from "@/components/study/flashcardView/CardContent";
import { TopBar } from "@/components/study/flashcardView/TopBar";
import { Colors, SizesRaw } from "@/constants/theme";
import { Flashcard } from "@/constants/types";
import { dictionaryService } from "@/services/DictionaryService";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  queue: EnrichedFlashcard[];
  onRate: (card: Flashcard, isPass: boolean) => void;
  onBack: () => void;
}

export function FlashcardView({ queue, onRate, onBack }: Props) {
  const activeColors = Colors["dark"];
  const insets = useSafeAreaInsets();

  // State
  const [isRevealed, setIsRevealed] = useState(false);
  const [dictModalVisible, setDictModalVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");
  const [selectedMeta, setSelectedMeta] = useState({});
  const [definition, setDefinition] = useState<any>(null);

  const activeCard = queue[0];
  const revealProgress = useSharedValue(0);

  // --- EFFECTS ---

  // 1. Reset state when card changes
  useEffect(() => {
    setDefinition(null);
    setIsRevealed(false); // Changed to false to start hidden
  }, [activeCard]);

  // 2. Fetch definition when revealed (if Word)
  useEffect(() => {
    const loadDef = async () => {
      if (
        isRevealed &&
        activeCard?.type === "word" &&
        activeCard.dictionary_entry_id
      ) {
        const data = await dictionaryService.getEntryById(
          activeCard.dictionary_entry_id,
        );
        setDefinition(data);
      }
    };
    loadDef();
  }, [isRevealed, activeCard]);

  // 3. Animate Border
  useEffect(() => {
    revealProgress.value = withTiming(isRevealed ? 1 : 0, { duration: 500 });
  }, [isRevealed]);

  // --- HANDLERS ---

  const handleRate = (isPass: boolean) => {
    setIsRevealed(false);
    onRate(activeCard, isPass);
  };

  const handleWordPress = (word: string, meta: object) => {
    setSelectedWord(word);
    setSelectedMeta(meta);
    setDictModalVisible(true);
  };

  // --- ANIMATED STYLES ---
  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      revealProgress.value,
      [0, 1],
      [activeColors.border, activeColors.primary],
    );
    return { borderColor, borderWidth: 2 };
  });

  // --- RENDER: FINISHED STATE ---
  if (!activeCard) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <Text className="text-white font-heading text-3xl">
          Session Complete!
        </Text>
        <TouchableOpacity
          onPress={onBack}
          className="mt-8 bg-tertiary px-8 py-3 rounded-full"
        >
          <Text className="text-black font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- RENDER: ACTIVE CARD ---
  return (
    <View
      className="flex-1 bg-background gap-sm_24 px-sm_16"
      style={{
        paddingBottom: insets.bottom + SizesRaw.spacing.sm_16,
        paddingTop: insets.top + SizesRaw.spacing.sm_16,
      }}
    >
      <TopBar onBack={onBack} remainingCount={queue.length} />

      {/* Main Card Area */}
      <View className="flex-1">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsRevealed((prev) => !prev)}
          style={{ flex: 1 }}
        >
          <Animated.View
            style={[
              {
                flex: 1,
                borderRadius: 32,
                overflow: "hidden",
                backgroundColor: activeColors.surface,
              },
              animatedBorderStyle,
            ]}
          >
            {/* Background Layer */}
            <View className="absolute inset-0 bg-surface z-0" />

            <CardContent
              activeCard={activeCard}
              isRevealed={isRevealed}
              definition={definition}
              handleWordPress={handleWordPress}
            />

            {isRevealed && <ActionButtons onRate={handleRate} />}
          </Animated.View>
        </TouchableOpacity>
      </View>

      <DictionaryModal
        visible={dictModalVisible}
        word={selectedWord}
        meta={selectedMeta}
        onClose={() => setDictModalVisible(false)}
      />
    </View>
  );
}
