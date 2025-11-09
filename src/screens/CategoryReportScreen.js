// src/screens/CategoryReportScreen.js
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
import { getMovieCountByCategory } from "../database/db";
import { colors, commonStyles } from "../styles/commonStyles";

/**
 * CategoryReportScreen - Task 5: Report – Movie Count by Category
 * Thống kê tổng số lượng phim trong từng thể loại
 */
const CategoryReportScreen = () => {
  const [categoryData, setCategoryData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [totalMovies, setTotalMovies] = useState(0);

  /** Load dữ liệu thống kê */
  const loadCategoryData = () => {
    const data = getMovieCountByCategory();
    setCategoryData(data);
    const total = data.reduce((sum, item) => sum + item.total_movies, 0);
    setTotalMovies(total);
  };

  /** Reload khi màn hình được focus */
  useFocusEffect(
    useCallback(() => {
      loadCategoryData();
    }, [])
  );

  /** Xử lý pull-to-refresh */
  const onRefresh = () => {
    setRefreshing(true);
    loadCategoryData();
    setRefreshing(false);
  };

  /** Render từng category item */
  const renderCategoryItem = ({ item, index }) => {
    const percentage =
      totalMovies > 0
        ? ((item.total_movies / totalMovies) * 100).toFixed(1)
        : 0;

    // Chọn icon theo category
    const getIconName = (category) => {
      const lower = category.toLowerCase();
      if (lower.includes("action")) return "flame";
      if (lower.includes("comedy")) return "happy";
      if (lower.includes("drama")) return "sad";
      if (lower.includes("horror")) return "skull";
      if (lower.includes("sci")) return "rocket";
      if (lower.includes("romance")) return "heart";
      return "film";
    };

    return (
      <View style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryIcon}>
            <Ionicons
              name={getIconName(item.category)}
              size={32}
              color={colors.accent}
            />
          </View>

          <View style={styles.categoryInfo}>
            <Text style={styles.categoryName}>{item.category}</Text>
            <Text style={styles.categoryCount}>
              {item.total_movies} {item.total_movies === 1 ? "movie" : "movies"}
            </Text>
          </View>

          <View style={styles.categoryPercentage}>
            <Text style={styles.percentageText}>{percentage}%</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${percentage}%` }]} />
        </View>

        {/* Rank Badge */}
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{index + 1}</Text>
        </View>
      </View>
    );
  };

  /** Khi không có dữ liệu */
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="bar-chart-outline"
        size={80}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyText}>
        No movie data available{"\n"}Add some movies to see statistics
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
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Ionicons name="stats-chart" size={48} color={colors.accent} />
          </View>
          <Text style={styles.headerTitle}>Movie Count by Category</Text>
          <Text style={styles.headerSubtitle}>
            Total: {totalMovies} {totalMovies === 1 ? "movie" : "movies"}
          </Text>
          <Text style={styles.headerSubtitle}>
            Categories: {categoryData.length}
          </Text>
        </View>

        {/* Category List */}
        <View style={styles.listContainer}>
          {categoryData.length > 0 ? (
            <FlatList
              data={categoryData}
              renderItem={renderCategoryItem}
              keyExtractor={(item, index) => index.toString()}
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
  headerIcon: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  listContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  categoryCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    position: "relative",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  categoryPercentage: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  rankBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
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
  },
});

export default CategoryReportScreen;
