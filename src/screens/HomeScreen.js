// src/screens/HomeScreen.js
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getAllMovies } from "../database/db";
import MovieCard from "../components/MovieCard";
import { colors, commonStyles } from "../styles/commonStyles";

/**
 * HomeScreen - Task 1: Movie List Screen
 * Màn hình chính hiển thị danh sách phim
 */
const HomeScreen = ({ navigation }) => {
  const [movies, setMovies] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  /** Load tất cả movies từ database */
  const loadMovies = () => {
    const allMovies = getAllMovies();
    setMovies(allMovies);
  };

  /** Reload khi màn hình được focus (luôn cập nhật khi quay lại) */
  useFocusEffect(
    useCallback(() => {
      loadMovies();
    }, [])
  );

  /** Kéo để làm mới */
  const onRefresh = () => {
    setRefreshing(true);
    loadMovies();
    setRefreshing(false);
  };

  /** Render từng Movie */
  const renderItem = ({ item }) => (
    <MovieCard
      movie={item}
      onPress={() => navigation.navigate("Detail", { movieId: item.id })}
    />
  );

  /** Khi danh sách trống */
  const renderEmptyList = () => (
    <View style={commonStyles.emptyContainer}>
      <Ionicons name="film-outline" size={80} color={colors.textSecondary} />
      <Text style={commonStyles.emptyText}>
        No movies yet{"\n"}
        Press "+" button to add your favorite movies
      </Text>
    </View>
  );

  /** Header của danh sách (banner) */
  const renderHeader = () => (
    <View style={styles.bannerContainer}>
      <View style={styles.banner}>
        <Ionicons name="film" size={60} color={colors.accent} />
      </View>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>Movie Manager</Text>
        <Text style={styles.bannerSubtitle}>Your Personal Film Library</Text>
        <Text style={styles.bannerCount}>
          {movies.length} {movies.length === 1 ? "movie" : "movies"}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={commonStyles.container}>
      <FlatList
        data={movies}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={movies.length === 0 && styles.emptyList}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddMovie")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: colors.surface,
    marginBottom: 16,
    padding: 24,
    alignItems: "center",
  },
  banner: {
    marginBottom: 16,
  },
  bannerContent: {
    alignItems: "center",
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: colors.accent,
    marginBottom: 8,
  },
  bannerCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyList: {
    flexGrow: 1,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});

export default HomeScreen;
