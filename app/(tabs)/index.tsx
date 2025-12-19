import { RecentDeckCard } from "@/components/RecentDeckCard";
import { MOCK_DECKS } from "@/constants/mockData"; // <--- Import Mock Data
import { Colors, f, s, SizesRaw } from "@/constants/theme";
import { Deck } from "@/constants/types";
import "@/global.css";
import { getUserLibrary } from "@/services/api";
import { Link, useRouter } from "expo-router";
import { ArrowRightIcon, GearIcon } from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// --- DEBUG CONFIG ---
const DEBUG_MODE = true; // Set to 'false' to use real API

export default function HomeScreen() {
  const activeColors = Colors["dark"];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [recentDecks, setRecentDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    if (DEBUG_MODE) {
      // Simulate network delay for realism
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

  return (
    <>
      <ScrollView
        contentContainerClassName="p-sm_16"
        contentContainerStyle={{
          paddingTop: insets.top + SizesRaw.spacing.sm_16,
          paddingBottom: s(100),
          minHeight: "100%", // Changed height to minHeight for better scrolling
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
        <View className="flex-column gap-sm_24">
          {/* --- HEADER --- */}
          <View className="flex-row justify-between items-center">
            <Text
              className="text-foreground tracking-widest font-heading flex-1"
              style={{ fontSize: f(32) }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              WELCOME, FABE
            </Text>
            <TouchableOpacity>
              <GearIcon
                color={activeColors.text}
                size={SizesRaw.iconMd}
                weight="fill"
              />
            </TouchableOpacity>
          </View>

          <View className="flex-col gap-sm_16">
            {/* --- RECENT SECTION --- */}
            <View className="flex-row justify-between items-center">
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
            <View className="w-auto h-auto">
              {loading ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator
                    color={activeColors.tertiary}
                    size="large"
                  />
                </View>
              ) : recentDecks.length > 0 ? (
                <FlatList
                  data={recentDecks}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <RecentDeckCard
                      deck={item}
                      onPress={() => router.push(`/deck/${item.id}`)}
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
        <View className="items-center mt-xl_128 mb-md_48">
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
    </>
  );
}

// <View className="flex-row">
//         {/* --- TEST BUTTON: Direct Toggle --- */}
//         <TouchableOpacity
//           className="p-2 ml-2 bg-surface rounded-full"
//           onPress={handleDirectToggle}
//         >
//           {scheme === "dark" ? (
//             <Sun size={24} color={activeColors.tertiary} weight="fill" />
//           ) : (
//             <Moon size={24} color={activeColors.text} weight="fill" />
//           )}
//         </TouchableOpacity>

//         <TouchableOpacity
//           className="p-2 ml-2"
//           onPress={() => setIsSettingsOpen(true)} // Open Modal here
//         >
//           <Gear size={28} color={activeColors.text} weight="fill" />
//         </TouchableOpacity>
//       </View>

//  {/* --- MODAL (Kept for comparison) --- */}
//       <Modal
//         animationType="fade"
//         transparent={true}
//         visible={isSettingsOpen}
//         onRequestClose={() => setIsSettingsOpen(false)}
//         statusBarTranslucent={true}
//       >
//         <TouchableWithoutFeedback onPress={() => setIsSettingsOpen(false)}>
//           <View className="flex-1 bg-black/50 justify-center items-center px-5">
//             <TouchableWithoutFeedback>
//               <View
//                 className="bg-surface w-full rounded-2xl p-5 shadow-lg"
//                 style={{ maxWidth: 400 }}
//               >
//                 <Text
//                   className="text-foreground font-heading text-2xl mb-5 text-center"
//                   style={{ fontSize: f(24) }}
//                 >
//                   Settings
//                 </Text>

//                 <Text className="text-foreground opacity-60 mb-3 font-sans">
//                   Appearance
//                 </Text>

//                 {/* Light Mode Option */}
//                 <TouchableOpacity
//                   onPress={() => toggleTheme("light")}
//                   className={`flex-row items-center p-4 rounded-xl mb-3 border ${
//                     scheme === "light"
//                       ? "border-tertiary bg-tertiary/10"
//                       : "border-transparent bg-background"
//                   }`}
//                 >
//                   <Sun
//                     size={24}
//                     color={
//                       scheme === "light"
//                         ? activeColors.tertiary
//                         : activeColors.text
//                     }
//                   />
//                   <Text
//                     className={`ml-3 font-bold text-base ${
//                       scheme === "light" ? "text-tertiary" : "text-foreground"
//                     }`}
//                   >
//                     Light Mode
//                   </Text>
//                 </TouchableOpacity>

//                 {/* Dark Mode Option */}
//                 <TouchableOpacity
//                   onPress={() => toggleTheme("dark")}
//                   className={`flex-row items-center p-4 rounded-xl border ${
//                     scheme === "dark"
//                       ? "border-tertiary bg-tertiary/10"
//                       : "border-transparent bg-background"
//                   }`}
//                 >
//                   <Moon
//                     size={24}
//                     color={
//                       scheme === "dark"
//                         ? activeColors.tertiary
//                         : activeColors.text
//                     }
//                   />
//                   <Text
//                     className={`ml-3 font-bold text-base ${
//                       scheme === "dark" ? "text-tertiary" : "text-foreground"
//                     }`}
//                   >
//                     Dark Mode
//                   </Text>
//                 </TouchableOpacity>

//                 {/* Close Button */}
//                 <TouchableOpacity
//                   onPress={() => setIsSettingsOpen(false)}
//                   className="mt-4 self-center p-2"
//                 >
//                   <Text className="text-foreground opacity-50">Close</Text>
//                 </TouchableOpacity>
//               </View>
//             </TouchableWithoutFeedback>
//           </View>
//         </TouchableWithoutFeedback>
//       </Modal>
