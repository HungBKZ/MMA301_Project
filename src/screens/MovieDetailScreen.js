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
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import {
  getMovieById,
  updateMovie,
  updateMovieStatus,
  deleteMovie,
  getCollectionsByUser,
  addMovieToCollection,
  createCollection,
  getWishlistByAccount,
  addToWishlist
} from "../database/db";
import { colors, commonStyles } from "../styles/commonStyles";
import { useAuth } from "../auth/AuthContext";
import { getAllShowtimes, getShowtimeById, getShowtimesByMovieId } from "../database/showtimeDB";

/**
 * MovieDetailScreen - Task 3: Movie Detail Screen
 * Màn hình chi tiết phim (xem, chỉnh sửa, đổi trạng thái, xóa)
 */
const MovieDetailScreen = ({ route, navigation }) => {
  const { movieId } = route.params;
  const [movie, setMovie] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const userId = user?.id;

  // Add-to-collection modal
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collections, setCollections] = useState([]);
  const [newCollectionName, setNewCollectionName] = useState("");

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

  const handleAddToWishlist = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }
    try {
      const existing = await getWishlistByAccount(user.id);
      const isMovieInWishlist = existing.some(item => item.movie_id === movie.id);

      if (isMovieInWishlist) {
        Alert.alert('Error', 'This movie is already in your wishlist.');
        return;
      }
      await addToWishlist(user.id, movie.id);
      Alert.alert('Success', 'Added to wishlist!');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Cannot add to wishlist.');
    }
  };
  /** Open Add-to-Collection modal */
  const openAddToCollection = () => {
    if (!userId) {
      Alert.alert("Login required", "Please login to use collections.");
      return;
    }
    try {
      const rows = getCollectionsByUser(userId) || [];
      setCollections(rows);
      setShowCollectionModal(true);
    } catch (e) {
      Alert.alert("Error", "Cannot load your collections.");
    }
  };

  const handleSelectCollection = (collectionId) => {
    const ok = addMovieToCollection(collectionId, movieId);
    if (!ok) {
      Alert.alert("Error", "Cannot add movie to collection.");
      return;
    }
    setShowCollectionModal(false);
    Alert.alert("Added", "Movie added to collection.");
  };

  const handleQuickCreateCollection = () => {
    const name = newCollectionName.trim();
    if (!name) {
      Alert.alert("Validation", "Please enter collection name.");
      return;
    }
    const r = createCollection(userId, name);
    if (!r.success) {
      Alert.alert("Error", "Cannot create collection (maybe duplicate name).");
      return;
    }
    setNewCollectionName("");
    // refresh list and keep modal open
    const rows = getCollectionsByUser(userId) || [];
    setCollections(rows);
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
    const statuses = ["COMING_SOON", "SHOWING", "ENDED"];
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

  /** Đi tới màn hình chọn suất chiếu (Booking) */
  const handleBooking = () => {
    try {
      navigation.navigate("Showtime", {
        movieId: movie.id,
        movieTitle: movie.title,
      });
    } catch (err) {
      Alert.alert("Error", "Cannot open showtime screen");
    }
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
                movie.status === "SHOWING"
                  ? "play-circle"
                  : movie.status === "ENDED"
                    ? "checkmark-circle"
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

        {/* Buy Ticket Section - Only show for Users and if movie is SHOWING */}
        {user?.role === 'User' && movie.status === 'SHOWING' && !isEditing && (
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <View style={styles.ticketIconBadge}>
                <Ionicons name="ticket" size={28} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ticketTitle}>🎬 Phim Đang Chiếu</Text>
                <Text style={styles.ticketSubtitle}>Đặt vé ngay để không bỏ lỡ!</Text>
              </View>
            </View>

            <View style={styles.ticketButtonsContainer}>
              <TouchableOpacity
                style={styles.bookButtonPrimary}
                onPress={handleBooking}
                activeOpacity={0.85}
              >
                <View style={styles.bookButtonContent}>
                  <Ionicons name="calendar" size={24} color="#FFFFFF" />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.bookButtonMainText}>Chọn Suất Chiếu</Text>
                    <Text style={styles.bookButtonSubText}>Đặt vé ngay</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.findCinemaButton}
                onPress={() => navigation.navigate('Maps')}
                activeOpacity={0.85}
              >
                <Ionicons name="location" size={22} color={colors.primary} />
                <Text style={styles.findCinemaText}>Tìm Rạp Gần Bạn</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
          <>
            {/* Admin Actions - Only show for Admin role */}
            {user?.role === 'admin' && (
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
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
                  onPress={() => navigation.navigate('ReviewList', { movieId: movie.id })}
                >
                  <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Review</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* User Actions - Show for all users */}
            {/* User Actions - Show only for non-admin users */}
            {user?.role !== 'admin' && (
              <View style={[styles.actionContainer, { marginTop: user?.role === 'admin' ? 12 : 0 }]}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
                  onPress={handleAddToWishlist}
                >
                  <Ionicons name="heart" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Wishlist</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.accent }]}
                  onPress={openAddToCollection}
                >
                  <Ionicons name="albums" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Add to{"\n"}Collection</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#9C27B0' }]}
                  onPress={() => navigation.navigate('ReviewList', { movieId: movie.id })}
                >
                  <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Review</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* Add to Collection Modal */}
      <Modal
        visible={showCollectionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCollectionModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add to Collection</Text>

            <View style={styles.quickCreateRow}>
              <TextInput
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                placeholder="New collection name"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />
              <TouchableOpacity style={styles.quickCreateBtn} onPress={handleQuickCreateCollection}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.quickCreateText}>Create</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={collections}
              keyExtractor={(it) => String(it.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.collectionRow}
                  onPress={() => handleSelectCollection(item.id)}
                >
                  <Ionicons name="albums-outline" size={20} color={colors.primary} />
                  <Text style={styles.collectionName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 12 }}>
                  No collections. Create one above.
                </Text>
              }
            />

            <View style={{ alignItems: "flex-end", marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.quickCreateBtn, { backgroundColor: colors.textSecondary }]}
                onPress={() => setShowCollectionModal(false)}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
                <Text style={styles.quickCreateText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 24,
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
  },
  quickCreateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  quickCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  quickCreateText: { color: "#FFFFFF", fontWeight: "600", marginLeft: 6 },
  collectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  collectionName: {
    marginLeft: 10,
    color: colors.textPrimary,
    fontWeight: "600",
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
  // ========== TICKET CARD STYLES ==========
  ticketCard: {
    backgroundColor: "rgba(76, 175, 80, 0.08)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  ticketIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  ticketTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 4,
  },
  ticketSubtitle: {
    fontSize: 13,
    color: "#4CAF50",
    fontWeight: "500",
  },
  ticketButtonsContainer: {
    gap: 10,
  },
  bookButtonPrimary: {
    backgroundColor: "#4CAF50",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
  },
  bookButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bookButtonMainText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  bookButtonSubText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  findCinemaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  findCinemaText: {
    color: "#4CAF50",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 10,
  },
  picker: {
    color: colors.textPrimary,
  },
});

export default MovieDetailScreen;