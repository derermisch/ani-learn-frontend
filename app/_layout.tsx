import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#151718" },
          headerTintColor: "#fff",
          headerShadowVisible: false, // Removes the ugly line under headers
          contentStyle: { backgroundColor: "#151718" },
        }}
      >
        {/* Home Screen */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* Browse Decks */}
        <Stack.Screen
          name="browse-decks"
          options={{
            headerTitle: "Library",
            headerBackTitle: "Home",
          }}
        />

        {/* Create Deck */}
        <Stack.Screen
          name="create-deck"
          options={{
            headerShown: false,
            presentation: "modal", // Makes it slide up like a form
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
