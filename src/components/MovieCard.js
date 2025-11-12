import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../styles/commonStyles";
import { addToWishlist, getWishlistByAccount } from "../database/db";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../auth/AuthContext";

const MovieCard = ({ movie, onPress, onDelete }) => {
  const { user } = useAuth();

  const getStatusStyle = (status) => {
    switch (status) {
      case "SHOWING":
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          icon: "play-circle"
        };
      case "COMING_SOON":
        return {
          backgroundColor: colors.warning,
          borderColor: colors.warning,
          icon: "time"
        };
      case "ENDED":
        return {
          backgroundColor: colors.textSecondary,
          borderColor: colors.textSecondary,
          icon: "checkmark-circle"
        };
      default:
        return {
          backgroundColor: colors.textTertiary,
          borderColor: colors.textTertiary,
          icon: "help-circle"
        };
    }
  };

  const statusStyle = getStatusStyle(movie.status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardContent}>
        {/* POSTER CONTAINER */}
        <View style={styles.posterWrapper}>
          {movie.poster_uri ? (
            <Image
              source={{ uri: movie.poster_uri }}
              style={styles.poster}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.poster, styles.placeholderPoster]}>
              <Ionicons
                name="film-outline"
                size={48}
                color={colors.accent}
              />
            </View>
          )}

          {/* STATUS BADGE OVERLAY */}
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Ionicons
              name={statusStyle.icon}
              size={12}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.statusText}>
              {movie.status === "SHOWING" ? "SHOWING" : movie.status === "COMING_SOON" ? "COMING" : "ENDED"}
            </Text>
          </View>

          {/* RANK/POPULAR BADGE */}
          {movie.rating && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color={colors.accent} />
              <Text style={styles.ratingText}>{movie.rating}</Text>
            </View>
          )}
        </View>

        {/* MOVIE INFO */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {movie.title}
          </Text>

          <Text style={styles.category} numberOfLines={1}>
            {movie.category}
          </Text>

          <View style={styles.metaInfoRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={12} color={colors.accent} />
              <Text style={styles.metaText}>{movie.release_year}</Text>
            </View>

            <View style={styles.metaItem}>
              <Ionicons name="time" size={12} color={colors.accent} />
              <Text style={styles.metaText}>{movie.duration_minutes || 120} min</Text>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              <Text style={styles.viewButtonText}>Chi tiết</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* DELETE BUTTON */}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(movie.id)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="heart" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ==================== CARD ====================
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 10,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  cardContent: {
    flexDirection: "row",
    padding: 12,
    alignItems: 'stretch',
  },

  // ==================== POSTER ====================
  posterWrapper: {
    position: 'relative',
    marginRight: 12,
  },

  poster: {
    width: 90,
    height: 135,
    borderRadius: 10,
    backgroundColor: colors.backgroundAlt,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  placeholderPoster: {
    justifyContent: "center",
    alignItems: "center",
  },

  statusBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primary,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  ratingBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.accent,
  },

  ratingText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },

  // ==================== INFO ====================
  info: {
    flex: 1,
    justifyContent: "space-between",
  },

  title: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },

  category: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: "600",
  },

  metaInfoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 6,
  },

  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // ==================== ACTION BUTTONS ====================
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },

  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ==================== DELETE BUTTON ====================
  deleteButton: {
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    marginLeft: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
  },
});

export default MovieCard;