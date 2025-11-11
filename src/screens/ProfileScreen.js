import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, commonStyles } from "../styles/commonStyles";
import { getUserByEmail, getUserById } from "../database/accountDB";
import { useAuth } from "../auth/AuthContext";

/**
 * Note: since there's no AuthContext, this ProfileScreen expects the app to navigate here
 * after login and can also accept an optional param { userId } to load the profile.
 * If not provided, it shows minimal info.
 */
const ProfileScreen = ({ route, navigation }) => {
  const passedUserId = route?.params?.userId;
  const passedEmail = route?.params?.email;
  const [user, setUser] = useState(null);
  // Call hooks at top-level of component
  const { user: authUser, logout } = useAuth();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Resolve which user to load: route param > auth context
        const idToUse = passedUserId || authUser?.id;
        const emailToUse = passedEmail || authUser?.email;

        let u = null;
        if (idToUse) {
          u = getUserById(idToUse);
        } else if (emailToUse) {
          u = getUserByEmail(emailToUse);
        }

        if (mounted) setUser(u);
      } catch (e) {
        console.error("Error loading profile:", e);
      }
    })();
    return () => (mounted = false);
  }, [passedUserId, passedEmail, authUser]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            // After logout, AppNavigator will show AuthStack
          } catch (e) {
            console.error("Logout failed:", e);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={commonStyles.container}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.avatarContainer}>
            {user?.avatar_uri ? (
              <Image source={{ uri: user.avatar_uri }} style={styles.avatarImage} />
            ) : (
              <Ionicons name={user?.role === "admin" ? "shield-checkmark" : "person"} size={60} color={colors.primary} />
            )}
          </View>
          <Text style={styles.username}>{user?.name || user?.email || "User"}</Text>
          <View style={[styles.roleBadge, user?.role === "admin" ? styles.adminBadge : styles.userBadge]}>
            <Text style={styles.roleText}>{user?.role === "admin" ? "ADMIN" : "USER"}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || "Not provided"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{user?.role === "admin" ? "Administrator - Full Access" : "User - Limited Access"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (user?.id) {
                navigation.navigate("UpdateProfile", { userId: user.id, email: user.email });
              } else if (user?.email) {
                navigation.navigate("UpdateProfile", { email: user.email });
              } else {
                Alert.alert("Không tìm thấy tài khoản để cập nhật!");
              }
            }}
          >
            <Ionicons name="create-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.actionText}>Cập nhật tài khoản</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={colors.error} />
            <Text style={[styles.actionText, styles.logoutText]}>Logout</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Movie Manager v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2025 All Rights Reserved</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  headerCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 32, alignItems: "center", marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: colors.border },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primaryLight, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  username: { fontSize: 24, fontWeight: "bold", color: colors.textPrimary, marginBottom: 8 },
  roleBadge: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20 },
  adminBadge: { backgroundColor: colors.primary }, userBadge: { backgroundColor: colors.success },
  roleText: { color: "#FFF", fontSize: 12, fontWeight: "bold", letterSpacing: 1 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  infoCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: colors.border },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  infoContent: { flex: 1, marginLeft: 16 },
  infoLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  infoValue: { fontSize: 16, color: colors.textPrimary, fontWeight: "500" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  section: { marginBottom: 16 }, sectionTitle: { fontSize: 18, fontWeight: "bold", color: colors.textPrimary, marginBottom: 12 },
  actionButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  actionText: { flex: 1, fontSize: 16, color: colors.textPrimary, marginLeft: 12, fontWeight: "500" },
  logoutButton: { borderColor: colors.error, backgroundColor: "#FFE5E5" }, logoutText: { color: colors.error },
  appInfo: { alignItems: "center", marginTop: 32, marginBottom: 16 }, appInfoText: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
});

export default ProfileScreen;