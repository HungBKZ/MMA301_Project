import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import {
  getMovieById,
  updateMovie,
  updateMovieStatus,
  deleteMovie,
} from "../database/db";
import { colors, commonStyles } from "../styles/commonStyles";

/**
 * MovieDetailScreen - Task 3: Movie Detail Screen
 * Màn hình chi tiết phim (xem, chỉnh sửa, đổi trạng thái, xóa)
 */
const MovieDetailScreen = ({ route, navigation }) => {
  const { movieId } = route.params;
  const [movie, setMovie] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Trạng thái chỉnh sửa
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editDuration, setEditDuration] = useState("120");
  const [editStatus, setEditStatus] = useState("");
  const [editPosterUri, setEditPosterUri] = useState(null);

  const categories = [
    "Action",
    "Comedy",
    "Drama",
    "Horror",
    "Science Fiction",
    "Romance",
    "Thriller",
    "Animation",
    "Documentary",
    "Fantasy",
  ];

  /** Load chi tiết phim */
  useEffect(() => {
    loadMovieDetails();
  }, [movieId]);

  const loadMovieDetails = () => {
    const movieData = getMovieById(movieId);
    if (movieData) {
      setMovie(movieData);
      setEditTitle(movieData.title);
      setEditCategory(movieData.category);
      setEditYear(movieData.release_year.toString());
      setEditDuration((movieData.duration_minutes || 120).toString());
      setEditStatus(movieData.status);
      setEditPosterUri(movieData.poster_uri);
    } else {
      Alert.alert("Error", "Movie not found", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    }
  };

  /** Chọn ảnh poster mới */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Please allow photo access!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.8,
    });
    if (!result.canceled) setEditPosterUri(result.assets[0].uri);
  };

  /** Thay đổi status (xoay vòng 3 trạng thái) */
  const handleChangeStatus = () => {
    const statuses = ["To Watch", "Watched", "Favorite"];
    const currentIndex = statuses.indexOf(movie.status);
    const nextIndex = (currentIndex + 1) % statuses.length;
    const newStatus = statuses[nextIndex];
    const success = updateMovieStatus(movieId, newStatus);
    if (success) {
      setMovie({ ...movie, status: newStatus });
      setEditStatus(newStatus);
      Alert.alert("Success", `Status changed to "${newStatus}"`);
    } else {
      Alert.alert("Error", "Cannot update status");
    }
  };

  /** Lưu chỉnh sửa */
  const handleSaveChanges = () => {
    if (!editTitle.trim()) {
      Alert.alert("Error", "Title cannot be empty");
      return;
    }
    const year = parseInt(editYear);
    if (isNaN(year) || year < 1888 || year > new Date().getFullYear() + 5) {
      Alert.alert("Error", "Invalid release year");
      return;
    }
    const duration = parseInt(editDuration) || 120;
    const success = updateMovie(
      movieId,
      editTitle.trim(),
      editCategory,
      year,
      duration,
      editStatus,
      editPosterUri
    );
    if (success) {
      setMovie({
        ...movie,
        title: editTitle.trim(),
        category: editCategory,
        release_year: year,
        duration_minutes: duration,
        status: editStatus,
        poster_uri: editPosterUri,
      });
      setIsEditing(false);
      Alert.alert("Success", "Movie updated successfully");
    } else {
      Alert.alert("Error", "Cannot update movie");
    }
  };

  /** Xóa movie */
  const handleDelete = () => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${movie.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const success = deleteMovie(movieId);
            if (success) {
              Alert.alert("Deleted", "Movie removed successfully", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert("Error", "Cannot delete movie");
            }
          },
        },
      ]
    );
  };

  // Loading
  if (!movie) {
    return (
      <View style={[commonStyles.container, styles.loadingContainer]}>
        <Text style={commonStyles.emptyText}>Loading...</Text>
      </View>
    );
  }

  const statusColor =
    movie.status === "SHOWING"
      ? "#4CAF50" // Green for showing
      : movie.status === "ENDED"
      ? "#9E9E9E" // Gray for ended
      : "#2196F3"; // Blue for coming soon

  return (
    <ScrollView style={commonStyles.container}>
      <View style={styles.container}>
        {/* Poster */}
        <View style={styles.headerCard}>
          {isEditing ? (
            <TouchableOpacity
              style={styles.posterContainer}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              {editPosterUri ? (
                <>
                  <Image
                    source={{ uri: editPosterUri }}
                    style={styles.poster}
                  />
                  <View style={styles.editOverlay}>
                    <Ionicons name="camera" size={32} color="#FFFFFF" />
                  </View>
                </>
              ) : (
                <View style={styles.posterPlaceholder}>
                  <Ionicons
                    name="image-outline"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.posterText}>Tap to add</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.posterContainer}>
              {movie.poster_uri ? (
                <Image
                  source={{ uri: movie.poster_uri }}
                  style={styles.poster}
                />
              ) : (
                <View style={styles.posterPlaceholder}>
                  <Ionicons
                    name="film-outline"
                    size={48}
                    color={colors.textSecondary}
                  />
                </View>
              )}
            </View>
          )}

          {isEditing ? (
            <TextInput
              style={styles.titleInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Movie Title"
              placeholderTextColor={colors.textSecondary}
            />
          ) : (
            <Text style={styles.movieTitle}>{movie.title}</Text>
          )}

          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Ionicons
              name={
                movie.status === "Watched"
                  ? "checkmark-circle"
                  : movie.status === "Favorite"
                  ? "heart"
                  : "time"
              }
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.statusText}>{movie.status}</Text>
          </View>
        </View>

        {/* Thông tin chi tiết */}
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Movie Information</Text>

          {/* Category */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="pricetags" size={20} color={colors.accent} />
              <Text style={styles.labelText}>Category</Text>
            </View>
            {isEditing ? (
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={editCategory}
                  onValueChange={setEditCategory}
                  style={styles.picker}
                  dropdownIconColor={colors.textPrimary}
                >
                  {categories.map((cat) => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
            ) : (
              <Text style={styles.valueText}>{movie.category}</Text>
            )}
          </View>

          {/* Release Year */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons
                name="calendar"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.labelText}>Release Year</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.yearInput}
                value={editYear}
                onChangeText={setEditYear}
                keyboardType="numeric"
                maxLength={4}
              />
            ) : (
              <Text style={styles.valueText}>{movie.release_year}</Text>
            )}
          </View>

          {/* Duration */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons
                name="time"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.labelText}>Duration</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.yearInput}
                value={editDuration}
                onChangeText={setEditDuration}
                keyboardType="numeric"
                maxLength={3}
                placeholder="120"
              />
            ) : (
              <Text style={styles.valueText}>{movie.duration_minutes || 120} mins</Text>
            )}
          </View>

          {/* Status */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabel}>
              <Ionicons name="flag" size={20} color={statusColor} />
              <Text style={styles.labelText}>Status</Text>
            </View>
            {isEditing ? (
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={editStatus}
                  onValueChange={setEditStatus}
                  style={styles.picker}
                  dropdownIconColor={colors.textPrimary}
                >
                  <Picker.Item label="Coming Soon" value="COMING_SOON" />
                  <Picker.Item label="Showing" value="SHOWING" />
                  <Picker.Item label="Ended" value="ENDED" />
                </Picker>
              </View>
            ) : (
              <Text
                style={[
                  styles.valueText,
                  { color: statusColor, fontWeight: "bold" },
                ]}
              >
                {movie.status}
              </Text>
            )}
          </View>
        </View>

        {/* Nút hành động */}
        {isEditing ? (
          <View style={styles.editActionContainer}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.success }]}
              onPress={handleSaveChanges}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.editButton,
                { backgroundColor: colors.textSecondary },
              ]}
              onPress={() => {
                setIsEditing(false);
                loadMovieDetails();
              }}
            >
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning }]}
              onPress={handleChangeStatus}
            >
              <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Change{"\n"}Status</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  loadingContainer: { justifyContent: "center", alignItems: "center" },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    elevation: 3,
  },
  posterContainer: {
    width: 200,
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  poster: { width: "100%", height: "100%", resizeMode: "cover" },
  posterPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  posterText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  editOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  movieTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
  },
  statusBadge: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statusText: { color: "#fff", marginLeft: 4, fontWeight: "600" },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { flexDirection: "row", alignItems: "center" },
  labelText: { fontSize: 16, color: colors.textSecondary, marginLeft: 8 },
  valueText: { fontSize: 16, color: colors.textPrimary, fontWeight: "500" },
  yearInput: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    minWidth: 80,
    textAlign: "right",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    minWidth: 150,
    overflow: "hidden",
  },
  actionContainer: { flexDirection: "row", justifyContent: "space-between" },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
  },
  editActionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default MovieDetailScreen;
