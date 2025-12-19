import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Card } from "../../constants/types";

interface Props {
  card: Card;
  onNext: () => void;
  isLast: boolean;
}

export function Flashcard({ card, onNext, isLast }: Props) {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setIsFlipped(false);
  }, [card]);

  if (!card) return null;

  const getTranslation = () => {
    if (!card.translation) return "No translation available";
    const keys = Object.keys(card.translation);
    if (keys.length === 0) return "No translation available";
    return card.translation[keys[0]].result || "Error reading translation";
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setIsFlipped(!isFlipped)}
        style={[styles.card, isFlipped ? styles.cardBack : styles.cardFront]}
      >
        {!isFlipped ? (
          <View style={styles.centerContent}>
            <Text style={styles.japaneseText}>{card.phrase}</Text>
            <Text style={styles.tapHint}>Tap to flip</Text>
          </View>
        ) : (
          <View style={styles.backContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <Text style={styles.label}>Translation</Text>
                <Text style={styles.englishText}>{getTranslation()}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.section}>
                <Text style={styles.label}>Vocabulary</Text>
                <View style={styles.tokenContainer}>
                  {card.tokens &&
                    card.tokens.map((token: any, idx: number) => (
                      <View key={idx} style={styles.tokenTag}>
                        <Text style={styles.tokenSurface}>{token.token}</Text>
                        {token.general_info?.base_form &&
                          token.general_info.base_form !== token.token && (
                            <Text style={styles.tokenBase}>
                              ({token.general_info.base_form})
                            </Text>
                          )}
                      </View>
                    ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.nextBtn} onPress={onNext}>
                <Text style={styles.nextBtnText}>
                  {isLast ? "Finish Deck" : "Next Card"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    height: "85%",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  cardFront: {
    backgroundColor: "#2C2C2C",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  cardBack: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#A071FF",
  },
  centerContent: {
    alignItems: "center",
    gap: 20,
  },
  japaneseText: {
    color: "#FFF",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 44,
  },
  tapHint: {
    color: "#666",
    fontSize: 14,
    marginTop: 20,
  },
  backContent: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    color: "#A071FF",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  englishText: {
    color: "#EEE",
    fontSize: 20,
    lineHeight: 28,
  },
  divider: {
    height: 1,
    backgroundColor: "#333",
    marginBottom: 20,
  },
  tokenContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tokenTag: {
    backgroundColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  tokenSurface: {
    color: "#FFF",
    fontSize: 16,
  },
  tokenBase: {
    color: "#AAA",
    fontSize: 12,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 15,
    alignItems: "flex-end",
  },
  nextBtn: {
    backgroundColor: "#A071FF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
  },
  nextBtnText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
});
