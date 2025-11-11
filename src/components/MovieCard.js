import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/commonStyles";
import { addToWishlist, getWishlistByAccount } from "../database/db";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../auth/AuthContext";

const MovieCard = ({ movie, onPress, onDelete }) => {
  const { user } = useAuth();

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
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        {/* Poster Image */}
        {movie.poster_uri ? (
          <Image source={{ uri: movie.poster_uri }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.placeholderPoster]}>
            <Ionicons name="film-outline" size={40} color={colors.textSecondary} />
          </View>
        )}

        {/* Movie Info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {movie.title}
          </Text>
          <Text style={styles.category}>{movie.category}</Text>
          <Text style={styles.year}>Year: {movie.release_year}</Text>
          <View style={[styles.statusBadge, getStatusStyle(movie.status)]}>
            <Text style={styles.statusText}>{movie.status}</Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleAddToWishlist}>
            <Ionicons name="heart-outline" size={18} color={colors.primary} />
          </TouchableOpacity>

        </View>

        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(movie.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={24} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const getStatusStyle = (status) => {
  switch (status) {
    case "Watched":
      return { backgroundColor: "#4CAF50" };
    case "Watching":
      return { backgroundColor: "#2196F3" };
    case "Favorite":
      return { backgroundColor: "#FF9800" };
    default:
      return { backgroundColor: "#9E9E9E" };
  }
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    flexDirection: "row",
    padding: 12,
  },
  poster: {
    width: 80,
    height: 120,
    borderRadius: 8,
    backgroundColor: colors.border,
  },
  placeholderPoster: {
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  year: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  button: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -15 }],
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  }
});

export default MovieCard;
