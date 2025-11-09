// src/screens/FavoriteYearsReportScreen.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  getAbnormallyHighFavoriteYears,
  getMoviesByStatus,
} from "../database/db";
import { colors, commonStyles } from "../styles/commonStyles";

/**
 * FavoriteYearsReportScreen - Task 6
 * Báo cáo các năm có số lượng phim yêu thích cao bất thường (> trung bình +30%)
 */
const FavoriteYearsReportScreen = () => {
  const [abnormalYears, setAbnormalYears] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalFavorites, setTotalFavorites] = useState(0);
  const [averageFavorites, setAverageFavorites] = useState(0);

  /** Load dữ liệu báo cáo */
  const loadReportData = () => {
    const data = getAbnormallyHighFavoriteYears();
    setAbnormalYears(data);

    // Tính tổng và trung bình
    const allFavorites = getMoviesByStatus("Favorite");
    setTotalFavorites(allFavorites.length);

    if (data.length > 0) {
      const total = data.reduce((sum, item) => sum + item.favorite_count, 0);
      const avg = total / data.length;
      setAverageFavorites(avg.toFixed(1));
    } else {
      setAverageFavorites(0);
    }
  };

  /** Reload khi màn hình focus */
  useFocusEffect(
    useCallback(() => {
      loadReportData();
    }, [])
  );

  /** Kéo để reload */
  const onRefresh = () => {
    setRefreshing(true);
    loadReportData();
    setRefreshing(false);
  };

  /** Render từng dòng năm */
  const renderYearItem = ({ item, index }) => {
    const percentAboveAverage =
      averageFavorites > 0
        ? (
            ((item.favorite_count - averageFavorites) / averageFavorites) *
            100
          ).toFixed(0)
        : 0;

    return (
      <View style={styles.yearCard}>
        {/* Year Badge */}
        <View style={styles.yearBadge}>
          <Ionicons name="calendar" size={32} color={colors.accent} />
          <Text style={styles.yearText}>{item.release_year}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <Ionicons name="heart" size={20} color={colors.favorite} />
            <Text style={styles.statLabel}>Favorite Movies:</Text>
            <Text style={styles.statValue}>{item.favorite_count}</Text>
          </View>

          <View style={styles.statRow}>
            <Ionicons name="trending-up" size={20} color={colors.success} />
            <Text style={styles.statLabel}>Above Average:</Text>
            <Text style={styles.statValue}>+{percentAboveAverage}%</Text>
          </View>
        </View>

        {/* Rank Badge */}
        <View style={styles.rankBadge}>
          <Ionicons
            name={index === 0 ? "trophy" : "medal"}
            size={24}
            color={index === 0 ? colors.accent : colors.textSecondary}
          />
        </View>
      </View>
    );
  };

  /** Khi không có dữ liệu */
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="analytics-outline"
        size={80}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyText}>
        No abnormal years detected{"\n"}
        {totalFavorites === 0
          ? "Mark some movies as Favorite to see trends"
          : "Favorite movies are evenly distributed across years"}
      </Text>
    </View>
  );

  return (
    <View style={commonStyles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Ionicons name="trending-up" size={48} color={colors.favorite} />
          </View>
          <Text style={styles.headerTitle}>Abnormally High Favorite Years</Text>
          <Text style={styles.headerDescription}>
            Years with favorite movie count exceeding average by 30% or more
          </Text>

          {/* Summary Stats */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalFavorites}</Text>
              <Text style={styles.summaryLabel}>Total Favorites</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{abnormalYears.length}</Text>
              <Text style={styles.summaryLabel}>Peak Years</Text>
            </View>
          </View>
        </View>

        {/* Explanation */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.accent} />
          <Text style={styles.infoText}>
            These are your “golden years” – the release years where you have
            unusually high favorite movies, showing your peak movie preferences.
          </Text>
        </View>

        {/* Years List */}
        <View style={styles.listContainer}>
          {abnormalYears.length > 0 ? (
            <FlatList
              data={abnormalYears}
              renderItem={renderYearItem}
              keyExtractor={(item) => item.release_year.toString()}
              scrollEnabled={false}
            />
          ) : (
            renderEmptyList()
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerIcon: { marginBottom: 12 },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  headerDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  summaryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 32, fontWeight: "bold", color: colors.accent },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.border },
  infoCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
    lineHeight: 20,
  },
  listContainer: { marginTop: 8, marginBottom: 16 },
  yearCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    position: "relative",
  },
  yearBadge: { alignItems: "center", marginBottom: 16 },
  yearText: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginTop: 8,
  },
  statsContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
  },
  statRow: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  statLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  statValue: { fontSize: 16, fontWeight: "bold", color: colors.textPrimary },
  rankBadge: { position: "absolute", top: 16, right: 16 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
  },
});

export default FavoriteYearsReportScreen;
