import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { searchMovies, filterMovies } from "../database/db";
import { colors, commonStyles } from "../styles/commonStyles";

/**
 * SearchScreen - Task 4: Search & Filter Movies
 * Tìm kiếm theo tiêu đề/thể loại hoặc lọc theo năm & trạng thái
 */
const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [results, setResults] = useState([]);
  const [searchMode, setSearchMode] = useState("search"); // 'search' or 'filter'

  const statuses = ["", "To Watch", "Watched", "Favorite"];

  /** Thực hiện tìm kiếm theo title hoặc category */
  const handleSearch = () => {
    if (searchQuery.trim()) {
      const searchResults = searchMovies(searchQuery);
      setResults(searchResults);
      setSearchMode("search");
    }
  };

  /** Lọc theo năm phát hành và/hoặc trạng thái */
  const handleFilter = () => {
    const year = filterYear ? parseInt(filterYear) : null;
    const status = filterStatus || null;
    if (year || status) {
      const filterResults = filterMovies(year, status);
      setResults(filterResults);
      setSearchMode("filter");
    }
  };

  /** Reset tất cả */
  const handleReset = () => {
    setSearchQuery("");
    setFilterYear("");
    setFilterStatus("");
    setResults([]);
    setSearchMode("search");
  };

  /** Render từng movie */
  const renderMovieItem = ({ item }) => {
    const statusColor =
      item.status === "Watched"
        ? colors.watched
        : item.status === "Favorite"
        ? colors.favorite
        : colors.toWatch;
    return (
      <TouchableOpacity
        style={styles.movieCard}
        onPress={() => navigation.navigate("Detail", { movieId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.movieCategory}>{item.category}</Text>
          <Text style={styles.movieYear}>Year: {item.release_year}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  /** Khi không có kết quả */
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={80} color={colors.textSecondary} />
      <Text style={styles.emptyText}>
        {searchMode === "search"
          ? "No movies found\nTry different keywords"
          : "No movies match your filters\nTry different criteria"}
      </Text>
    </View>
  );

  return (
    <View style={commonStyles.container}>
      <ScrollView>
        {/* --- Search Section --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search by Title or Category</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter movie title or category..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Filter Section --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filter Movies</Text>

          {/* Year Filter */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Release Year</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2010"
              placeholderTextColor={colors.textSecondary}
              value={filterYear}
              onChangeText={setFilterYear}
              keyboardType="numeric"
            />
          </View>

          {/* Status Filter */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterStatus}
                onValueChange={(itemValue) => setFilterStatus(itemValue)}
                style={styles.picker}
                dropdownIconColor={colors.textPrimary}
              >
                <Picker.Item label="All Statuses" value="" />
                {statuses.slice(1).map((status) => (
                  <Picker.Item key={status} label={status} value={status} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Filter Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.filterButton]}
              onPress={handleFilter}
              activeOpacity={0.8}
            >
              <Ionicons name="funnel" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Apply Filter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Results Header --- */}
        {results.length > 0 && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              Found {results.length} {results.length === 1 ? "movie" : "movies"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* --- Results List --- */}
      <FlatList
        data={results}
        renderItem={renderMovieItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          (searchQuery || filterYear || filterStatus) && renderEmptyList()
        }
        style={styles.resultsList}
        contentContainerStyle={
          results.length === 0 && styles.emptyListContainer
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  pickerContainer: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: { height: 50, color: colors.textPrimary },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  filterButton: { backgroundColor: colors.primary },
  resetButton: { backgroundColor: colors.textSecondary },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  resultsHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  resultsList: { flex: 1 },
  movieCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  movieInfo: { flex: 1, marginRight: 12 },
  movieTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  movieCategory: { fontSize: 14, color: colors.accent, marginBottom: 2 },
  movieYear: { fontSize: 14, color: colors.textSecondary },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
  },
  emptyListContainer: { flexGrow: 1 },
});

export default SearchScreen;
