import React from "react";
import { View, Text, Button, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { colors } from "../../styles/commonStyles";

export default function UserHomeScreen() {
  const { user, logout } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Chao mung, {user?.username || user?.email || "Guest"}!</Text>
        <Text style={styles.subtitle}>Ban dang dang nhap voi vai tro: User</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📱 Tinh nang cho User:</Text>
          <Text style={styles.infoText}>• Xem danh sach phim</Text>
          <Text style={styles.infoText}>• Tim kiem phim</Text>
          <Text style={styles.infoText}>• Xem chi tiet phim</Text>
          <Text style={styles.infoText}>• Tim rap chieu phim gan ban (Maps)</Text>
          <Text style={styles.infoText}>• Quan ly thong tin ca nhan</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🎬 Huong dan su dung:</Text>
          <Text style={styles.infoText}>1. Vao tab "Search" de tim kiem phim</Text>
          <Text style={styles.infoText}>2. Vao tab "Maps" de tim rap chieu phim</Text>
          <Text style={styles.infoText}>3. Vao tab "Profile" de quan ly tai khoan</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Dang xuat" onPress={logout} color={colors.accent} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 30,
    textAlign: "center",
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: 6,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
});