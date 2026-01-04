// components/modals/DictionaryModal.tsx
import { Colors } from "@/constants/theme";
import { dictionaryService } from "@/services/DictionaryService";
import { Ionicons } from "@expo/vector-icons";
import { Sparkle } from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// --- TYPES ---

interface Sense {
  pos?: string | string[];
  gloss: string | string[];
}

interface JMDictEntry {
  ent_seq: string;
  k_ele?: { keb: string } | { keb: string }[];
  r_ele?: { reb: string } | { reb: string }[];
  sense: Sense | Sense[];
}

interface DictionaryResult {
  id: string;
  data: JMDictEntry;
}

interface AIResult {
  selected_entry_id: string;
  selection_method: string;
  result_generated_at: string;
}

interface Props {
  visible: boolean;
  word: string;
  meta?: Record<string, AIResult>; // e.g. { "gpt-4o-mini": { ... } }
  onClose: () => void;
}

interface AIMatch {
  entryId: string;
  model: string;
}

// --- CONSTANTS ---
const PREFERRED_MODELS = ["gpt-4o-mini", "llama3.1", "gpt-4o"];

// --- HELPERS (Defined outside to avoid re-creation) ---
const renderGloss = (gloss: string | string[]) => {
  if (Array.isArray(gloss)) return gloss.join("; ");
  return gloss;
};

const renderPos = (pos: string | string[] | undefined) => {
  if (!pos) return "Unclassified";
  if (Array.isArray(pos)) return pos.join(", ");
  return pos;
};

export function DictionaryModal({ visible, word, meta, onClose }: Props) {
  const [entries, setEntries] = useState<DictionaryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiMatch, setAiMatch] = useState<AIMatch | null>(null);

  useEffect(() => {
    if (visible && word) {
      search();
    } else {
      // Reset state on close/empty
      setEntries([]);
      setAiMatch(null);
    }
  }, [visible, word]);

  const search = async () => {
    setLoading(true);

    try {
      // 1. Fetch results from DB
      let results = await dictionaryService.lookup(word);

      // 2. Determine AI Match
      let match: AIMatch | null = null;

      if (meta) {
        // Try to find a match from preferred models first
        for (const model of PREFERRED_MODELS) {
          if (meta[model]?.selected_entry_id) {
            match = { entryId: meta[model].selected_entry_id, model };
            break;
          }
        }

        // Fallback: Use any available model if preferred ones aren't found
        if (!match) {
          const availableModels = Object.keys(meta);
          if (availableModels.length > 0) {
            const firstModel = availableModels[0];
            match = {
              entryId: meta[firstModel].selected_entry_id,
              model: firstModel,
            };
          }
        }
      }

      setAiMatch(match);

      // 3. Reorder: Bump the AI match to the top
      if (match) {
        results = results.sort((a, b) => {
          if (a.id === match?.entryId) return -1;
          if (b.id === match?.entryId) return 1;
          return 0;
        });
        console.log(
          `[Dict] AI Match found: ${match.model} -> ${match.entryId}`
        );
      }

      setEntries(results);
    } catch (e) {
      console.error("Dictionary lookup failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-[#1E1E1E] h-[75%] rounded-t-3xl border-t border-white/10 overflow-hidden shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center p-5 border-b border-white/10 bg-[#25252A]">
            <View>
              <Text className="text-white/50 text-xs font-bold uppercase mb-1">
                Dictionary Lookup
              </Text>
              <Text className="text-white font-heading text-2xl">{word}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="bg-white/10 p-2 rounded-full active:bg-white/20"
            >
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color={Colors.dark.tertiary} />
              <Text className="text-white/50 mt-4 font-medium">
                Searching Database...
              </Text>
            </View>
          ) : entries.length === 0 ? (
            <View className="flex-1 justify-center items-center p-8">
              <Ionicons name="book-outline" size={48} color="#555" />
              <Text className="text-white/50 text-center mt-4">
                No definition found for "{word}"
              </Text>
            </View>
          ) : (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 16 }}
            >
              {entries.map(({ id, data: entry }, idx) => {
                // Determine if this is the AI matched entry
                const isAiSelected = aiMatch?.entryId === id;

                // Safe Extraction
                const senses = Array.isArray(entry.sense)
                  ? entry.sense
                  : [entry.sense];
                const reading = Array.isArray(entry.r_ele)
                  ? entry.r_ele[0].reb
                  : entry.r_ele?.reb;
                const kanji = entry.k_ele
                  ? Array.isArray(entry.k_ele)
                    ? entry.k_ele[0].keb
                    : entry.k_ele.keb
                  : reading;

                return (
                  <View
                    key={id}
                    className={`mb-4 rounded-xl border ${
                      isAiSelected
                        ? "bg-[#2A2A35] border-[#A071FF]"
                        : "bg-black/20 border-white/5"
                    } overflow-hidden`}
                  >
                    {/* --- AI BADGE (Sophisticated) --- */}
                    {isAiSelected && (
                      <View className="bg-[#A071FF]/20 border-b border-[#A071FF]/30 px-4 py-2 flex-row items-center gap-2">
                        <Sparkle size={16} color="#A071FF" weight="fill" />
                        <Text className="text-[#A071FF] font-bold text-xs uppercase tracking-wider">
                          Context Match • {aiMatch?.model}
                        </Text>
                      </View>
                    )}

                    <View className="p-5">
                      {/* Word Header */}
                      <View className="flex-row items-baseline mb-4 flex-wrap">
                        <Text className="text-white font-bold text-3xl mr-3 font-heading">
                          {kanji}
                        </Text>
                        <Text className="text-white/60 text-lg">{reading}</Text>
                      </View>

                      {/* Definitions */}
                      {senses.map((sense: Sense, sIdx: number) => (
                        <View
                          key={sIdx}
                          className="mb-4 pl-3 border-l-2 border-white/10"
                        >
                          <Text className="text-white/40 text-[10px] font-bold uppercase mb-1 tracking-widest">
                            {renderPos(sense.pos)}
                          </Text>
                          <Text className="text-white/90 leading-6 text-base">
                            <Text className="text-white/30 mr-2">
                              {sIdx + 1}.{" "}
                            </Text>
                            {renderGloss(sense.gloss)}
                          </Text>
                        </View>
                      ))}
                    </View>
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
