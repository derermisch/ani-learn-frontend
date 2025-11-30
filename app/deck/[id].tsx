import Ionicons from "@expo/vector-icons/Ionicons";
import { Asset } from "expo-asset";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { Deck } from "../../constants/types";
import { getDeckDetails, unlockDeckWithHash } from "../../services/api";

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

  // --- ENGINE STATE ---
  const [engineState, setEngineState] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [libLoaded, setLibLoaded] = useState(false);
  const [pharBase64, setPharBase64] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isWebViewReady, setIsWebViewReady] = useState(false);

  // --- UNLOCK & PREVIEW STATE ---
  const [isProcessing, setIsProcessing] = useState(false); // Controls spinners
  const [unlockStatus, setUnlockStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  // New: Stores result from PHP to show in UI
  const [previewData, setPreviewData] = useState<{
    hash: string;
    text: string;
  } | null>(null);

  useEffect(() => {
    if (id) loadDeck(id as string);
    loadResources();
  }, [id]);

  // --- 1. RESOURCE LOADING (ASSEMBLER) ---
  const loadResources = async () => {
    try {
      console.log("Loading Resources...");
      const [indexHtml, workerJs, installPhp, processPhp, phar] =
        await Promise.all([
          readFile(require("../../assets/php/index.html")),
          readFile(require("../../assets/php/worker.txt")),
          readFile(require("../../assets/php/install.php")),
          readFile(require("../../assets/php/process.php")),
          readFile(require("../../assets/php/subtitles.phar"), "base64"),
        ]);

      if (!workerJs) throw new Error("Worker JS failed");

      // Assemble HTML
      let finalHtml = indexHtml;
      finalHtml = finalHtml.replace("// __INJECT_WORKER_JS__", () => workerJs);

      const safeInstall = escapeForJsTemplate(installPhp);
      const safeProcess = escapeForJsTemplate(processPhp);
      finalHtml = finalHtml.replace("{{INSTALL_PHP}}", () => safeInstall);
      finalHtml = finalHtml.replace("{{PROCESS_PHP}}", () => safeProcess);

      setHtmlContent(finalHtml);
      setPharBase64(phar);
      console.log("HTML Assembled.");
    } catch (e) {
      console.error("Resource Load Failed", e);
      Alert.alert("Error", "Failed to load engine resources.");
    }
  };

  // --- 2. AUTOMATIC INJECTION LOGIC ---
  useEffect(() => {
    if (isWebViewReady && pharBase64 && !libLoaded) {
      startChunkInjection();
    }
  }, [isWebViewReady, pharBase64, libLoaded]);

  const startChunkInjection = async () => {
    if (!webViewRef.current) return;
    console.log("Starting Chunked Injection...");

    webViewRef.current.injectJavaScript(`window.resetPharFile();`);

    const CHUNK_SIZE = 48000;
    const totalLength = pharBase64!.length;
    let offset = 0;

    while (offset < totalLength) {
      const chunk = pharBase64!.slice(offset, offset + CHUNK_SIZE);
      webViewRef.current.injectJavaScript(`window.appendChunk("${chunk}");`);
      await new Promise((resolve) => setTimeout(resolve, 15));
      offset += CHUNK_SIZE;
    }

    console.log(`Sent ${Math.ceil(totalLength / CHUNK_SIZE)} chunks.`);
    webViewRef.current.injectJavaScript(`window.installLibrary();`);
  };

  // --- 3. UI HANDLERS ---

  const handlePickFile = async () => {
    if (!libLoaded) {
      Alert.alert("Please wait", "Verification engine is initializing...");
      return;
    }

    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;

      // Reset states
      setIsProcessing(true);
      setUnlockStatus("idle");
      setPreviewData(null);

      const fileBase64 = await FileSystem.readAsStringAsync(res.assets[0].uri, {
        encoding: "base64",
      });

      if (webViewRef.current) {
        console.log("Sending file to PHP...");
        // 1. Reset Buffer
        webViewRef.current.injectJavaScript(`window.resetSubtitleBuffer();`);

        // 2. Send Chunks
        const CHUNK_SIZE = 50000;
        const totalLength = fileBase64.length;
        let offset = 0;

        while (offset < totalLength) {
          const chunk = fileBase64.slice(offset, offset + CHUNK_SIZE);
          webViewRef.current.injectJavaScript(
            `window.appendSubtitleChunk("${chunk}");`
          );
          await new Promise((resolve) => setTimeout(resolve, 10));
          offset += CHUNK_SIZE;
        }

        // 3. Process
        webViewRef.current.injectJavaScript(
          `window.processBufferedSubtitle();`
        );
      }
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert("File Error", "Could not read the file.");
    }
  };

  const handleConfirmUnlock = async () => {
    if (!previewData || !id) return;

    setIsProcessing(true); // Show loading on the confirm button
    try {
      const result = await unlockDeckWithHash(id as string, previewData.hash);

      if (result.success) {
        setUnlockStatus("success");
        setPreviewData(null); // Clear preview to show success message
        Alert.alert("Unlocked!", "Ownership verified. Enjoy studying!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        setUnlockStatus("error");
        Alert.alert(
          "Verification Failed",
          "Subtitle file does not match this deck."
        );
      }
    } catch (e: any) {
      setUnlockStatus("error");
      Alert.alert("Error", e.message || "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewData(null);
    setIsProcessing(false);
    setUnlockStatus("idle");
  };

  // --- 4. WEBVIEW BRIDGE ---
  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "LOG") {
        console.log(" [WebView] >", data.message);
        if (data.message === "Library installed successfully!") {
          setLibLoaded(true);
          setEngineState("ready");
        }
        return;
      }

      if (data.type === "READY") {
        console.log("WebView Ready. Resetting injection state...");
        setLibLoaded(false);
        setIsWebViewReady(true);
      } else if (data.type === "RESULT") {
        // PHP finished! Stop processing spinner and show Preview UI
        setIsProcessing(false);
        // data.payload contains { hash, preview }
        setPreviewData({
          hash: data.payload.hash,
          text: data.payload.preview,
        });
      }
    } catch (e) {
      console.error("Bridge Error", e);
      setIsProcessing(false);
    }
  };

  // --- HELPERS ---
  const loadDeck = async (deckId: string) => {
    try {
      const data = await getDeckDetails(deckId);
      setDeck(data);
    } catch (e) {
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const readFile = async (
    requireId: any,
    encoding: "utf8" | "base64" = "utf8"
  ) => {
    const asset = Asset.fromModule(requireId);
    await asset.downloadAsync();
    return FileSystem.readAsStringAsync(asset.localUri!, { encoding });
  };

  const escapeForJsTemplate = (str: string) => {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\${/g, "\\${");
  };

  // --- RENDER ---
  if (loading || !deck) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#A071FF" />
      </View>
    );
  }

  const placeholderChar = (deck.title || "U").substring(0, 2).toUpperCase();
  const isEngineReady = engineState === "ready" && libLoaded;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Cover Art */}
        <View style={styles.coverPlaceholder}>
          <Text style={styles.coverText}>{placeholderChar}</Text>
        </View>

        <Text style={styles.title}>{deck.title}</Text>
        <Text style={styles.subtitle}>Episode {deck.episode}</Text>

        {/* Metadata Badges */}
        <View style={styles.metaContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{deck.lang.toUpperCase()}</Text>
          </View>
          <Text style={styles.metaText}>{deck.cards} Cards</Text>
          <Text style={styles.metaText}>•</Text>
          <Text style={styles.metaText}>
            By {deck.creator_name || "Unknown"}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* --- DYNAMIC UNLOCK SECTION --- */}
        <View style={styles.unlockContainer}>
          {/* CASE 1: SHOW PREVIEW */}
          {previewData ? (
            <View style={{ width: "100%", alignItems: "center" }}>
              <Ionicons
                name="document-text-outline"
                size={32}
                color="#A071FF"
              />
              <Text style={styles.unlockTitle}>Confirm Subtitle</Text>
              <Text style={styles.unlockDesc}>
                We successfully parsed the file. Does this text look correct?
              </Text>

              {/* Text Preview Box */}
              <View style={styles.previewBox}>
                <Text style={styles.previewContent}>
                  {previewData.text}
                  {"\n"}...
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={handleCancelPreview}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn]}
                  onPress={handleConfirmUnlock}
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
          ) : (
            /* CASE 2: SHOW UPLOAD FORM */
            <>
              <Ionicons name="lock-closed" size={32} color="#666" />
              <Text style={styles.unlockTitle}>Deck Locked</Text>
              <Text style={styles.unlockDesc}>
                To access the flashcards for this episode, please upload your
                subtitle file for verification.
              </Text>

              <TouchableOpacity
                style={[
                  styles.unlockBtn,
                  { opacity: !isEngineReady || isProcessing ? 0.6 : 1 },
                ]}
                onPress={handlePickFile}
                disabled={!isEngineReady || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={20}
                      color="#000"
                    />
                    <Text style={styles.unlockBtnText}>
                      {!isEngineReady
                        ? "Loading Engine..."
                        : "Upload Subtitle File"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {unlockStatus === "success" && (
                <Text style={styles.successText}>
                  ✓ Verification Successful
                </Text>
              )}
              {isProcessing && !previewData && (
                <Text style={styles.processingText}>Processing locally...</Text>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* HIDDEN WEBVIEW */}
      {htmlContent && (
        <View
          style={{
            height: 1,
            width: 1,
            opacity: 0,
            position: "absolute",
            top: -10,
            left: -10,
          }}
        >
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            onMessage={handleWebViewMessage}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            mixedContentMode="always"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#151718" },
  header: { marginTop: 50, paddingHorizontal: 20, marginBottom: 10 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { padding: 20, alignItems: "center" },
  coverPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 20,
    backgroundColor: "#2C2C2C",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#444",
  },
  coverText: { fontSize: 48, fontWeight: "bold", color: "#555" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: { fontSize: 18, color: "#AAA", marginBottom: 15 },
  metaContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    backgroundColor: "#333",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },
  metaText: { color: "#888", fontSize: 14 },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#333",
    marginVertical: 30,
  },

  // Unlock Section
  unlockContainer: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    borderStyle: "dashed",
  },
  unlockTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
    marginTop: 10,
    marginBottom: 10,
  },
  unlockDesc: {
    color: "#888",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  unlockBtn: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  unlockBtnText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  successText: { color: "#4CAF50", marginTop: 15, fontWeight: "bold" },
  processingText: { color: "#A071FF", marginTop: 15, fontStyle: "italic" },

  // Preview Styles
  previewBox: {
    width: "100%",
    backgroundColor: "#000",
    borderRadius: 8,
    padding: 15,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  previewContent: {
    color: "#CCC",
    fontFamily: "monospace", // Makes it look like raw text/code
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
  cancelBtn: {
    backgroundColor: "#333",
  },
  cancelBtnText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  confirmBtn: {
    backgroundColor: "#A071FF",
  },
  confirmBtnText: {
    color: "#000",
    fontWeight: "bold",
  },
});
