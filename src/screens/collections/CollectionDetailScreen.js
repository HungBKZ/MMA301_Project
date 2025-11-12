import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  getCollectionMovies,
  addMovieToCollection,
  removeMovieFromCollection,
} from "../../database/db";
import { colors, commonStyles } from "../../styles/commonStyles";

export default function CollectionDetailScreen({ route, navigation }) {
  const { collectionId, collectionName } = route.params;
  const [movies, setMovies] = useState([]);
  const [movieIdInput, setMovieIdInput] = useState("");

  const loadMovies = () => {
    const rows = getCollectionMovies(collectionId) || [];
    setMovies(rows);
  };

  useFocusEffect(
    useCallback(() => {
      loadMovies();
      navigation.setOptions({ title: collectionName || "Collection" });
    }, [collectionId, collectionName])
  );

  const handleAddMovie = () => {
    const id = parseInt(movieIdInput, 10);
    if (!id || isNaN(id)) {
      Alert.alert("Validation", "Please enter a valid numeric Movie ID.");
      return;
    }
    const ok = addMovieToCollection(collectionId, id);
    if (!ok) {
      Alert.alert("Error", "Cannot add movie to collection.");
      return;
    }
    setMovieIdInput("");
    loadMovies();
  };

  const handleRemove = (movieId) => {
    const ok = removeMovieFromCollection(collectionId, movieId);
    if (!ok) {
      Alert.alert("Error", "Cannot remove movie from collection.");
      return;
    }
    loadMovies();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.movieCard}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
    >
      {item.poster_uri ? (
        <Image source={{ uri: item.poster_uri }} style={styles.moviePoster} />
      ) : (
        <View style={[styles.moviePoster, styles.posterPlaceholder]}>
          <MaterialCommunityIcons name="movie-open-outline" size={28} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.movieInfo}>
        <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.movieMeta} numberOfLines={1}>
          {item.category || 'Unknown genre'} • {item.release_year || 'N/A'}
        </Text>
        <View style={styles.movieStatusRow}>
          <View style={[styles.movieBadge, getStatusBadgeStyle(item.status)]}>
            <Text style={styles.movieBadgeText}>{formatStatusLabel(item.status)}</Text>
          </View>
          {item.duration_minutes ? (
            <View style={styles.movieDuration}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.movieDurationText}>{item.duration_minutes} min</Text>
            </View>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        style={styles.movieRemoveBtn}
        onPress={() => handleRemove(item.id)}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const Header = () => (
    <View style={styles.addRow}>
      <TextInput
        value={movieIdInput}
        onChangeText={setMovieIdInput}
        placeholder="Enter Movie ID"
        placeholderTextColor={colors.textSecondary}
        keyboardType="numeric"
        style={styles.input}
      />
      <TouchableOpacity style={styles.addBtn} onPress={handleAddMovie}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.addBtnText}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={commonStyles.container}>
      <View style={styles.headerCard}>
        <View>
          <Text style={styles.headerTitle}>{collectionName}</Text>
          <Text style={styles.headerSubtitle}>
            {movies.length > 0
              ? `${movies.length} ${movies.length === 1 ? 'movie saved' : 'movies saved'} in this collection.`
              : 'Keep track of the movies you love in one place.'}
          </Text>
        </View>
        <MaterialCommunityIcons name="bookmark-multiple-outline" size={36} color={colors.primary} />
      </View>

      <View style={styles.addCard}>
        <Text style={styles.addTitle}>Add movie by ID</Text>
        <Text style={styles.addSubtitle}>Enter a movie ID from the catalog to include it here.</Text>
        <View style={styles.addRow}>
          <TextInput
            value={movieIdInput}
            onChangeText={setMovieIdInput}
            placeholder="Movie ID"
            placeholderTextColor={colors.textSecondary}
            keyboardType="numeric"
            style={styles.input}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddMovie}>
            <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={movies}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={
          movies.length === 0 ? styles.emptyList : styles.listContent
        }
        ListEmptyComponent={
          <View style={commonStyles.emptyContainer}>
            <MaterialCommunityIcons name="movie-open-check-outline" size={72} color={colors.textSecondary} />
            <Text style={commonStyles.emptyText}>No movies in this collection</Text>
          </View>
        }
      />
    </View>
  );
}

const getStatusBadgeStyle = (status) => {
  switch (status) {
    case 'SHOWING':
      return { backgroundColor: 'rgba(129, 199, 132, 0.25)', borderColor: '#81C784', color: '#2E7D32' };
    case 'COMING_SOON':
      return { backgroundColor: 'rgba(255, 183, 77, 0.25)', borderColor: '#FFB74D', color: '#EF6C00' };
    case 'ENDED':
      return { backgroundColor: 'rgba(158, 158, 158, 0.2)', borderColor: '#B0BEC5', color: '#546E7A' };
    default:
      return { backgroundColor: 'rgba(107, 155, 209, 0.2)', borderColor: colors.primary, color: colors.primary };
  }
};

const formatStatusLabel = (status) => {
  switch (status) {
    case 'SHOWING':
      return 'Now Showing';
    case 'COMING_SOON':
      return 'Coming Soon';
    case 'ENDED':
      return 'Ended';
    default:
      return status || 'Unknown';
  }
};

const styles = StyleSheet.create({
  headerCard: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    padding: 22,
    backgroundColor: colors.surface,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  addCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  addTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 140,
    gap: 12,
  },
  emptyList: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  movieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moviePoster: {
    width: 70,
    height: 100,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  movieInfo: {
    flex: 1,
    gap: 6,
  },
  movieTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  movieMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  movieStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  movieBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  movieBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  movieDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  movieDurationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  movieRemoveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


