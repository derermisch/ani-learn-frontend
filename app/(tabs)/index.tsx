import { RecentDeckCard } from "@/components/RecentDeckCard";
import { MOCK_DECKS } from "@/constants/mockData";
import { Colors, f, s, SizesRaw, SizesScaled } from "@/constants/theme";
import { Deck } from "@/constants/types";
import "@/global.css";
import { getUserLibrary } from "@/services/api";
import { JsonDatabase } from "@/services/jsonDatabase";
import { storageService } from "@/services/StorageService";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { Link, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  ArrowRightIcon,
  Database,
  GearIcon,
  LockKey,
  Trash,
  X,
} from "phosphor-react-native"; // Import icon
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
      "Reset Database?",
      "This will wipe all card progress (FSRS data).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Wipe it",
          style: "destructive",
          onPress: async () => {
            await JsonDatabase.resetDatabase();
            Alert.alert(
              "Done",
              "Database reset to mock data. Please restart app."
            );
          },
        },
      ]
    );
  };

  const handleLockAllDecks = async () => {
    Alert.alert(
      "Lock All Decks?",
      "You will lose access to all decks until you verify them again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Lock All",
          style: "destructive",
          onPress: async () => {
            await storageService.lockAllDecks();
            Alert.alert("Done", "All decks are now locked.");
          },
        },
      ]
    );
  };

  const handleExportDB = async () => {
    try {
      // 1. Force WAL Merge so the main file is up to date
      await storageService.forceCheckpoint();

      // 2. Sanity Check: Log internal count
      const count = await storageService.getCardCount();
      console.log(`[Export] Current card count in DB: ${count}`);

      // 3. Locate file
      const dbUri = FileSystem.documentDirectory + "SQLite/storage.db";

      // 4. Share
      if (!(await FileSystem.getInfoAsync(dbUri)).exists) {
        Alert.alert("Error", "No DB file found");
        return;
      }

      await Sharing.shareAsync(dbUri, {
        dialogTitle: `Export DB (${count} cards)`,
        mimeType: "application/x-sqlite3",
        UTI: "public.database",
      });
    } catch (e) {
      console.error("Export failed", e);
      Alert.alert("Error", "Export failed");
    }
  };

  const handleResetStorage = async () => {
    Alert.alert(
      "Reset Storage DB?",
      "This wipes all downloaded decks and cards. You will need to unlock them again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await storageService.resetDatabase();
            Alert.alert("Success", "Storage database has been reset.");
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

      {/* --- SETTINGS MODAL (Refreshed) --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSettingsOpen}
        onRequestClose={() => setIsSettingsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsSettingsOpen(false)}>
          <View className="flex-1 bg-black/80 justify-end">
            <TouchableWithoutFeedback>
              <View
                className="bg-[#1E1E1E] w-full rounded-t-3xl border-t border-white/10 overflow-hidden"
                style={{ paddingBottom: insets.bottom + 20 }}
              >
                {/* Drag Handle */}
                <View className="w-full items-center pt-4 pb-2">
                  <View className="w-12 h-1 bg-white/20 rounded-full" />
                </View>

                {/* Header */}
                <View className="flex-row justify-between items-center px-6 mb-8">
                  <Text className="text-white font-heading text-2xl">
                    Settings
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsSettingsOpen(false)}
                    className="bg-white/10 p-2 rounded-full"
                  >
                    <X color="white" size={20} />
                  </TouchableOpacity>
                </View>

                {/* General Info */}
                <View className="px-6 mb-8">
                  <View className="flex-row justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
                    <Text className="text-white font-medium">Version</Text>
                    <Text className="text-white/50">1.0.0 (Alpha)</Text>
                  </View>
                </View>

                {/* DEBUG ZONE */}
                {DEBUG_MODE && (
                  <View className="px-6">
                    <Text className="text-white/30 font-bold mb-4 text-xs uppercase tracking-widest pl-1">
                      Developer Tools
                    </Text>

                    <View className="gap-3">
                      {/* 1. RESET DB */}
                      <TouchableOpacity
                        onPress={handleResetLibrary}
                        className="bg-surface border border-white/10 p-4 rounded-xl flex-row items-center justify-between active:bg-red-500/10 active:border-red-500/50"
                      >
                        <View className="flex-row items-center gap-4">
                          <View className="w-10 h-10 rounded-full bg-red-500/20 items-center justify-center">
                            <Trash color="#EF4444" size={20} weight="fill" />
                          </View>
                          <View>
                            <Text className="text-white font-bold text-base">
                              Reset Progress
                            </Text>
                            <Text className="text-white/40 text-xs">
                              Wipes learning data (FSRS)
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color="#555"
                        />
                      </TouchableOpacity>

                      {/* 2. LOCK DECKS (New) */}
                      <TouchableOpacity
                        onPress={handleLockAllDecks}
                        className="bg-surface border border-white/10 p-4 rounded-xl flex-row items-center justify-between active:bg-orange-500/10 active:border-orange-500/50"
                      >
                        <View className="flex-row items-center gap-4">
                          <View className="w-10 h-10 rounded-full bg-orange-500/20 items-center justify-center">
                            <LockKey color="#F97316" size={20} weight="fill" />
                          </View>
                          <View>
                            <Text className="text-white font-bold text-base">
                              Lock All Decks
                            </Text>
                            <Text className="text-white/40 text-xs">
                              Forces re-verification
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color="#555"
                        />
                      </TouchableOpacity>

                      {/* 3. EXPORT DB (New) */}
                      <TouchableOpacity
                        onPress={handleExportDB}
                        className="bg-surface border border-white/10 p-4 rounded-xl flex-row items-center justify-between active:bg-blue-500/10 active:border-blue-500/50"
                      >
                        <View className="flex-row items-center gap-4">
                          <View className="w-10 h-10 rounded-full bg-blue-500/20 items-center justify-center">
                            <Ionicons
                              name="share-outline"
                              size={20}
                              color="#3B82F6"
                            />
                          </View>
                          <View>
                            <Text className="text-white font-bold text-base">
                              Export DB
                            </Text>
                            <Text className="text-white/40 text-xs">
                              Analyze in DB Browser
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color="#555"
                        />
                      </TouchableOpacity>

                      {/* 4. RESET STORAGE DB (New) */}
                      <TouchableOpacity
                        onPress={handleResetStorage}
                        className="bg-surface border border-white/10 p-4 rounded-xl flex-row items-center justify-between active:bg-purple-500/10 active:border-purple-500/50"
                      >
                        <View className="flex-row items-center gap-4">
                          <View className="w-10 h-10 rounded-full bg-purple-500/20 items-center justify-center">
                            <Database color="#A855F7" size={20} weight="fill" />
                          </View>
                          <View>
                            <Text className="text-white font-bold text-base">
                              Reset Storage DB
                            </Text>
                            <Text className="text-white/40 text-xs">
                              Fixes schema/column issues
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color="#555"
                        />
                      </TouchableOpacity>
                    </View>
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
