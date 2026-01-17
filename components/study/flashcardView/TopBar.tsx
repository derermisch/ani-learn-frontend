import { Colors, f, SizesRaw } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { StarIcon } from "phosphor-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface TopBarProps {
  onBack: () => void;
  remainingCount: number;
}

export function TopBar({ onBack, remainingCount }: TopBarProps) {
  const activeColors = Colors["dark"];
  const starsToShow = Math.min(remainingCount, 8);

  return (
    <View className="flex-row justify-between items-center z-50">
      <TouchableOpacity onPress={onBack}>
        <Ionicons
          name="arrow-back"
          size={SizesRaw.iconMd}
          color={activeColors.text}
        />
      </TouchableOpacity>

      <View className="flex-row items-center bg-surface px-xxs_8 py-xxs_6 rounded-full gap-xxxs_2">
        {Array.from({ length: starsToShow }).map((_, i) => (
          <StarIcon
            key={i}
            size={SizesRaw.iconSm}
            weight="fill"
            color={activeColors.primary}
          />
        ))}
        {remainingCount > 8 && (
          <Text
            className="text-foreground ml-xxxs_4 font-bold"
            style={{ fontSize: f(8) }}
          >
            +{remainingCount - 8}
          </Text>
        )}
      </View>

      <TouchableOpacity>
        <Ionicons
          name="ellipsis-horizontal"
          size={SizesRaw.iconMd}
          color="white"
        />
      </TouchableOpacity>
    </View>
  );
}
