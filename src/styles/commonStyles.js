import { StyleSheet } from "react-native";

// 🎬 Bảng màu CGV - Dark Premium Cinema Theme
export const colors = {
  // 🔴 Màu chính - CGV Red (iconic color)
  primary: "#D32F2F", // CGV Red
  primaryDark: "#B71C1C", // Darker red for pressed state
  primaryLight: "#FFEBEE", // Very light red

  // 🟡 Màu phụ - Gold/Yellow (CGV secondary)
  accent: "#FFB81C", // CGV Gold/Yellow
  accentDark: "#FFA000", // Darker gold
  accentLight: "#FFF8E1", // Very light gold

  // ⚫ Background - Dark Premium
  background: "#1A1A1A", // Very dark background
  backgroundAlt: "#2C2C2C", // Alternative darker background
  surface: "#262626", // Card/Surface background (slightly lighter than background)

  // ⚪ Text Colors
  textPrimary: "#FFFFFF", // White text for dark background
  textSecondary: "#E0E0E0", // Light gray text
  textTertiary: "#A0A0A0", // Medium gray text
  textDisabled: "#616161", // Disabled text

  // 🌈 Status Colors - Adjusted for dark theme
  error: "#EF5350", // Light red for dark background
  success: "#66BB6A", // Light green
  warning: "#FFA726", // Light orange
  info: "#42A5F5", // Light blue

  // 🎞️ Movie Status Colors (CGV themed)
  watched: "#66BB6A", // Green - watched
  toWatch: "#42A5F5", // Blue - to watch
  favorite: "#FFB81C", // Gold - favorite
  wishlist: "#EF5350", // Red - wishlist
  purchased: "#66BB6A", // Green - purchased

  // 🔗 UI Elements
  border: "#424242", // Dark gray border
  borderLight: "#616161", // Lighter border
  divider: "#37474F", // Divider color
  shadow: "#000000", // Shadow color

  // 🔮 Special
  overlay: "rgba(0, 0, 0, 0.7)", // Dark overlay
  ripple: "rgba(255, 255, 255, 0.1)", // Ripple effect color
};

// 🌐 Style dùng chung cho toàn app (CGV themed)
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  containerAlt: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardHighlight: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
  },

  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  buttonOutline: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },

  buttonAccent: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  buttonDisabled: {
    backgroundColor: colors.textTertiary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },

  buttonTextAccent: {
    color: "#000000", // Black text on gold background
    fontSize: 16,
    fontWeight: "600",
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: colors.textPrimary,
  },

  inputFocused: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: colors.textPrimary,
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 4,
  },

  text: {
    fontSize: 14,
    color: colors.textPrimary,
  },

  textSmall: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
  },

  statusBadgeWatched: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.success,
  },

  statusBadgeToWatch: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.info,
  },

  statusBadgeFavorite: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
  },

  statusBadgeWishlist: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
  },

  statusText: {
    color: "#000000", // Black text on colored backgrounds for better contrast
    fontSize: 12,
    fontWeight: "600",
  },

  banner: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
    backgroundColor: colors.backgroundAlt,
  },

  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },

  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
  },

  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 16,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  spaceBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.backgroundAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  chip: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },

  chipActive: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },

  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  chipTextActive: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  shadow: {
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  shadowLarge: {
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});

// 🎬 Export utilities
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case "watched":
      return colors.success;
    case "towatch":
    case "to_watch":
      return colors.info;
    case "favorite":
      return colors.accent;
    case "wishlist":
      return colors.primary;
    case "purchased":
      return colors.success;
    default:
      return colors.textSecondary;
  }
};

export const getStatusBadgeStyle = (status: string) => {
  const backgroundColor = getStatusColor(status);
  return {
    ...commonStyles.statusBadge,
    backgroundColor,
  };
};