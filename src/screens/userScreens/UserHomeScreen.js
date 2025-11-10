import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { colors } from "../../styles/commonStyles";

export default function UserHomeScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Home Screen</Text>
      <Text style={styles.welcome}>Chào mừng, {user?.name || user?.email || "Guest"}!</Text>
      <Text style={styles.role}>Vai trò: {user?.role || "User"}</Text>

      <View style={styles.buttonGroup}>
        <Button
          title="Xem Hồ Sơ Cá Nhân (UC-5)"
          onPress={() => alert("Màn hình Quản lý Profile chưa được tạo.")}
          color={colors.accent}
        />
        <View style={{ height: 10 }} />
        <Button
          title="Đăng xuất (UC-4)"
          color="#d9534f"
          onPress={logout}
        />
      </View>
      
      <Text style={styles.hint}>Tài khoản này đang ở chế độ User, sẽ không thấy tab Admin.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16, textAlign: "center", color: colors.primary },
  welcome: { fontSize: 18, textAlign: "center", marginBottom: 8, color: colors.textPrimary },
  role: { fontSize: 16, textAlign: "center", marginBottom: 30, color: colors.textSecondary },
  buttonGroup: { marginTop: 20 },
  hint: { marginTop: 40, fontSize: 12, color: colors.textSecondary, textAlign: 'center' }
});