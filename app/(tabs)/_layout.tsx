import { Colors, SizesRaw, SizesScaled } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import {
  BooksIcon,
  HouseIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
} from "phosphor-react-native";
import React from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? "dark";
  const activeColors = Colors[scheme];

  return (
    <Tabs
      screenOptions={{
        // no top header
        headerShown: false,

        // use linear gradient for bottom tabs
        tabBarBackground: () => (
          <LinearGradient
            colors={[
              "rgba(33, 33, 36, 0)",
              "rgba(33, 33, 36, 0.95)",
              "rgba(101, 126, 212, 1)",
            ]}
            locations={[0, 0.15, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ),

        // bottom tabs container
        tabBarStyle: {
          backgroundColor: "transparent",
          position: "absolute",
          borderTopWidth: 0,
          height: SizesRaw.tabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
          width: "100%",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        },

        tabBarItemStyle: {
          flex: 0,
          marginHorizontal: SizesScaled.iconLg,
          justifyContent: "center",
          alignItems: "center",
        },

        tabBarActiveTintColor: activeColors.tertiary,
        tabBarInactiveTintColor: activeColors.text,

        // no label underneath icons
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <HouseIcon
              color={color}
              weight={focused ? "fill" : "regular"}
              size={SizesRaw.iconLg}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: ({ color, focused }) => (
            <MagnifyingGlassIcon
              color={color}
              weight={focused ? "fill" : "bold"}
              size={SizesRaw.iconLg}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused }) => (
            <BooksIcon
              color={color}
              weight={focused ? "fill" : "regular"}
              size={SizesRaw.iconLg}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color, focused }) => (
            <PlusCircleIcon
              color={color}
              weight={focused ? "fill" : "regular"}
              size={SizesRaw.iconLg}
            />
          ),
        }}
      />
    </Tabs>
  );
}
