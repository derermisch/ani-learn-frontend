import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface Props {
  onRetry: () => void;
  message?: string;
}

export function ServerErrorState({
  onRetry,
  message = "Could not connect to the backend.",
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <IconSymbol name="wifi.slash" size={40} color="#FF7171" />
      </View>

      <ThemedText type="subtitle" style={styles.title}>
        Connection Failed
      </ThemedText>
      <ThemedText style={styles.message}>
        {message} {"\n"}
        Make sure your Python server is running.
      </ThemedText>

      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <IconSymbol name="arrow.clockwise" size={20} color="#000" />
        <ThemedText style={styles.btnText}>Retry Connection</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    minHeight: 300,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 113, 113, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { marginBottom: 10, color: "#FF7171" },
  message: {
    textAlign: "center",
    color: "#888",
    marginBottom: 30,
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  btnText: { color: "#000", fontWeight: "bold" },
});
