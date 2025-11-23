import { Show } from "@/constants/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  checkFileExistence,
  createDeck,
  getShows,
  getTaskProgress,
  stopProcessingTask,
} from "../services/api";
import { processSubtitleFile } from "../utils/subtitleParser";

export default function CreateDeckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // -- File & Parsing State --
  const [originalFile, setOriginalFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [processedUri, setProcessedUri] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewLines, setPreviewLines] = useState<string[]>([]);
  const [lineCount, setLineCount] = useState(0);

  // -- Form Data --
  const [shows, setShows] = useState<Show[]>([]);
  const [showName, setShowName] = useState("");
  const [episode, setEpisode] = useState("01");
  const [language, setLanguage] = useState("ja");

  const [isLocked, setIsLocked] = useState(false);

  // -- Backend Processing State --
  const [isUploading, setIsUploading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadShows();
    return () => stopPolling();
  }, []);

  const loadShows = async () => {
    try {
      const data = await getShows();
      setShows(data);
    } catch (e) {
      console.log("Failed to load shows");
    }
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleStop = async () => {
    if (!currentTaskId) return;
    setStatusMsg("Stopping...");
    await stopProcessingTask(currentTaskId);
    stopPolling();
    setIsUploading(false);
    setCurrentTaskId(null);
    Alert.alert("Cancelled", "The process was stopped.");
  };

  const handlePickFile = async () => {
    try {
      // Reset State
      setParseError(null);
      setPreviewLines([]);
      setProcessedUri(null);
      setFileHash(null);
      setOriginalFile(null);
      setIsLocked(false);
      setShowName("");
      setEpisode("");
      setLanguage("ja");

      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;

      const asset = res.assets[0];
      setOriginalFile(asset);
      setIsParsing(true);

      setTimeout(async () => {
        try {
          // 1. Process File (Client Side)
          const result = await processSubtitleFile(asset.uri, asset.name);
          setProcessedUri(result.uri);
          // setFileHash(result.hash);
          setPreviewLines(result.preview);
          setLineCount(result.lineCount);

          // 2. Check Backend for Hash
          setIsParsing(false);
          setIsChecking(true);

          // UPDATE: Send lines for soft-matching
          const check = await checkFileExistence(null, result.allLines);

          setIsChecking(false);

          if (check.exists && check.decks && check.decks.length > 0) {
            const match = check.decks[0];

            // Auto-Correct Fields
            setShowName(match.show_title);
            setEpisode(match.episode);
            setLanguage(match.language);
            setIsLocked(true);

            // Custom Messages based on Match Type
            if (check.match_type === "soft") {
              Alert.alert(
                "Smart Detection",
                `This file seems to be a version of "${match.show_title} - Ep ${match.episode}".\n\nWe have auto-selected the correct show details for you.`
              );
            } else {
              Alert.alert(
                "Known File",
                `This exact file matches "${match.show_title} - Ep ${match.episode}".`
              );
            }
          } else {
            // New File: Try to auto-guess episode from filename
            const numbers = asset.name.match(/\d+/);
            if (numbers) {
              setEpisode(numbers[0]);
            }
          }
        } catch (e: any) {
          setIsParsing(false);
          setIsChecking(false);
          setParseError(e.message);
        }
      }, 100);
    } catch (err) {
      setIsParsing(false);
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!processedUri || !originalFile || !showName)
      return Alert.alert("Missing Data", "Please fill in all fields.");

    setIsUploading(true);
    setProgressPercent(0);
    setStatusMsg("Uploading processed text...");

    try {
      const formData = new FormData();
      formData.append("subtitle_file", {
        uri: processedUri,
        name: `${originalFile.name}.txt`,
        type: "text/plain",
      } as any);

      formData.append("show_name", showName);
      formData.append("episode", episode);
      formData.append("lan", language);
      formData.append("username", "mobile_user");

      const response = await createDeck(formData);

      if (!response.task_id) {
        throw new Error("No task ID returned");
      }

      const taskId = response.task_id;
      setCurrentTaskId(taskId);

      intervalRef.current = setInterval(async () => {
        const data = await getTaskProgress(taskId);
        setStatusMsg(data.message || "Processing...");
        setProgressPercent(data.percent || 0);

        if (data.status === "completed") {
          stopPolling();
          setCurrentTaskId(null);
          Alert.alert("Success", "Deck Created!", [
            { text: "OK", onPress: () => router.back() },
          ]);
        } else if (data.status === "error" || data.status === "cancelled") {
          stopPolling();
          setIsUploading(false);
          setCurrentTaskId(null);
          if (data.message !== "Cancelled by user.")
            Alert.alert("Error", data.message);
        }
      }, 1000);
    } catch (e: any) {
      setIsUploading(false);
      stopPolling();
      setCurrentTaskId(null);
      Alert.alert("Error", e.message || "Could not start task");
    }
  };

  const isInputDisabled = isUploading || isLocked || isChecking;

  return (
    <View style={[styles.container, { backgroundColor: "#151718" }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => !isUploading && router.back()}
          disabled={isUploading}
        >
          <Ionicons
            name="close"
            size={24}
            color={isUploading ? "#555" : "#FFF"}
          />
        </TouchableOpacity>
        <Text style={styles.subtitle}>New Deck</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* FILE PICKER */}
        <TouchableOpacity
          style={[styles.uploadBox, parseError && { borderColor: "#FF7171" }]}
          onPress={handlePickFile}
          disabled={isUploading || isParsing || isChecking}
        >
          {isParsing ? (
            <View style={{ alignItems: "center" }}>
              <ActivityIndicator size="large" color="#A071FF" />
              <Text style={{ marginTop: 10, color: "#AAA" }}>
                Reading & Hashing...
              </Text>
            </View>
          ) : isChecking ? (
            <View style={{ alignItems: "center" }}>
              <ActivityIndicator size="large" color="#FF9F1C" />
              <Text style={{ marginTop: 10, color: "#FF9F1C" }}>
                Checking Database...
              </Text>
            </View>
          ) : originalFile ? (
            <View style={{ alignItems: "center" }}>
              <Ionicons
                name="document-text"
                size={32}
                color={parseError ? "#FF7171" : "#A071FF"}
              />
              <Text
                style={{
                  marginTop: 10,
                  fontWeight: "bold",
                  color: "#FFF",
                }}
              >
                {originalFile.name}
              </Text>
              {isLocked && (
                <Text style={{ fontSize: 12, color: "#A071FF", marginTop: 4 }}>
                  ✓ Existing Match Found
                </Text>
              )}
            </View>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={32} color="#666" />
              <Text style={{ color: "#666", marginTop: 10 }}>
                Select Subtitle File (.srt, .ass)
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ERROR */}
        {parseError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#FF7171" />
            <Text style={styles.errorText}>Error: {parseError}</Text>
          </View>
        )}

        {/* PREVIEW */}
        {previewLines.length > 0 && !parseError && (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <Text style={styles.defaultSemiBold}>Dialogue Preview</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{lineCount} Lines</Text>
              </View>
            </View>
            <View style={styles.previewContent}>
              {previewLines.map((line, i) => (
                <Text key={i} style={styles.previewLine} numberOfLines={1}>
                  <Text style={{ color: "#666" }}>{i + 1}. </Text>
                  {line}
                </Text>
              ))}
              {lineCount > 5 && (
                <Text
                  style={{
                    color: "#666",
                    fontSize: 12,
                    marginTop: 5,
                    fontStyle: "italic",
                  }}
                >
                  ...and {lineCount - 5} more
                </Text>
              )}
            </View>
          </View>
        )}

        {/* FORM */}
        <View style={[styles.formSection, isLocked && { opacity: 0.7 }]}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Show Name {isLocked && "(Auto-Detected)"}
            </Text>
            <TextInput
              style={[styles.input, isLocked && styles.inputLocked]}
              placeholder="e.g. Naruto"
              placeholderTextColor="#555"
              value={showName}
              onChangeText={setShowName}
              editable={!isInputDisabled}
            />
            {/* Suggestions only if not locked */}
            {shows.length > 0 && !showName && !isInputDisabled && (
              <ScrollView
                horizontal
                style={{ marginTop: 10 }}
                showsHorizontalScrollIndicator={false}
              >
                {shows.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setShowName(s.title)}
                    style={styles.suggestion}
                  >
                    <Text style={{ fontSize: 12, color: "#FFF" }}>
                      {s.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Episode</Text>
              <TextInput
                style={[styles.input, isLocked && styles.inputLocked]}
                value={episode}
                onChangeText={setEpisode}
                keyboardType="numeric"
                editable={!isInputDisabled}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Lang Code</Text>
              <TextInput
                style={[styles.input, isLocked && styles.inputLocked]}
                value={language}
                onChangeText={setLanguage}
                maxLength={2}
                editable={!isInputDisabled}
              />
            </View>
          </View>
        </View>

        {/* PROGRESS & STOP */}
        {isUploading && (
          <View style={styles.progressContainer}>
            <View style={styles.statusHeader}>
              <ActivityIndicator color="#A071FF" size="small" />
              <Text style={styles.statusText}>{statusMsg}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.percentText}>{progressPercent}%</Text>
            <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
              <Ionicons name="stop" size={16} color="#FF4444" />
              <Text style={styles.stopText}>Stop Processing</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FOOTER */}
      {!isUploading && (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(20, insets.bottom + 10) },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.btn,
              (!processedUri || !showName || isChecking) && { opacity: 0.5 },
            ]}
            onPress={handleSubmit}
            disabled={!processedUri || !showName || isChecking}
          >
            <Text style={styles.btnText}>
              {isLocked ? "Sync Existing Deck" : "Start Processing"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    marginTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  content: { padding: 20 },
  subtitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  defaultSemiBold: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },

  uploadBox: {
    height: 140,
    borderWidth: 2,
    borderColor: "#333",
    borderStyle: "dashed",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.02)",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 113, 113, 0.1)",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  errorText: { color: "#FF7171", flex: 1 },

  previewContainer: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "#333",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  previewContent: { gap: 4 },
  previewLine: { fontSize: 13, color: "#DDD" },
  badge: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 10, fontWeight: "bold", color: "#FFF" },

  formSection: { marginBottom: 20 },
  formGroup: { marginBottom: 20 },
  label: {
    color: "#AAA",
    marginBottom: 8,
    fontSize: 12,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#252829",
    color: "#FFF",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  inputLocked: {
    backgroundColor: "#1A1A1A",
    color: "#999",
    borderColor: "#333",
    borderWidth: 1,
  },
  row: { flexDirection: "row", gap: 15 },
  suggestion: {
    backgroundColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },

  progressContainer: {
    marginTop: 10,
    backgroundColor: "#1E1E1E",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  statusText: { fontSize: 14, color: "#FFF", fontWeight: "600" },
  progressBarBg: {
    width: "100%",
    height: 8,
    backgroundColor: "#333",
    borderRadius: 4,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#A071FF",
    borderRadius: 4,
  },
  percentText: {
    fontSize: 12,
    color: "#888",
    marginTop: 8,
    textAlign: "right",
  },

  stopButton: {
    backgroundColor: "rgba(255, 68, 68, 0.15)",
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FF4444",
  },
  stopText: { color: "#FF4444", fontWeight: "bold", fontSize: 14 },

  footer: { padding: 20, borderTopWidth: 1, borderColor: "#222" },
  btn: {
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#000", fontWeight: "bold" },
});
