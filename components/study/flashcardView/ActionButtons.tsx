import { CheckIcon, XIcon } from "phosphor-react-native";
import React from "react";
import { TouchableOpacity } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

interface ActionButtonsProps {
  onRate: (isPass: boolean) => void;
}

export function ActionButtons({ onRate }: ActionButtonsProps) {
  return (
    <Animated.View
      entering={FadeIn.delay(200)}
      className="absolute bottom-8 left-0 right-0 flex-row justify-center gap-8 z-30"
    >
      <TouchableOpacity
        onPress={() => onRate(false)}
        className="w-16 h-16 rounded-full bg-[#FF5C5C] items-center justify-center shadow-lg border border-white/20"
      >
        <XIcon size={32} color="black" weight="bold" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onRate(true)}
        className="w-16 h-16 rounded-full bg-tertiary items-center justify-center shadow-lg border border-white/20"
      >
        <CheckIcon size={32} color="black" weight="bold" />
      </TouchableOpacity>
    </Animated.View>
  );
}
