import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PreviewData } from "../../hooks/useSubtitleEngine";

interface Props {
  isReady: boolean;
  isProcessing: boolean;
  previewData: PreviewData | null;
  onFileSelect: (uri: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UnlockFlow({
  isReady,
  isProcessing,
  previewData,
  onFileSelect,
  onConfirm,
  onCancel,
}: Props) {
  const handlePick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!res.canceled) {
        onFileSelect(res.assets[0].uri);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- STATE 1: PREVIEW MODE ---
  if (previewData) {
    return (
      <View style={styles.container}>
        <View style={{ width: "100%", alignItems: "center" }}>
          <Ionicons name="document-text-outline" size={32} color="#A071FF" />
          <Text style={styles.title}>Confirm Subtitle</Text>
          <Text style={styles.desc}>
            We successfully parsed the file. Does this text look correct?
          </Text>

          <View style={styles.previewBox}>
            <Text style={styles.previewContent}>
              {previewData.text || "No readable text found."}
              {"\n"}...
            </Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onCancel}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.confirmBtn]}
              onPress={onConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.confirmBtnText}>Verify & Unlock</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // --- STATE 2: UPLOAD MODE ---
  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={32} color="#666" />
      <Text style={styles.title}>Deck Locked</Text>
      <Text style={styles.desc}>
        To access the flashcards for this episode, please upload your subtitle
        file for verification.
      </Text>

      <TouchableOpacity
        style={[
          styles.uploadBtn,
          { opacity: !isReady || isProcessing ? 0.6 : 1 },
        ]}
        onPress={handlePick}
        disabled={!isReady || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#000" />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={20} color="#000" />
            <Text style={styles.uploadBtnText}>
              {!isReady ? "Loading Engine..." : "Upload Subtitle File"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {isProcessing && !previewData && (
        <Text style={styles.processingText}>Processing locally...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
    marginTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 10,
    marginBottom: 10,
  },
  desc: {
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadBtn: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  uploadBtnText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  processingText: { color: "#A071FF", marginTop: 15, fontStyle: "italic" },
  previewBox: {
    width: "100%",
    backgroundColor: "#000",
    borderRadius: 8,
    padding: 15,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: "#333",
    minHeight: 100, // Ensure it looks like a box even if empty
  },
  previewContent: {
    color: "#CCC",
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 15,
    width: "100%",
    justifyContent: "center",
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 100,
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "#333" },
  cancelBtnText: { color: "#FFF", fontWeight: "bold" },
  confirmBtn: { backgroundColor: "#A071FF" },
  confirmBtnText: { color: "#000", fontWeight: "bold" },
});
