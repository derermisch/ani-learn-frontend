import { ServerErrorState } from "@/components/ServerErrorState"; // Import the new component
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Stats } from "@/constants/types";
import { getStats, registerUser } from "@/services/api";
import { Link } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setIsError(false);
    try {
      // 1. Try to reach server
      const data = await getStats();
      setStats(data);

      // 2. If successful, register user silently
      registerUser("mobile_user").catch(() => {});
    } catch (e) {
      // 3. If failed, show Error Screen
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    loadData();
  }, [loadData]);

  const StatBox = ({ label, value, icon, color }: any) => (
    <View style={[styles.statBox, { borderColor: color }]}>
      <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
        <IconSymbol name={icon} size={20} color={color} />
      </View>
      <View>
        <ThemedText style={styles.statValue}>{value}</ThemedText>
        <ThemedText style={styles.statLabel}>{label}</ThemedText>
      </View>
    </View>
  );

  // --- STATE: ERROR ---
  if (isError && !stats) {
    return (
      <ThemedView style={styles.container}>
        <ServerErrorState onRetry={loadData} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadData}
            tintColor="#A071FF"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={{ fontSize: 28 }}>
              SubLearner
            </ThemedText>
            <ThemedText style={styles.subtitle}>Immersion Dashboard</ThemedText>
          </View>
          <View style={styles.avatar}>
            <IconSymbol name="person.fill" size={24} color="#FFF" />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Show a tiny spinner inside the box if refreshing, or the value */}
          <StatBox
            label="Total Decks"
            value={stats?.decks || "-"}
            icon="doc.text.fill"
            color="#A071FF"
          />
          <StatBox
            label="Cards Generated"
            value={stats?.cards || "-"}
            icon="sparkles"
            color="#2EC4B6"
          />
          <StatBox
            label="Shows"
            value={stats?.shows || "-"}
            icon="tv.fill"
            color="#FF9F1C"
          />
          <StatBox
            label="Users"
            value={stats?.users || "-"}
            icon="person.2.fill"
            color="#E71D36"
          />
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          <Link href="/browse-decks" asChild>
            <TouchableOpacity style={styles.bigButton}>
              <View style={styles.btnContent}>
                <IconSymbol name="magnifyingglass" size={32} color="#FFF" />
                <View>
                  <ThemedText type="subtitle">Browse Library</ThemedText>
                  <ThemedText style={styles.btnDesc}>
                    Study existing decks
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={24} color="#666" />
            </TouchableOpacity>
          </Link>

          <Link href="/create-deck" asChild>
            <TouchableOpacity style={[styles.bigButton, { marginTop: 15 }]}>
              <View style={styles.btnContent}>
                <IconSymbol name="plus.circle.fill" size={32} color="#A071FF" />
                <View>
                  <ThemedText type="subtitle">Import New File</ThemedText>
                  <ThemedText style={styles.btnDesc}>
                    Process .srt with AI
                  </ThemedText>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={24} color="#666" />
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 60, minHeight: "100%" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  subtitle: { color: "#888", fontSize: 16 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    marginBottom: 40,
  },
  statBox: {
    width: "47%",
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 16,
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: { fontWeight: "bold", fontSize: 18 },
  statLabel: { color: "#888", fontSize: 12 },

  actionContainer: { marginTop: 10 },
  bigButton: {
    backgroundColor: "#1E1E1E",
    padding: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#333",
  },
  btnContent: { flexDirection: "row", alignItems: "center", gap: 15 },
  btnDesc: { color: "#888", fontSize: 13 },
});
