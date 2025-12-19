import { Colors } from "@/constants/theme";
import { DarkTheme, Theme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar"; // Import StatusBar to force light text
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    YeonSung: require("@/assets/fonts/Yeon_Sung/YeonSung-Regular.ttf"),
    Quicksand: require("@/assets/fonts/Quicksand/Quicksand-VariableFont_wght.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (fontsLoaded) {
      // Set the system background to your dark color
      SystemUI.setBackgroundColorAsync(Colors.dark.background);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // We only need ONE theme now
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
      {/* Force status bar text to be white */}
      <StatusBar style="light" />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="deck/[id]" />
      </Stack>
    </ThemeProvider>
  );
}
