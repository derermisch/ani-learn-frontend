// components/modals/DictionaryModal.tsx
import { Colors } from "@/constants/theme";
import { dictionaryService } from "@/services/DictionaryService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  word: string;
  onClose: () => void;
}

export function DictionaryModal({ visible, word, onClose }: Props) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && word) {
      search();
    }
  }, [visible, word]);

  const search = async () => {
    setLoading(true);
    const results = await dictionaryService.lookup(word);
    setEntries(results);
    setLoading(false);
  };

  // Helper to safely get string from definition array/string
  const renderGloss = (gloss: string | string[]) => {
    if (Array.isArray(gloss)) return gloss.join("; ");
    return gloss;
  };

  const renderPos = (pos: string | string[] | undefined) => {
    if (!pos) return "Unclassified";
    if (Array.isArray(pos)) return pos.join(", ");
    return pos;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-[#1E1E1E] h-[70%] rounded-t-3xl border-t border-white/10 overflow-hidden">
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-white/10 bg-[#25252A]">
            <Text className="text-white font-heading text-xl">
              Dictionary: <Text className="text-tertiary">{word}</Text>
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="bg-black/40 p-1 rounded-full"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={Colors.dark.tertiary} />
              <Text className="text-white/50 mt-4">Loading Dictionary...</Text>
            </View>
          ) : entries.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Text className="text-white/50">
                No entries found for "{word}"
              </Text>
            </View>
          ) : (
            <ScrollView className="flex-1 p-4">
              {entries.map((entry, idx) => {
                // Parse sense (can be array or object)
                const senses = Array.isArray(entry.sense)
                  ? entry.sense
                  : [entry.sense];

                // Reading
                const reading = Array.isArray(entry.r_ele)
                  ? entry.r_ele[0].reb
                  : entry.r_ele?.reb;

                return (
                  <View
                    key={idx}
                    className="mb-6 bg-black/20 p-4 rounded-xl border border-white/5"
                  >
                    <View className="flex-row items-baseline mb-2">
                      <Text className="text-tertiary font-bold text-2xl mr-3">
                        {/* Try to show Kanji, fallback to Reading */}
                        {entry.k_ele
                          ? Array.isArray(entry.k_ele)
                            ? entry.k_ele[0].keb
                            : entry.k_ele.keb
                          : reading}
                      </Text>
                      <Text className="text-white/60 text-lg">{reading}</Text>
                    </View>

                    {senses.map((sense: any, sIdx: number) => (
                      <View
                        key={sIdx}
                        className="mb-3 pl-2 border-l-2 border-white/10"
                      >
                        <Text className="text-white/40 text-xs uppercase mb-1">
                          {renderPos(sense.pos)}
                        </Text>
                        <Text className="text-white/90 leading-6 text-base">
                          {sIdx + 1}. {renderGloss(sense.gloss)}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
              <View className="h-20" />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
