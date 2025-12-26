import { RecentDeckCard } from "@/components/RecentDeckCard";
import { MOCK_DECKS } from "@/constants/mockData";
import { Colors, f, s, SizesRaw, SizesScaled } from "@/constants/theme";
import { Deck } from "@/constants/types";
import "@/global.css";
import { getUserLibrary } from "@/services/api";
import { JsonDatabase } from "@/services/jsonDatabase";
import * as FileSystem from "expo-file-system/legacy";
import { Link, useRouter } from "expo-router";
import { ArrowRightIcon, GearIcon, Trash, X } from "phosphor-react-native"; // Added Trash icon
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- DEBUG CONFIG ---
const DEBUG_MODE = true;

export default function HomeScreen() {
  const activeColors = Colors["dark"];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [recentDecks, setRecentDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    if (DEBUG_MODE) {
      setTimeout(() => {
        setRecentDecks(MOCK_DECKS);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      const data = await getUserLibrary();
      setRecentDecks(data.decks);
    } catch (error) {
      console.error("Failed to load library:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- DEBUG ACTIONS ---
  const handleInspectLibrary = async () => {
    try {
      const path = FileSystem.documentDirectory + "library.json";
      const info = await FileSystem.getInfoAsync(path);

      if (!info.exists) {
        Alert.alert("Debug", "library.json does not exist yet.");
        return;
      }

      const content = await FileSystem.readAsStringAsync(path);
      const parsed = JSON.parse(content);
      const prettyJson = JSON.stringify(parsed, null, 2);

      console.log("[DEBUG] library.json content:", prettyJson);
      Alert.alert(
        "library.json",
        "Check console for full output.\n\nPreview:\n" +
          prettyJson.substring(0, 500) +
          "..."
      );
    } catch (e) {
      Alert.alert("Error", "Could not read library.json");
    }
  };

  const handleResetLibrary = async () => {
    Alert.alert(
      "Reset Database",
      "This will delete library.json and re-seed it with the original Mock Data. All progress will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await JsonDatabase.resetDatabase();
            Alert.alert("Success", "Database reset. Restarting...");
            // Reload data to reflect changes
            loadData();
            setIsSettingsOpen(false);
          },
        },
      ]
    );
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + SizesScaled.spacing.sm_16,
          paddingBottom: s(100),
          minHeight: "100%",
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            tintColor={activeColors.tertiary}
            progressBackgroundColor={activeColors.surface}
          />
        }
      >
        <View
          className="flex-column"
          style={{ gap: SizesScaled.spacing.sm_24 }}
        >
          {/* --- HEADER --- */}
          <View className="flex-row justify-between items-center p-sm_16">
            <Text
              className="text-foreground tracking-widest font-heading flex-1"
              style={{ fontSize: f(32) }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              WELCOME, FABE
            </Text>

            <TouchableOpacity onPress={() => setIsSettingsOpen(true)}>
              <GearIcon
                color={activeColors.text}
                size={SizesRaw.iconMd}
                weight="fill"
              />
            </TouchableOpacity>
          </View>

          <View className="flex-col" style={{ gap: SizesScaled.spacing.sm_16 }}>
            {/* --- RECENT SECTION --- */}
            <View className="flex-row justify-between items-center p-sm_16">
              <Text
                className="text-foreground font-medium font-sans"
                style={{ fontSize: f(16) }}
              >
                Jump in where you left off
              </Text>
              <Link href="/(tabs)/library" asChild>
                <TouchableOpacity>
                  <ArrowRightIcon
                    size={SizesRaw.iconMd}
                    color={activeColors.tertiary}
                  />
                </TouchableOpacity>
              </Link>
            </View>

            {/* Horizontal Carousel */}
            <View className="w-auto h-auto pl-sm_16">
              {loading ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator
                    color={activeColors.tertiary}
                    size="large"
                  />
                </View>
              ) : recentDecks.length > 0 ? (
                <FlatList
                  contentContainerClassName="gap-sm_16"
                  data={recentDecks}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <RecentDeckCard
                      deck={item}
                      onPress={() => router.push(`/deck/${item.id}/study`)}
                    />
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                />
              ) : (
                <View className="justify-center" style={{ height: s(200) }}>
                  <Text
                    className="text-foreground opacity-60 mb-xxs_8"
                    style={{ fontSize: f(16) }}
                  >
                    No decks started yet.
                  </Text>
                  <Link href="/(tabs)/browse" asChild>
                    <TouchableOpacity className="bg-tertiary rounded-sm_8 self-start px-sm_16 py-xxs_8">
                      <Text
                        className="text-white font-bold"
                        style={{ fontSize: f(14) }}
                      >
                        Browse Decks
                      </Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* --- FOOTER --- */}
        <View className="items-center mt-lg_96 mb-md_48">
          <Text
            className="text-foreground text-center mb-1 leading-6 font-sans opacity-50"
            style={{ fontSize: f(14) }}
          >
            This app is work in progress!
          </Text>
          <Text
            className="text-foreground text-center mb-1 leading-6 font-sans opacity-50"
            style={{ fontSize: f(14) }}
          >
            If you got any feedback or ideas, send it to:
          </Text>
          <Text
            className="text-foreground font-bold underline mt-2"
            style={{ fontSize: f(14) }}
          >
            fabian.ermisch@googlemail.com
          </Text>
          <Text
            className="text-foreground text-center mb-1 leading-6 mt-5 font-sans opacity-50"
            style={{ fontSize: f(14) }}
          >
            Thank you for trying out the app!
          </Text>
        </View>
      </ScrollView>

      {/* --- SETTINGS MODAL --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isSettingsOpen}
        onRequestClose={() => setIsSettingsOpen(false)}
        statusBarTranslucent={true}
      >
        <TouchableWithoutFeedback onPress={() => setIsSettingsOpen(false)}>
          <View className="flex-1 bg-black/60 justify-center items-center px-5">
            <TouchableWithoutFeedback>
              <View className="bg-surface w-full max-w-sm p-6 rounded-2xl border border-white/10 shadow-xl">
                {/* Modal Header */}
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-foreground font-heading text-2xl">
                    Settings
                  </Text>
                  <TouchableOpacity onPress={() => setIsSettingsOpen(false)}>
                    <X color={activeColors.text} size={24} />
                  </TouchableOpacity>
                </View>

                {/* Normal Settings */}
                <View className="mb-6">
                  <Text className="text-foreground/50 text-sm">
                    App Version: 1.0.0 (Alpha)
                  </Text>
                </View>

                {/* DEBUG SECTION */}
                {DEBUG_MODE && (
                  <View className="border-t border-white/10 pt-4 mt-2">
                    <Text className="text-red-400 font-bold mb-3 text-xs uppercase tracking-widest">
                      Debug Zone
                    </Text>

                    {/* INSPECT BUTTON */}
                    <TouchableOpacity
                      onPress={handleInspectLibrary}
                      className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex-row items-center justify-center mb-3"
                    >
                      <Text className="text-red-400 font-bold">
                        Show library.json
                      </Text>
                    </TouchableOpacity>

                    {/* RESET BUTTON */}
                    <TouchableOpacity
                      onPress={handleResetLibrary}
                      className="bg-red-500/20 border-2 border-red-500 p-4 rounded-xl flex-row items-center justify-center gap-2"
                    >
                      <Trash color="#EF4444" size={20} weight="bold" />
                      <Text className="text-red-400 font-bold">
                        Reset Database
                      </Text>
                    </TouchableOpacity>

                    <Text className="text-foreground/30 text-xs mt-2 text-center">
                      WARNING: Resets all learning progress
                    </Text>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
