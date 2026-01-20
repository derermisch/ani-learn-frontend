import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PreviewData } from "../../hooks/useSubtitleEngine";
import { simpleSubtitleService } from "../../services/SimpleSubtitleService";

interface Props {
  isReady: boolean; // For the Web Engine (optional now)
  isProcessing: boolean;
  previewData: PreviewData | null;
  onFileSelect: (uri: string) => void; // Used for Web Engine
  onSimpleUnlock: (data: PreviewData) => void; // NEW: Pass data directly for simple flow
  onConfirm: () => void;
  onCancel: () => void;
}

export function UnlockFlow({
  isReady,
  isProcessing,
  previewData,
  onFileSelect,
  onSimpleUnlock,
  onConfirm,
  onCancel,
}: Props) {
  const [localProcessing, setLocalProcessing] = useState(false);

  // --- 1. COMPLEX ENGINE (WebView) ---
  const handleEnginePick = async () => {
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

  // --- 2. SIMPLE ENGINE (Native) ---
  const handleSimplePick = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/x-subrip", "text/*", "*/*"], // Prefer .srt
        copyToCacheDirectory: true,
      });

      if (!res.canceled) {
        setLocalProcessing(true);
        const uri = res.assets[0].uri;

        // Run the Simple Service
        const result = await simpleSubtitleService.processFile(uri, {
          useNFKC: true,
        });

        // Pass results back to parent as "PreviewData"
        onSimpleUnlock({
          hash: result.hash,
          text: result.rawText + "...",
          rawLines: result.lines, // You might need to add rawLines to PreviewData type if not there
        });
        setLocalProcessing(false);
      }
    } catch (e) {
      console.error(e);
      setLocalProcessing(false);
      Alert.alert("Error", "Failed to parse subtitle file.");
    }
  };

  // --- VIEW: CONFIRMATION (Shared) ---
  if (previewData) {
    return (
      <View style={styles.container}>
        <View style={{ width: "100%", alignItems: "center" }}>
          <Ionicons name="document-text-outline" size={32} color="#A071FF" />
          <Text style={styles.title}>Confirm Subtitle</Text>
          <Text style={styles.desc}>
            File processed successfully. Does this text look correct?
          </Text>

          <View style={styles.previewBox}>
            <Text style={styles.previewContent}>
              {previewData.text || "No readable text found."}
            </Text>
          </View>

          <View style={styles.previewHash}>
            <Text style={styles.hashText}>
              Hash: {previewData.hash.substring(0, 16)}...
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
              disabled={isProcessing || localProcessing}
            >
              {isProcessing || localProcessing ? (
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

  // --- VIEW: SELECTION MENU ---
  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={32} color="#666" />
      <Text style={styles.title}>Deck Locked</Text>
      <Text style={styles.desc}>
        Unlock this deck by verifying you own the subtitle file.
      </Text>

      {/* OPTION 1: SIMPLE UPLOAD (Native) */}
      <TouchableOpacity
        style={styles.uploadBtn}
        onPress={handleSimplePick}
        disabled={localProcessing}
      >
        {localProcessing ? (
          <ActivityIndicator color="#000" />
        ) : (
          <>
            <Ionicons name="document-outline" size={20} color="#000" />
            <Text style={styles.uploadBtnText}>Select .SRT File</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.orText}>— OR —</Text>

      {/* OPTION 2: ADVANCED ENGINE (WebView) */}
      <TouchableOpacity
        style={[styles.secondaryBtn, { opacity: !isReady ? 0.5 : 1 }]}
        onPress={handleEnginePick}
        disabled={!isReady}
      >
        <Ionicons name="construct-outline" size={18} color="#FFF" />
        <Text style={styles.secondaryBtnText}>
          {!isReady
            ? "Loading Advanced Engine..."
            : "Use Advanced Engine (VobSub/PGS)"}
        </Text>
      </TouchableOpacity>
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
  // Main Button
  uploadBtn: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: "100%",
    justifyContent: "center",
  },
  uploadBtnText: { color: "#000", fontWeight: "bold", fontSize: 16 },

  // Divider
  orText: {
    color: "#555",
    marginVertical: 15,
    fontSize: 12,
    fontWeight: "bold",
  },

  // Secondary Button
  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    width: "100%",
    justifyContent: "center",
  },
  secondaryBtnText: { color: "#FFF", fontSize: 14 },

  // Preview Styles
  previewBox: {
    width: "100%",
    backgroundColor: "#000",
    borderRadius: 8,
    padding: 15,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: "#333",
    minHeight: 80,
  },
  previewContent: {
    color: "#CCC",
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
  },
  previewHash: {
    marginBottom: 20,
    backgroundColor: "#111",
    padding: 5,
    borderRadius: 4,
  },
  hashText: { color: "#555", fontSize: 10, fontFamily: "monospace" },

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
