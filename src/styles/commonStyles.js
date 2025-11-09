import { StyleSheet } from "react-native";

// 🎨 Bảng màu chủ đạo
export const colors = {
  primary: "#E50914", // Netflix Red
  primaryDark: "#B20710",
  accent: "#FFD700", // Gold
  background: "#141414",
  surface: "#1F1F1F",
  error: "#B00020",
  success: "#4CAF50",
  warning: "#FF9800",
  textPrimary: "#FFFFFF",
  textSecondary: "#B3B3B3",
  border: "#333333",

  // Trạng thái riêng cho Movie App
  watched: "#4CAF50",
  toWatch: "#2196F3",
  favorite: "#FFD700",
  wishlist: "#FF4081", // (thêm nếu dùng cho Shopping App)
  purchased: "#4CAF50",
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
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    color: "#FFFFFF",
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
