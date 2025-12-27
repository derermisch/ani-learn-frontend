// components/study/InteractiveText.tsx
import { Colors, f } from "@/constants/theme";
import { parseFurigana } from "@/utils/furiganaParser";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  text: string;
  furigana?: string; // Optional reading
  onPressWord: (word: string) => void;
  highlight?: boolean; // For context highlighting
  size?: number; // Base font size
}

export function InteractiveText({
  text,
  furigana,
  onPressWord,
  highlight = false,
  size = 48,
}: Props) {
  // 1. Get segments (e.g., [{t: "昔", r: "むかし"}, ...])
  const segments = parseFurigana(text, furigana || "");

  // Dynamic Styles
  const fontSize = size;
  const furiganaSize = size * 0.4; // 40% of main text
  const textColor = highlight ? Colors.dark.tertiary : "white";
  const weight = highlight ? "font-bold" : "font-heading";

  return (
    <View className="flex-row flex-wrap justify-center items-end">
      {segments.map((seg, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onPressWord(seg.text)}
          activeOpacity={0.7}
          className="items-center mx-[1px]" // Slight margin for readability
        >
          {/* Furigana (Only if it exists and is Kanji) */}
          {seg.reading && (
            <Text
              className="text-white/70 text-center font-medium absolute"
              style={{
                fontSize: f(furiganaSize),
                bottom: fontSize + 4, // Position exactly above text
                minWidth: "100%", // Prevent wrapping
              }}
              numberOfLines={1}
            >
              {seg.reading}
            </Text>
          )}

          {/* Main Text */}
          <Text
            className={`text-center ${weight}`}
            style={{
              fontSize: f(fontSize),
              lineHeight: f(fontSize * 1.2),
              color: highlight ? Colors.dark.tertiary : "white",
            }}
          >
            {seg.text}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
