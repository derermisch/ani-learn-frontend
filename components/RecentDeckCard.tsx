import { Colors, f } from "@/constants/theme";
import { Deck } from "@/constants/types";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  deck: Deck;
  onPress: () => void;
  width?: number; // Optional width prop
}

export function RecentDeckCard({ deck, onPress, width = 232 }: Props) {
  const progress = 0.65;

  // Standard Poster Aspect Ratio is 2:3 (1 : 1.5)
  // If width is 260, height will be 390
  const ASPECT_RATIO = 1.5;
  const height = width * ASPECT_RATIO;

  return (
    <TouchableOpacity
      className="mr-sm_16 relative shadow-lg"
      style={{
        width: width,
        height: height,
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: Colors.dark.surface,
        borderWidth: 1,
        borderColor: Colors.dark.border,
      }}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {/* Background Image */}
      <Image
        source={{ uri: deck.cover_image }}
        style={{ width: "100%", height: "100%", position: "absolute" }}
        contentFit="cover"
        transition={200}
      />

      {/* Gradient for contrast */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)"]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "50%",
        }}
      />

      {/* Bottom Floating Panel */}
      <View
        className="absolute bottom-4 left-4 right-4 bg-white/95 rounded-xl p-3 shadow-md"
        style={{ backdropFilter: "blur(10px)" }}
      >
        {/* Title */}
        <View className="flex-row justify-between items-center mb-2">
          <Text
            className="text-black font-bold flex-1 mr-2"
            style={{ fontSize: f(18) }}
            numberOfLines={1}
          >
            {deck.title}
          </Text>
        </View>

        {/* Badges */}
        <View className="flex-row gap-2 mb-3">
          <View className="bg-black/10 px-2 py-1 rounded-md">
            <Text
              className="text-black/70 font-bold"
              style={{ fontSize: f(10) }}
            >
              Ep {deck.episode}
            </Text>
          </View>
          <View className="bg-black/10 px-2 py-1 rounded-md">
            <Text
              className="text-black/70 font-bold"
              style={{ fontSize: f(10) }}
            >
              by {deck.creator_name}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
          <View
            className="h-full bg-tertiary"
            style={{ width: `${progress * 100}%` }}
          />
        </View>

        <Text
          className="text-black/40 text-right mt-1"
          style={{ fontSize: f(9) }}
        >
          progress {Math.round(progress * 100)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
}
