import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
    <View style={styles.movieCard}>
      <View style={styles.poster}>
        <Ionicons name="film-outline" size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.meta}>{item.category} • {item.release_year}</Text>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item.id)}>
        <Ionicons name="close-circle-outline" size={22} color={colors.danger || "#E53935"} />
      </TouchableOpacity>
    </View>
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
      <Header />
      <FlatList
        data={movies}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={commonStyles.emptyContainer}>
            <Ionicons name="film-outline" size={72} color={colors.textSecondary} />
            <Text style={commonStyles.emptyText}>No movies in this collection</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    marginRight: 8,
  },
  addBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  addBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 6,
  },
  movieCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  poster: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "22",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  meta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  removeBtn: {
    padding: 6,
    marginLeft: 8,
  },
});


