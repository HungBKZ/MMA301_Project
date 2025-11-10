import { StyleSheet } from "react-native";

// 🎨 Bảng màu chủ đạo - Light Pastel Theme
export const colors = {
  primary: "#6B9BD1", // Pastel Blue
  primaryDark: "#5A89BF",
  primaryLight: "#E8F1FB", // Very light blue
  accent: "#FFB347", // Pastel Orange
  background: "#F8FAFC", // Off-white with slight blue tint
  surface: "#FFFFFF", // Pure white for cards
  error: "#FF8A80", // Pastel Red
  success: "#81C784", // Pastel Green
  warning: "#FFD54F", // Pastel Yellow
  textPrimary: "#2C3E50", // Dark blue-gray for text
  textSecondary: "#64748B", // Medium gray-blue
  border: "#E2E8F0", // Light gray-blue border
  
  // Trạng thái riêng cho Movie App - Pastel versions
  watched: "#81C784", // Pastel Green
  toWatch: "#90CAF9", // Pastel Blue
  favorite: "#FFD54F", // Pastel Gold/Yellow
  wishlist: "#F48FB1", // Pastel Pink
  purchased: "#81C784", // Pastel Green
};

// 🌐 Style dùng chung cho toàn app
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: "#6B9BD1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },

  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },

  buttonText: {
    color: "#FFFFFF",
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

  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },

  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
  },

  statusText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },

  banner: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
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
});
