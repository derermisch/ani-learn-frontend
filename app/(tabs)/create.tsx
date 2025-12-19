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
  getProcessingConfig,
  getShows,
  getTaskProgress,
  stopProcessingTask,
} from "../../services/api";
import { generateFileHash } from "../../utils/subtitleParser";

export default function CreateDeckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // -- File State --
  const [originalFile, setOriginalFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);

  // -- UI State --
  const [isHashing, setIsHashing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // -- Form Data --
  const [shows, setShows] = useState<Show[]>([]);
  const [showName, setShowName] = useState("");
  const [episode, setEpisode] = useState("01");
  const [language, setLanguage] = useState("ja");
  const [isLocked, setIsLocked] = useState(false); // Locked if existing deck found

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
      // Reset
      setErrorMsg(null);
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
      setIsHashing(true);

      // Short timeout to let UI render the spinner
      setTimeout(async () => {
        try {
          // 1. Fetch Config to match Backend Rules
          const config = await getProcessingConfig();

          // 2. Hash File (Raw)
          const hash = await generateFileHash(asset.uri, config);
          setFileHash(hash);
          setIsHashing(false);
          setIsChecking(true);

          // 3. Check Backend
          const check = await checkFileExistence(hash);
          setIsChecking(false);

          if (check.exists && check.decks && check.decks.length > 0) {
            const match = check.decks[0];

            // Auto-Fill & Lock
            setShowName(match.show_title);
            setEpisode(match.episode);
            setLanguage(match.language);
            setIsLocked(true);

            Alert.alert(
              "Known File",
              `This file matches an existing deck: "${match.show_title} - Ep ${match.episode}".\n\nWe will sync your progress instead of creating a duplicate.`
            );
          } else {
            // Try to guess episode from filename (Simple regex)
            const numbers = asset.name.match(/\d+/);
            if (numbers) {
              setEpisode(numbers[0]);
            }
          }
        } catch (e: any) {
          setIsHashing(false);
          setIsChecking(false);
          setErrorMsg(e.message);
        }
      }, 100);
    } catch (err) {
      setIsHashing(false);
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!originalFile || !showName)
      return Alert.alert("Missing Data", "Please fill in all fields.");

    setIsUploading(true);
    setProgressPercent(0);
    setStatusMsg("Uploading file...");

    try {
      // --- HERE IS WHERE WE PREPARE THE FILE FOR SENDING ---
      const formData = new FormData();

      // Append the file with the key 'subtitle_file' which matches
      // request.files["subtitle_file"] in the Python backend
      formData.append("subtitle_file", {
        uri: originalFile.uri, // Pointing to the file on the device
        name: originalFile.name,
        type: originalFile.mimeType || "text/plain",
      } as any);

      formData.append("show_name", showName);
      formData.append("episode", episode);
      formData.append("lan", language);
      formData.append("username", "mobile_user");

      // --- SENDING TO BACKEND ---
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
          style={[styles.uploadBox, errorMsg && { borderColor: "#FF7171" }]}
          onPress={handlePickFile}
          disabled={isUploading || isHashing || isChecking}
        >
          {isHashing ? (
            <View style={{ alignItems: "center" }}>
              <ActivityIndicator size="large" color="#A071FF" />
              <Text style={{ marginTop: 10, color: "#AAA" }}>
                Hashing File...
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
                color={errorMsg ? "#FF7171" : "#A071FF"}
              />
              <Text style={styles.fileName}>{originalFile.name}</Text>
              {isLocked ? (
                <Text style={styles.successMsg}>✓ Matched Existing Deck</Text>
              ) : (
                <Text style={styles.readyMsg}>Ready to Process</Text>
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
        {errorMsg && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#FF7171" />
            <Text style={styles.errorText}>Error: {errorMsg}</Text>
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
              (!originalFile || !showName || isChecking) && { opacity: 0.5 },
            ]}
            onPress={handleSubmit}
            disabled={!originalFile || !showName || isChecking}
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
  fileName: {
    marginTop: 10,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
  },
  successMsg: { fontSize: 12, color: "#4CAF50", marginTop: 4 },
  readyMsg: { fontSize: 12, color: "#AAA", marginTop: 4 },

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
