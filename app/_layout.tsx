import { Colors } from "@/constants/theme";
import "@/global.css";
import { dictionaryService } from "@/services/DictionaryService"; // <--- 1. Import Service
import { storageService } from "@/services/StorageService";
import { DarkTheme, Theme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react"; // <--- 2. Import useState
import { ActivityIndicator, Text, View } from "react-native"; // <--- 3. Import UI components

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Add state to track dictionary readiness
  const [isDictReady, setIsDictReady] = useState(false);

  const [fontsLoaded, error] = useFonts({
    YeonSung: require("@/assets/fonts/Yeon_Sung/YeonSung-Regular.ttf"),
    // "KleeOne-Regular": require("@/assets/fonts/Klee_One/KleeOne-Regular.ttf"),
    // "KleeOne-SemiBold": require("@/assets/fonts/Klee_One/KleeOne-SemiBold.ttf"),
    "Quicksand-Light": require("@/assets/fonts/Quicksand/static/Quicksand-Light.ttf"),
    "Quicksand-Regular": require("@/assets/fonts/Quicksand/static/Quicksand-Regular.ttf"),
    "Quicksand-Medium": require("@/assets/fonts/Quicksand/static/Quicksand-Medium.ttf"),
    "Quicksand-SemiBold": require("@/assets/fonts/Quicksand/static/Quicksand-SemiBold.ttf"),
    "Quicksand-Bold": require("@/assets/fonts/Quicksand/static/Quicksand-Bold.ttf"),
    "NotoSansJP-Thin": require("@/assets/fonts/Noto_Sans_JP/static/NotoSansJP-Thin.ttf"),
    "NotoSansJP-ExtraLight": require("@/assets/fonts/Noto_Sans_JP/static/NotoSansJP-ExtraLight.ttf"),
    "NotoSansJP-Light": require("@/assets/fonts/Noto_Sans_JP/static/NotoSansJP-Light.ttf"),
    "NotoSansJP-Regular": require("@/assets/fonts/Noto_Sans_JP/static/NotoSansJP-Regular.ttf"),
    "NotoSansJP-Medium": require("@/assets/fonts/Noto_Sans_JP/static/NotoSansJP-Medium.ttf"),
    "NotoSansJP-SemiBold": require("@/assets/fonts/Noto_Sans_JP/static/NotoSansJP-SemiBold.ttf"),
    "NotoSansJP-Bold": require("@/assets/fonts/Noto_Sans_JP/static/NotoSansJP-Bold.ttf"),
    "NotoSansJP-ExtraBold": require("@/assets/fonts/Noto_Sans_JP/static/NotoSansJP-ExtraBold.ttf"),
    "NotoSansJP-Black": require("@/assets/fonts/Noto_Sans_JP/static/NotoSansJP-Black.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Main Initialization Effect
  useEffect(() => {
    async function prepare() {
      // Only start if fonts are ready (so we can use them in the loading screen)
      if (fontsLoaded) {
        try {
          // 1. Set System UI
          await SystemUI.setBackgroundColorAsync(Colors.dark.background);

          // 2. Hide Native Splash (so we can show our custom "Loading Dict" text)
          await SplashScreen.hideAsync();

          // Initialize both services
          await Promise.all([
            dictionaryService.init(),
            storageService.init(), // <--- Add this
          ]);
        } catch (e) {
          console.warn("Error initializing app:", e);
        } finally {
          // 4. Mark as ready to render the App
          setIsDictReady(true);
        }
      }
    }

    prepare();
  }, [fontsLoaded]);

  // --- LOADING STATES ---

  // 1. Fonts not ready? Show Native Splash (return null)
  if (!fontsLoaded) {
    return null;
  }

  // 2. Fonts ready, but Dict loading? Show Custom Loading Screen
  if (!isDictReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.dark.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={Colors.dark.tertiary} />
        <Text
          style={{
            color: Colors.dark.text,
            marginTop: 20,
            fontFamily: "Quicksand-Regular",
            fontSize: 16,
          }}
        >
          Initializing Dictionary...
        </Text>
      </View>
    );
  }

  // --- MAIN APP ---

  const AppTheme: Theme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: Colors.dark.background,
      text: Colors.dark.text,
      card: Colors.dark.surface,
      border: "transparent",
      primary: Colors.dark.tertiary,
    },
  };

  return (
    <ThemeProvider value={AppTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="deck/[id]" />
      </Stack>
    </ThemeProvider>
  );
}
