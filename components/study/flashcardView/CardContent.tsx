import { EnrichedFlashcard } from "@/app/deck/[id]/study";
import { InteractiveText } from "@/components/study/InteractiveText";
import { Colors, f } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, Text as RNText, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";

interface CardContentProps {
  activeCard: EnrichedFlashcard;
  isRevealed: boolean;
  definition: any;
  handleWordPress: (word: string, meta: object) => void;
}

export function CardContent({
  activeCard,
  isRevealed,
  definition,
  handleWordPress,
}: CardContentProps) {
  const contextPhrase = activeCard?.context_card;

  // --- HELPERS ---
  const renderGloss = (gloss: string | string[]) => {
    if (Array.isArray(gloss)) return gloss.join("; ");
    return gloss;
  };

  const renderHighlightedContext = () => {
    if (!contextPhrase) return null;

    try {
      const tokensWithInfo = JSON.parse(contextPhrase.raw_data).tokens;
      const target = activeCard.front;

      // Styles
      const notActiveClassString = "font-japanese-light text-foreground";
      const activeClassString = "font-japanese-medium text-foreground";
      const textStyle = { fontSize: f(20) };

      return (
        <View className="flex-row">
          <RNText className="flex-wrap text-center" style={{ width: "100%" }}>
            {tokensWithInfo.map((item: any, index: number) => {
              const isTarget = item.token === target;
              const hasMeta =
                item.model_to_result &&
                Object.keys(item.model_to_result).length > 0;

              return (
                <RNText
                  key={index}
                  onPress={
                    hasMeta
                      ? () =>
                          handleWordPress(
                            item.token,
                            item.model_to_result || {},
                          )
                      : undefined
                  }
                  suppressHighlighting={false}
                  className={
                    isTarget ? activeClassString : notActiveClassString
                  }
                  style={{
                    color: Colors.dark.text,
                    ...textStyle,
                  }}
                >
                  {item.token}
                </RNText>
              );
            })}
          </RNText>
        </View>
      );
    } catch (e) {
      console.warn("Failed to parse context tokens", e);
      return null;
    }
  };

  return (
    <>
      {/* 1. BACKGROUND IMAGE & GRADIENT */}
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

      {isRevealed && (
        <Animated.View
          entering={FadeIn.duration(500)}
          className="absolute bottom-0 left-0 right-0 h-[64px] z-10"
        >
          <LinearGradient
            colors={[
              `${activeCard.img_url ? "rgba(33, 33, 36, 0)" : "rgb(48, 48, 54, 0)"}`,
              `${activeCard.img_url ? "rgba(33, 33, 36, 0.95)" : "rgb(48, 48, 54, 0.95)"}`,
              "rgba(101, 126, 212, 1)",
            ]}
            locations={[0, 0.15, 1]}
            className="w-full h-full"
          />
        </Animated.View>
      )}

      {/* 2. MAIN CONTENT AREA */}
      <View className="flex-1 items-center justify-center z-20 p-xs_12 gap-sm_16">
        {/* --- FRONT --- */}
        <Animated.View
          layout={Layout.springify()}
          className="items-center w-full"
        >
          <View className="text-foreground font-japanese-semibold text-center">
            <InteractiveText
              text={activeCard.front}
              furigana={(activeCard as any).front_furigana}
              onPressWord={handleWordPress}
              size={f(48)}
            />
          </View>

          {activeCard.type === "word" && renderHighlightedContext()}
        </Animated.View>

        {/* --- DIVIDER --- */}
        {isRevealed && (
          <Animated.View
            className="h-[1px] bg-muted w-full"
            entering={FadeInDown.duration(400)}
          />
        )}

        {/* --- BACK (Revealed) --- */}
        {isRevealed && (
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="w-full items-center"
          >
            {activeCard.type === "word" ? (
              <View className="w-full text-center gap-xs_12">
                {definition ? (
                  <View>
                    {(Array.isArray(definition.sense)
                      ? definition.sense
                      : [definition.sense]
                    )
                      .slice(0, 3)
                      .map((s: any, i: number, arr: any[]) => (
                        <View key={i}>
                          <Text
                            className={`text-foreground font-sans-medium ${
                              arr.length > 1 ? "text-left" : "text-center"
                            }`}
                            style={{ fontSize: f(20) }}
                          >
                            {arr.length > 1 ? i + 1 + ". " : ""}
                            {renderGloss(s.gloss)}
                          </Text>
                        </View>
                      ))}
                  </View>
                ) : (
                  <Text className="text-foreground text-center italic opacity-50">
                    Loading definition...
                  </Text>
                )}

                {contextPhrase && (
                  <Text
                    className="font-sans-light text-foreground text-center"
                    style={{ fontSize: f(14) }}
                  >
                    {contextPhrase.back}
                  </Text>
                )}
              </View>
            ) : (
              // PHRASE CARD BACK
              <View>
                <Text
                  className="text-sans-light text-foreground text-center"
                  style={{ fontSize: f(24) }}
                >
                  {activeCard.back}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </>
  );
}
