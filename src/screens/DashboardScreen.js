// src/screens/DashboardScreen.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import {
  getMovieStats,
  getMovieCountByCategory,
  getAllMovies,
} from "../database/db";
import { colors, commonStyles } from "../styles/commonStyles";

const screenWidth = Dimensions.get("window").width;

/**
 * DashboardScreen - Task 9: Data Visualization Dashboard
 * Trực quan hóa dữ liệu phim bằng biểu đồ
 */
const DashboardScreen = () => {
  const [stats, setStats] = useState({
    total: 0,
    watched: 0,
    toWatch: 0,
    favorite: 0,
  });
  const [categoryData, setCategoryData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  /** Load dữ liệu cho dashboard */
  const loadDashboardData = () => {
    const movieStats = getMovieStats();
    setStats(movieStats);
    const categories = getMovieCountByCategory();
    setCategoryData(categories);
  };

  /** Reload khi màn hình được focus */
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  /** Xử lý pull-to-refresh */
  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
    setRefreshing(false);
  };

  /** Chuẩn bị dữ liệu cho Pie Chart (Status Distribution) */
  const getPieChartData = () => {
    return [
      {
        name: "Watched",
        population: stats.watched,
        color: colors.watched,
        legendFontColor: colors.textPrimary,
        legendFontSize: 14,
      },
      {
        name: "To Watch",
        population: stats.toWatch,
        color: colors.toWatch,
        legendFontColor: colors.textPrimary,
        legendFontSize: 14,
      },
      {
        name: "Favorite",
        population: stats.favorite,
        color: colors.favorite,
        legendFontColor: colors.textPrimary,
        legendFontSize: 14,
      },
    ].filter((item) => item.population > 0);
  };

  /** Chuẩn bị dữ liệu cho Bar Chart (Category Distribution) */
  const getBarChartData = () => {
    if (categoryData.length === 0) {
      return {
        labels: ["No Data"],
        datasets: [{ data: [0] }],
      };
    }
    const topCategories = categoryData.slice(0, 5);
    return {
      labels: topCategories.map((item) => {
        const name = item.category;
        return name.length > 10 ? name.substring(0, 8) + "..." : name;
      }),
      datasets: [
        {
          data: topCategories.map((item) => item.total_movies),
        },
      ],
    };
  };

  /** Chart config */
  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(229, 9, 20, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: colors.accent,
    },
  };

  return (
    <ScrollView
      style={commonStyles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Ionicons name="analytics" size={48} color={colors.accent} />
          <Text style={styles.headerTitle}>Movies Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Visual insights into your movie collection
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Ionicons name="film" size={32} color={colors.primary} />
            <Text style={styles.summaryValue}>{stats.total}</Text>
            <Text style={styles.summaryLabel}>Total Movies</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons
              name="checkmark-circle"
              size={32}
              color={colors.watched}
            />
            <Text style={styles.summaryValue}>{stats.watched}</Text>
            <Text style={styles.summaryLabel}>Watched</Text>
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Ionicons name="time" size={32} color={colors.toWatch} />
            <Text style={styles.summaryValue}>{stats.toWatch}</Text>
            <Text style={styles.summaryLabel}>To Watch</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="heart" size={32} color={colors.favorite} />
            <Text style={styles.summaryValue}>{stats.favorite}</Text>
            <Text style={styles.summaryLabel}>Favorites</Text>
          </View>
        </View>

        {/* Status Distribution - Pie Chart */}
        {stats.total > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Status Distribution</Text>
            <PieChart
              data={getPieChartData()}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Category Distribution - Bar Chart */}
        {categoryData.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Movies by Category (Top 5)</Text>
            <BarChart
              data={getBarChartData()}
              width={screenWidth - 64}
              height={220}
              chartConfig={chartConfig}
              verticalLabelRotation={0}
              fromZero
              showValuesOnTopOfBars
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
          </View>
        )}

        {/* Category Details */}
        {categoryData.length > 0 && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>All Categories</Text>
            {categoryData.map((item, index) => {
              const percentage =
                stats.total > 0
                  ? ((item.total_movies / stats.total) * 100).toFixed(1)
                  : 0;
              return (
                <View key={index} style={styles.categoryRow}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{item.category}</Text>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${percentage}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.categoryStats}>
                    <Text style={styles.categoryCount}>
                      {item.total_movies}
                    </Text>
                    <Text style={styles.categoryPercentage}>{percentage}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {stats.total === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="bar-chart-outline"
              size={80}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              No data to display{"\n"}Add some movies to see visualizations
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  summaryContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 8,
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
  categoryStats: {
    alignItems: "flex-end",
  },
  categoryCount: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  categoryPercentage: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 24,
  },
});

export default DashboardScreen;
