import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { WebView } from "react-native-webview";

type EngineState = "loading" | "ready" | "error";

export interface PreviewData {
  hash: string;
  text: string;
}

export function useSubtitleEngine() {
  const webViewRef = useRef<WebView>(null);

  const [engineState, setEngineState] = useState<EngineState>("loading");
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [pharBase64, setPharBase64] = useState<string | null>(null);
  const [libLoaded, setLibLoaded] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadResources();
  }, []);

  // Auto-inject Phar when engine is ready
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  useEffect(() => {
    if (isWebViewReady && pharBase64 && !libLoaded) {
      startChunkInjection();
    }
  }, [isWebViewReady, pharBase64, libLoaded]);

  // --- ACTIONS ---

  const processFile = async (fileUri: string) => {
    if (!libLoaded) {
      Alert.alert("Please wait", "Engine is initializing...");
      return;
    }

    try {
      setIsProcessing(true);
      setPreviewData(null);

      const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64",
      });

      if (webViewRef.current) {
        console.log("Sending file to PHP...");
        webViewRef.current.injectJavaScript(`window.resetSubtitleBuffer();`);

        const CHUNK_SIZE = 50000;
        const totalLength = fileBase64.length;
        let offset = 0;

        while (offset < totalLength) {
          const chunk = fileBase64.slice(offset, offset + CHUNK_SIZE);
          webViewRef.current.injectJavaScript(
            `window.appendSubtitleChunk("${chunk}");`,
          );
          await new Promise((resolve) => setTimeout(resolve, 10));
          offset += CHUNK_SIZE;
        }

        webViewRef.current.injectJavaScript(
          `window.processBufferedSubtitle();`,
        );
      }
    } catch (e) {
      setIsProcessing(false);
      Alert.alert("Error", "Could not read file.");
      console.error(e);
    }
  };

  const resetPreview = () => {
    setPreviewData(null);
    setIsProcessing(false);
  };

  // --- INTERNAL HELPERS ---

  const handleMessage = (event: any) => {
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
        console.log("WebView Ready.");
        setLibLoaded(false);
        setIsWebViewReady(true);
      } else if (data.type === "RESULT") {
        setIsProcessing(false);
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

  const startChunkInjection = async () => {
    if (!webViewRef.current) return;
    console.log("Injecting Library...");

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

    webViewRef.current.injectJavaScript(`window.installLibrary();`);
  };

  const loadResources = async () => {
    try {
      const [indexHtml, workerJs, installPhp, processPhp, phar] =
        await Promise.all([
          readFile(require("../assets/php/index.html")),
          readFile(require("../assets/php/worker.txt")),
          readFile(require("../assets/php/install.php")),
          readFile(require("../assets/php/process.php")),
          readFile(require("../assets/php/subtitles.phar"), "base64"),
        ]);

      let finalHtml = indexHtml;
      finalHtml = finalHtml.replace("// __INJECT_WORKER_JS__", () => workerJs);
      finalHtml = finalHtml.replace("{{INSTALL_PHP}}", () =>
        escapeForJsTemplate(installPhp),
      );
      finalHtml = finalHtml.replace("{{PROCESS_PHP}}", () =>
        escapeForJsTemplate(processPhp),
      );

      setHtmlContent(finalHtml);
      setPharBase64(phar);
    } catch (e) {
      console.error(e);
      setEngineState("error");
    }
  };

  const readFile = async (id: any, encoding: "utf8" | "base64" = "utf8") => {
    const asset = Asset.fromModule(id);
    await asset.downloadAsync();
    return FileSystem.readAsStringAsync(asset.localUri!, { encoding });
  };

  const escapeForJsTemplate = (str: string) =>
    str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\${/g, "\\${");

  return {
    webViewRef,
    htmlContent,
    engineState,
    isProcessing,
    libLoaded,
    previewData,
    processFile,
    resetPreview,
    handleMessage,
    // ✅ NEW: Exposed Setter so Simple Flow can inject data
    setPreviewData,
  };
}
