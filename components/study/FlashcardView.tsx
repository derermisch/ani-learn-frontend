import { EnrichedFlashcard } from "@/app/deck/[id]/study";
import { DictionaryModal } from "@/components/modals/DictionaryModal";
import { InteractiveText } from "@/components/study/InteractiveText";
import { Colors, f, SizesRaw } from "@/constants/theme";
import { Flashcard } from "@/constants/types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; // <--- Import Gradient
import { Check, Star, X as XIcon } from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  interpolateColor,
  Layout,
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
  const [isRevealed, setIsRevealed] = useState(false);
  const [dictModalVisible, setDictModalVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState("");

  const handleWordPress = (word: string) => {
    setSelectedWord(word);
    setDictModalVisible(true);
  };

  // Animation Value for Border Color
  const revealProgress = useSharedValue(0);

  const activeCard = queue[0];
  const contextPhrase = activeCard?.context_card;

  // Trigger animation when reveal state changes
  useEffect(() => {
    revealProgress.value = withTiming(isRevealed ? 1 : 0, { duration: 500 });
  }, [isRevealed]);

  const handleRate = (isPass: boolean) => {
    setIsRevealed(false);
    onRate(activeCard, isPass);
  };

  // --- ANIMATED STYLES ---
  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      revealProgress.value,
      [0, 1],
      [Colors.dark.border, Colors.dark.primary] // From Grey to Primary/Tertiary
    );
    return { borderColor, borderWidth: 2 }; // Ensure width is set
  });

  const renderHighlightedContext = () => {
    if (!contextPhrase) return null;
    const fullText = contextPhrase.front;
    const target = activeCard.front;
    const parts = fullText.split(new RegExp(`(${target})`, "g"));

    return (
      <Text
        className="text-center text-foreground font-heading"
        style={{ fontSize: f(20), lineHeight: f(32) }}
      >
        {parts.map((part, index) => {
          const isTarget = part === target;
          return (
            <Text
              key={index}
              className={
                isTarget ? "text-white font-bold" : "text-white/60 font-light"
              }
              style={isTarget ? { color: Colors.dark.tertiary } : {}}
            >
              {part}
            </Text>
          );
        })}
      </Text>
    );
  };

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

  const remainingCount = queue.length;
  const starsToShow = Math.min(remainingCount, 8);

  return (
    <View
      className="flex-1 bg-background"
      style={{
        paddingBottom: insets.bottom + 20,
        paddingTop: insets.top + 10,
      }}
    >
      {/* TOP BAR */}
      <View className="flex-row justify-between items-center px-4 mb-4">
        <TouchableOpacity onPress={onBack}>
          <Ionicons
            name="arrow-back"
            size={SizesRaw.iconMd}
            color={activeColors.text}
          />
        </TouchableOpacity>

        <View className="flex-row items-center bg-surface px-3 py-1 rounded-full gap-1">
          {Array.from({ length: starsToShow }).map((_, i) => (
            <Star key={i} size={14} weight="fill" color="white" opacity={0.9} />
          ))}
          {remainingCount > 8 && (
            <Text className="text-white/70 text-xs ml-1 font-bold">
              +{remainingCount - 8}
            </Text>
          )}
        </View>

        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* CARD AREA */}
      <View className="flex-1 px-4">
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsRevealed((prev) => !prev)}
          style={{ flex: 1 }} // Needed for proper layout
        >
          <Animated.View
            // Apply Animated Border Style here
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
            {/* 1. BACKGROUND LAYER */}
            <View className="absolute inset-0 bg-surface z-0" />

            {/* Revealed Background Image */}
            {isRevealed && activeCard.img_url && (
              <Animated.View
                entering={FadeIn.duration(700)}
                className="absolute inset-0 z-0"
              >
                <Image
                  source={{ uri: activeCard.img_url }}
                  className="w-full h-full"
                  resizeMode="cover"
                  blurRadius={1}
                />
                <View className="absolute inset-0 bg-black/30" />
              </Animated.View>
            )}

            {/* 2. GRADIENT OVERLAY (Bottom) */}
            {isRevealed && (
              <Animated.View
                entering={FadeIn.duration(500)}
                className="absolute bottom-0 left-0 right-0 h-[64px] z-10" // Height covers button area
              >
                <LinearGradient
                  colors={[
                    `${activeCard.img_url ? "rgba(33, 33, 36, 0)" : "rgb(48, 48, 54, 0)"}`,
                    `${activeCard.img_url ? "rgba(33, 33, 36, 0.95)" : "rgb(48, 48, 54, 0.95)"}`,
                    "rgba(101, 126, 212, 1)",
                  ]}
                  locations={[0, 0.15, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{ width: "100%", height: "100%" }}
                />
              </Animated.View>
            )}

            {/* 3. CONTENT CONTAINER */}
            <View className="flex-1 items-center justify-center z-20">
              {/* FRONT */}
              <Animated.View
                layout={Layout.springify()}
                className="items-center w-full"
              >
                {/* {activeCard.type === "word" &&
                  activeCard.front_furigana !== activeCard.front && (
                    <Text
                      className="text-foreground text-center font-japanese mb-[-6px]"
                      style={{ fontSize: f(12) }}
                    >
                      {activeCard.front_furigana || ""}
                    </Text>
                  )} */}

                <View className="text-foreground font-japanese-semibold text-center">
                  <InteractiveText
                    text={activeCard.front}
                    furigana={activeCard.front_furigana}
                    onPressWord={handleWordPress}
                    size={f(48)}
                  />
                </View>

                {activeCard.type === "word" && renderHighlightedContext()}

                {/* {!isRevealed && (
                  <Text className="text-white/40 text-sm mt-8 text-center">
                    Tap to reveal meaning
                  </Text>
                )} */}
              </Animated.View>

              {/* Horizontal Line */}
              {isRevealed && (
                <Animated.View
                  className="h-[1px] bg-white/30 w-full my-6"
                  entering={FadeInDown.duration(400)}
                />
              )}

              {/* BACK (Revealed) */}
              {isRevealed && (
                <Animated.View
                  entering={FadeInDown.duration(400)}
                  className="w-full items-center gap-sm_12"
                >
                  <Text
                    className="text-foreground text-center font-semibold shadow-md font-sans"
                    style={{
                      fontSize: f(20),
                    }}
                  >
                    {activeCard.back}
                  </Text>

                  {contextPhrase && (
                    <Text
                      className="text-foreground text-center font-sans font-light"
                      style={{ fontSize: f(14) }}
                    >
                      {contextPhrase.back}
                    </Text>
                  )}
                </Animated.View>
              )}
            </View>

            {/* 4. ACTION BUTTONS */}
            {isRevealed && (
              <Animated.View
                entering={FadeIn.delay(200)}
                className="absolute bottom-8 left-0 right-0 flex-row justify-center gap-8 z-30"
              >
                <TouchableOpacity
                  onPress={() => handleRate(false)}
                  className="w-16 h-16 rounded-full bg-[#FF6B6B] items-center justify-center shadow-lg border border-white/20"
                >
                  <XIcon size={32} color="black" weight="bold" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleRate(true)}
                  className="w-16 h-16 rounded-full bg-[#61E786] items-center justify-center shadow-lg border border-white/20"
                >
                  <Check size={32} color="black" weight="bold" />
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>

      <DictionaryModal
        visible={dictModalVisible}
        word={selectedWord}
        onClose={() => setDictModalVisible(false)}
      />
    </View>
  );
}
