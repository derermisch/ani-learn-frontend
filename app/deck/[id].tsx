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
import { phpRunnerHtml } from "../../utils/phpRunner";

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

  // Engine State
  const [engineState, setEngineState] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [libLoaded, setLibLoaded] = useState(false);
  const [pharBase64, setPharBase64] = useState<string | null>(null);

  // Track injection status
  const [isWebViewReady, setIsWebViewReady] = useState(false);

  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockStatus, setUnlockStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");

  useEffect(() => {
    if (id) loadDeck(id as string);
    // Load the .phar file into JS memory immediately
    injectPharLibrary().then(setPharBase64);
  }, [id]);

  // --- AUTOMATIC INJECTION ---
  useEffect(() => {
    // If WebView is ready AND we have the file AND we haven't loaded the lib yet...
    if (isWebViewReady && pharBase64 && !libLoaded) {
      startChunkInjection();
    }
  }, [isWebViewReady, pharBase64, libLoaded]);

  const startChunkInjection = async () => {
    // Prevent running if WebView ref is gone
    if (!webViewRef.current) return;

    console.log("Starting Chunked Injection...");

    // 1. CLEAR existing file (Good practice for restarts)
    webViewRef.current.injectJavaScript(`window.resetPharFile();`);

    const CHUNK_SIZE = 48000;
    const totalLength = pharBase64!.length;
    let offset = 0;

    while (offset < totalLength) {
      const chunk = pharBase64!.slice(offset, offset + CHUNK_SIZE);
      const injectChunk = `window.appendChunk("${chunk}");`;

      webViewRef.current.injectJavaScript(injectChunk);

      // Short delay to prevent message flooding
      await new Promise((resolve) => setTimeout(resolve, 15));

      offset += CHUNK_SIZE;
    }

    console.log(
      `Sent ${Math.ceil(totalLength / CHUNK_SIZE)} chunks. Installing...`
    );
    const finalize = `window.installLibrary();`;
    webViewRef.current.injectJavaScript(finalize);
  };

  const loadDeck = async (deckId: string) => {
    try {
      const data = await getDeckDetails(deckId);
      setDeck(data);
    } catch (e) {
      Alert.alert("Error", "Could not load deck details");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const injectPharLibrary = async () => {
    try {
      console.log("Reading Phar File...");
      const asset = Asset.fromModule(
        require("../../assets/php/subtitles.phar")
      );
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error("Phar file not found");

      const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: "base64",
      });
      console.log("Phar File Read Complete.");
      return base64;
    } catch (e) {
      console.error("Failed to load subtitles.phar", e);
      setEngineState("error");
      return null;
    }
  };

  const handlePickFile = async () => {
    // Double check state before allowing pick
    if (!libLoaded) {
      Alert.alert("Please wait", "Verification engine is re-loading...");
      return;
    }

    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;
      const asset = res.assets[0];

      setIsUnlocking(true);
      setUnlockStatus("processing");

      const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: "utf8",
      });

      if (webViewRef.current) {
        console.log("Sending file to PHP...");
        const inject = `window.processSubtitle(${JSON.stringify(
          fileContent
        )});`;
        webViewRef.current.injectJavaScript(inject);
      }
    } catch (e: any) {
      setIsUnlocking(false);
      setUnlockStatus("error");
      Alert.alert("File Error", "Could not read the file.");
      console.error(e);
    }
  };

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
        console.log("WebView Reported Ready. Resetting injection state...");
        setLibLoaded(false);
        setIsWebViewReady(true);
      } else if (data.type === "RESULT") {
        // --- NEW: Handle JSON Payload ---
        const { hash, preview } = data.payload;

        console.log("Generated Hash:", hash);
        console.log("Preview:\n", preview);

        // Show Preview to User
        Alert.alert("File Parsed Successfully", `Preview:\n\n${preview}\n...`, [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setIsUnlocking(false),
          },
          {
            text: "Verify & Unlock",
            onPress: () => verifyHashWithBackend(hash),
          },
        ]);
      }
    } catch (e) {
      console.error("WebView Message Error", e);
    }
  };

  const verifyHashWithBackend = async (hash: string) => {
    try {
      const result = await unlockDeckWithHash(id as string, hash);

      if (result.success) {
        setUnlockStatus("success");
        Alert.alert("Unlocked!", "Ownership verified. Enjoy studying!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        setUnlockStatus("error");
        Alert.alert("Verification Failed", "Subtitle file does not match.");
      }
    } catch (e: any) {
      setUnlockStatus("error");
      Alert.alert("Error", e.message || "An error occurred");
    } finally {
      setIsUnlocking(false);
    }
  };

  if (loading || !deck) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#A071FF" />
      </View>
    );
  }

  const title = deck.title || "Untitled";
  const placeholderChar = title.substring(0, 2).toUpperCase();
  const isEngineReady = engineState === "ready" && libLoaded;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.coverPlaceholder}>
          <Text style={styles.coverText}>{placeholderChar}</Text>
        </View>

        <Text style={styles.title}>{deck.title}</Text>
        <Text style={styles.subtitle}>Episode {deck.episode}</Text>

        <View style={styles.unlockContainer}>
          <Ionicons name="lock-closed" size={32} color="#666" />
          <Text style={styles.unlockTitle}>Deck Locked</Text>
          <Text style={styles.unlockDesc}>
            To access the flashcards for this episode, please upload your
            subtitle file for verification.
          </Text>

          <TouchableOpacity
            style={[
              styles.unlockBtn,
              { opacity: !isEngineReady || isUnlocking ? 0.6 : 1 },
            ]}
            onPress={handlePickFile}
            disabled={!isEngineReady || isUnlocking}
          >
            {isUnlocking ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="key-outline" size={20} color="#000" />
                <Text style={styles.unlockBtnText}>
                  {!isEngineReady
                    ? "Loading Engine..."
                    : "Upload Subtitle File"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {unlockStatus === "success" && (
            <Text style={styles.successText}>✓ Verification Successful</Text>
          )}
          {unlockStatus === "processing" && (
            <Text style={styles.processingText}>
              Processing file locally...
            </Text>
          )}
        </View>
      </ScrollView>

      {/* HIDDEN WEBVIEW */}
      <View
        style={{
          height: 0,
          width: 0,
          overflow: "hidden",
          position: "absolute",
        }}
      >
        <WebView
          ref={webViewRef}
          source={{ html: phpRunnerHtml }}
          onMessage={handleWebViewMessage}
          originWhitelist={["*"]}
          javaScriptEnabled={true}
        />
      </View>
    </View>
  );
}
// Styles remain the same...
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
  unlockContainer: {
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
});
