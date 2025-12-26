import { Colors, f, SizesRaw } from "@/constants/theme";
import { ArrowLeftIcon, PlayIcon } from "phosphor-react-native";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- TYPES ---
export type OptionValue = string | boolean;
export type StudyOptionsState = Record<string, OptionValue>;

interface StudyOptionConfig {
  id: string;
  label: string;
  type: "select" | "toggle";
  options?: { label: string; value: OptionValue }[];
  defaultValue: OptionValue;
  condition?: (currentSettings: StudyOptionsState) => boolean;
}

// --- CONFIG ---
const STUDY_CONFIG: StudyOptionConfig[] = [
  {
    id: "cardType",
    label: "Card Type",
    type: "select",
    defaultValue: "word",
    options: [
      { label: "Words", value: "word" },
      { label: "Phrases", value: "phrase" },
    ],
  },
  {
    id: "showFurigana",
    label: "Show Furigana Above Kanji",
    type: "select",
    defaultValue: true,
    options: [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ],
    condition: (s) => s.cardType === "word",
  },
  {
    id: "showContext",
    label: "Show Phrase Below",
    type: "select",
    defaultValue: true,
    options: [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ],
    condition: (s) => s.cardType === "word",
  },
  {
    id: "contextSource",
    label: "Type of Phrase",
    type: "select",
    defaultValue: "episode",
    options: [
      { label: "From episode", value: "episode" },
      { label: "Random", value: "random" },
    ],
    condition: (s) => s.cardType === "word" && s.showContext === true,
  },
  {
    id: "order",
    label: "Order",
    type: "select",
    defaultValue: "ordered",
    options: [
      { label: "Episode order", value: "ordered" },
      { label: "Shuffled", value: "shuffled" },
    ],
  },
];

interface Props {
  onStart: (settings: StudyOptionsState) => void;
  onBack: () => void;
}

export function StudySettings({ onStart, onBack }: Props) {
  const activeColors = Colors["dark"];
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<StudyOptionsState>(() => {
    const defaults: StudyOptionsState = {};
    STUDY_CONFIG.forEach((opt) => (defaults[opt.id] = opt.defaultValue));
    return defaults;
  });

  return (
    <View
      className="flex-1 gap-sm_24 p-sm_16"
      style={{
        paddingBottom: insets.bottom + SizesRaw.spacing.md_48,
      }}
    >
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + SizesRaw.spacing.sm_16 }}
        className="flex-row items-center gap-sm_16"
      >
        <TouchableOpacity onPress={onBack}>
          <ArrowLeftIcon size={SizesRaw.iconMd} color={activeColors.text} />
        </TouchableOpacity>
        <Text
          className="text-foreground font-heading"
          style={{ fontSize: f(24) }}
        >
          Study Options
        </Text>
      </View>

      <ScrollView contentContainerClassName="flex-col gap-sm_16">
        {STUDY_CONFIG.map((option) => {
          if (option.condition && !option.condition(settings)) return null;

          return (
            <View key={option.id} className="flex-col gap-sm_12">
              <Text
                className="text-foreground uppercase tracking-widest font-medium"
                style={{ fontSize: f(8) }}
              >
                {option.label}
              </Text>

              <View className="flex-row gap-sm_12">
                {option.options?.map((opt) => {
                  const isActive = settings[option.id] === opt.value;
                  return (
                    <TouchableOpacity
                      key={String(opt.value)}
                      onPress={() =>
                        setSettings((prev) => ({
                          ...prev,
                          [option.id]: opt.value,
                        }))
                      }
                      className={`bg-surface flex-1 p-sm_12 rounded-xl items-center justify-center ${
                        isActive && "border-primary border-2"
                      }`}
                    >
                      <Text
                        className="text-foreground"
                        style={{ fontSize: f(12) }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View>
        <TouchableOpacity
          onPress={() => onStart(settings)}
          className="gap-xxs_6 bg-tertiary py-sm_12 px-sm_24 rounded-full flex-row justify-center items-center shadow-lg self-center"
        >
          <PlayIcon
            weight="fill"
            color={activeColors.background}
            size={SizesRaw.iconSm}
          />
          <Text
            className="text-background font-semibold"
            style={{ fontSize: f(16) }}
          >
            Start Session
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
